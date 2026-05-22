"use client";

import { useMemo, useState } from "react";

import {
  AgentIdentityFields,
  type AgentIdentityValues,
} from "@/features/agents/components/AgentIdentityFields";
import { AgentAvatarEditorPanel } from "@/features/agents/components/AgentAvatarEditorPanel";
import {
  AGENT_FILE_META,
  AGENT_FILE_PLACEHOLDERS,
} from "@/lib/agents/agentFiles";
import {
  createEmptyPersonalityDraft,
  type PersonalityBuilderDraft,
} from "@/lib/agents/personalityBuilder";
import {
  createDefaultAgentAvatarProfile,
  type AgentAvatarProfile,
} from "@/lib/avatars/profile";
import { randomUUID } from "@/lib/uuid";

type AgentCreateWizardModalProps = {
  open: boolean;
  suggestedName?: string;
  busy?: boolean;
  submitError?: string | null;
  statusLine?: string | null;
  onClose: (createdAgentId: string | null) => void;
  onCreateAgent: (identity: AgentIdentityValues) => Promise<string | null>;
  onFinishWizard: (params: {
    agentId: string;
    draft: PersonalityBuilderDraft;
    profile: AgentAvatarProfile;
  }) => Promise<void>;
};

const stepClassName =
  "rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em]";

const inputClassName =
  "h-10 rounded-md border border-border/80 bg-background px-3 text-sm text-foreground outline-none";

const textAreaClassName =
  "min-h-[180px] w-full resize-y rounded-md border border-border/80 bg-background px-4 py-3 text-sm leading-6 text-foreground outline-none";

type WizardStepId =
  | "identity"
  | "avatar"
  | "SOUL.md"
  | "AGENTS.md"
  | "USER.md"
  | "TOOLS.md"
  | "MEMORY.md"
  | "HEARTBEAT.md";

const wizardSteps: Array<{ id: WizardStepId; label: string; hint: string }> = [
  {
    id: "identity",
    label: "정체성",
    hint: "먼저 라이브 에이전트를 만들고 나머지를 단계별로 채웁니다.",
  },
  {
    id: "avatar",
    label: "아바타",
    hint: "나머지 프로필을 작성하기 전에 오피스 외형을 조정합니다.",
  },
  {
    id: "SOUL.md",
    label: "소울",
    hint: AGENT_FILE_META["SOUL.md"].hint,
  },
  {
    id: "AGENTS.md",
    label: "에이전트",
    hint: AGENT_FILE_META["AGENTS.md"].hint,
  },
  {
    id: "USER.md",
    label: "사용자",
    hint: AGENT_FILE_META["USER.md"].hint,
  },
  {
    id: "TOOLS.md",
    label: "도구",
    hint: AGENT_FILE_META["TOOLS.md"].hint,
  },
  {
    id: "MEMORY.md",
    label: "메모리",
    hint: AGENT_FILE_META["MEMORY.md"].hint,
  },
  {
    id: "HEARTBEAT.md",
    label: "하트비트",
    hint: AGENT_FILE_META["HEARTBEAT.md"].hint,
  },
];

const buildInitialDraft = (suggestedName: string): PersonalityBuilderDraft => {
  const draft = createEmptyPersonalityDraft();
  draft.identity.name = suggestedName.trim() || "새 에이전트";
  return draft;
};

const WizardField = ({
  label,
  value,
  placeholder,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) => (
  <label className="flex flex-col gap-2 text-xs text-muted-foreground">
    {label}
    <input
      className={inputClassName}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  </label>
);

const WizardTextAreaField = ({
  label,
  value,
  placeholder,
  disabled,
  rows = 6,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  onChange: (value: string) => void;
}) => (
  <label className="flex flex-col gap-2 text-xs text-muted-foreground">
    {label}
    <textarea
      className={textAreaClassName}
      value={value}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  </label>
);

export function AgentCreateWizardModal({
  open,
  suggestedName = "",
  busy = false,
  submitError = null,
  statusLine = null,
  onClose,
  onCreateAgent,
  onFinishWizard,
}: AgentCreateWizardModalProps) {
  const [step, setStep] = useState<WizardStepId>("identity");
  const [draft, setDraft] = useState<PersonalityBuilderDraft>(() =>
    buildInitialDraft(suggestedName),
  );
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null);
  const [draftAvatarProfile, setDraftAvatarProfile] = useState<AgentAvatarProfile>(() =>
    createDefaultAgentAvatarProfile(randomUUID()),
  );
  const [finishing, setFinishing] = useState(false);

  const canCreate = useMemo(() => draft.identity.name.trim().length > 0, [draft.identity.name]);
  const activeStepIndex = wizardSteps.findIndex((entry) => entry.id === step);
  const activeStep = wizardSteps[activeStepIndex] ?? wizardSteps[0];
  const isWorking = busy || finishing;
  const isFinalStep = step === "HEARTBEAT.md";
  const statusCopy = finishing ? "에이전트 파일과 아바타를 저장하는 중입니다." : statusLine;

  const updateDraft = <K extends keyof PersonalityBuilderDraft>(
    key: K,
    value: PersonalityBuilderDraft[K],
  ) => {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const advanceStep = async () => {
    if (step === "identity") {
      if (!canCreate || isWorking) return;
      if (!createdAgentId) {
        const agentId = await onCreateAgent({
          name: draft.identity.name,
          creature: draft.identity.creature,
          vibe: draft.identity.vibe,
          emoji: draft.identity.emoji,
        });
        if (!agentId) return;
        setCreatedAgentId(agentId);
      }
      setStep("avatar");
      return;
    }
    if (isFinalStep) {
      if (!createdAgentId || isWorking) return;
      setFinishing(true);
      try {
        await onFinishWizard({
          agentId: createdAgentId,
          draft,
          profile: draftAvatarProfile,
        });
      } finally {
        setFinishing(false);
      }
      return;
    }
    const nextStep = wizardSteps[activeStepIndex + 1];
    if (nextStep) {
      setStep(nextStep.id);
    }
  };

  const stepActionLabel =
    step === "identity" && !createdAgentId
      ? busy
        ? "생성 중..."
        : "생성 후 계속"
      : isFinalStep
        ? isWorking
          ? "저장 중..."
          : "마법사 완료"
        : "다음";

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-background/84 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="에이전트 생성 마법사"
      onClick={() => {
        if (!isWorking) {
          onClose(createdAgentId);
        }
      }}
    >
      <div
        className="ui-panel flex h-[min(92vh,980px)] w-full max-w-6xl flex-col overflow-hidden shadow-xs"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border/40 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground">
                새 에이전트 마법사
              </div>
              <div className="mt-1 text-lg font-semibold text-foreground">
                에이전트를 단계별로 생성
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                정체성부터 시작한 뒤 나머지 프로필을 완성합니다.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="ui-btn-ghost px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isWorking}
                onClick={() => {
                  onClose(createdAgentId);
                }}
              >
                닫기
              </button>
              {activeStepIndex > 0 ? (
                <button
                  type="button"
                  className="ui-btn-ghost px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isWorking}
                  onClick={() => {
                    const previousStep = wizardSteps[activeStepIndex - 1];
                    if (previousStep) {
                      setStep(previousStep.id);
                    }
                  }}
                >
                  뒤로
                </button>
              ) : null}
              <button
                type="button"
                className="ui-btn-primary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                disabled={(step === "identity" && !canCreate) || isWorking}
                onClick={() => {
                  void advanceStep();
                }}
              >
                {stepActionLabel}
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {wizardSteps.map((wizardStep, index) => {
              const complete = index < activeStepIndex;
              const active = wizardStep.id === step;
              return (
                <span
                  key={wizardStep.id}
                  className={`${stepClassName} ${
                    active
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : complete
                        ? "border-emerald-400/35 bg-emerald-500/10 text-foreground"
                        : "border-border/45 bg-background/40 text-muted-foreground"
                  }`}
                >
                  {index + 1}. {wizardStep.label}
                </span>
              );
            })}
          </div>
          <div className="mt-4 text-sm text-muted-foreground">{activeStep.hint}</div>
          {statusCopy ? (
            <div className="mt-4 rounded-md border border-border/45 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              {statusCopy}
            </div>
          ) : null}
          {submitError ? (
            <div className="ui-alert-danger mt-4 rounded-md px-3 py-2 text-xs">
              {submitError}
            </div>
          ) : null}
        </div>

        {step === "identity" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">정체성</h3>
                <div className="text-xs text-muted-foreground">
                  먼저 라이브 에이전트 이름을 확인한 뒤 `IDENTITY.md`의 나머지를 채우세요.
                </div>
                <AgentIdentityFields
                  values={draft.identity}
                  disabled={isWorking}
                  onChange={(field, value) => {
                    updateDraft("identity", {
                      ...draft.identity,
                      [field]: value,
                    });
                  }}
                />
              </section>

              <div className="mt-6 rounded-xl border border-border/45 bg-muted/20 p-4 text-sm text-muted-foreground">
                이 단계에서 에이전트를 만들면 OpenClaw에서 즉시 사용할 수 있으며,
                이후 단계에서 마법사가 게이트웨이를 통해 전체 프로필을 저장할 수 있습니다.
              </div>
            </div>
          </div>
        ) : createdAgentId ? (
          <>
            {step === "avatar" ? (
              <AgentAvatarEditorPanel
                agentId={createdAgentId}
                agentName={draft.identity.name.trim() || "새 에이전트"}
                initialProfile={draftAvatarProfile}
                showActions={false}
                onDraftChange={(profile) => {
                  setDraftAvatarProfile(profile);
                }}
                onSave={async (profile) => {
                  setDraftAvatarProfile(profile);
                }}
              />
            ) : step === "SOUL.md" ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">
                <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 pb-8">
                  <section className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground">소울</h3>
                    <div className="grid gap-4">
                      <WizardTextAreaField
                        label="핵심 원칙"
                        value={draft.soul.coreTruths}
                        placeholder="예: 사용자의 시간을 아낀다. 과장보다 명확함을 우선한다."
                        disabled={isWorking}
                        rows={5}
                        onChange={(value) => {
                          updateDraft("soul", { ...draft.soul, coreTruths: value });
                        }}
                      />
                      <WizardTextAreaField
                        label="경계"
                        value={draft.soul.boundaries}
                        placeholder="예: 허세 부리지 않는다. 확실하지 않으면 그렇게 말한다."
                        disabled={isWorking}
                        rows={5}
                        onChange={(value) => {
                          updateDraft("soul", { ...draft.soul, boundaries: value });
                        }}
                      />
                      <WizardTextAreaField
                        label="분위기"
                        value={draft.soul.vibe}
                        placeholder="예: 친근하고 직접적이며 살짝 장난스럽게."
                        disabled={isWorking}
                        rows={4}
                        onChange={(value) => {
                          updateDraft("soul", { ...draft.soul, vibe: value });
                        }}
                      />
                      <WizardTextAreaField
                        label="연속성"
                        value={draft.soul.continuity}
                        placeholder="예: 이름, 선호, 이전 결정을 일관되게 유지한다."
                        disabled={isWorking}
                        rows={4}
                        onChange={(value) => {
                          updateDraft("soul", { ...draft.soul, continuity: value });
                        }}
                      />
                    </div>
                  </section>
                </div>
              </div>
            ) : step === "USER.md" ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">
                <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 pb-8">
                  <section className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground">사용자</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <WizardField
                        label="이름"
                        value={draft.user.name}
                        placeholder="예: Luke"
                        disabled={isWorking}
                        onChange={(value) => {
                          updateDraft("user", { ...draft.user, name: value });
                        }}
                      />
                      <WizardField
                        label="부를 이름"
                        value={draft.user.callThem}
                        placeholder="예: Luke"
                        disabled={isWorking}
                        onChange={(value) => {
                          updateDraft("user", { ...draft.user, callThem: value });
                        }}
                      />
                      <WizardField
                        label="대명사"
                        value={draft.user.pronouns}
                        placeholder="예: he/him"
                        disabled={isWorking}
                        onChange={(value) => {
                          updateDraft("user", { ...draft.user, pronouns: value });
                        }}
                      />
                      <WizardField
                        label="시간대"
                        value={draft.user.timezone}
                        placeholder="예: Asia/Seoul"
                        disabled={isWorking}
                        onChange={(value) => {
                          updateDraft("user", { ...draft.user, timezone: value });
                        }}
                      />
                      <div className="sm:col-span-2">
                        <WizardField
                          label="메모"
                          value={draft.user.notes}
                          placeholder="예: 간결한 답변과 빠른 반복을 선호합니다."
                          disabled={isWorking}
                          onChange={(value) => {
                            updateDraft("user", { ...draft.user, notes: value });
                          }}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <WizardTextAreaField
                          label="맥락"
                          value={draft.user.context}
                          placeholder="예: Claw3D를 만들고 있으며 실용적인 UI 개선과 직접적인 피드백을 선호합니다."
                          disabled={isWorking}
                          rows={7}
                          onChange={(value) => {
                            updateDraft("user", { ...draft.user, context: value });
                          }}
                        />
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">
                <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 pb-8">
                  <section className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground">{activeStep.label}</h3>
                    <div className="text-xs text-muted-foreground">{activeStep.hint}</div>
                    <textarea
                      className={`${textAreaClassName} min-h-[56vh] font-mono`}
                      value={
                        step === "AGENTS.md"
                          ? draft.agents
                          : step === "TOOLS.md"
                            ? draft.tools
                            : step === "MEMORY.md"
                              ? draft.memory
                              : step === "HEARTBEAT.md"
                                ? draft.heartbeat
                                : ""
                      }
                      placeholder={
                        AGENT_FILE_PLACEHOLDERS[
                          step as Extract<
                            WizardStepId,
                            "AGENTS.md" | "TOOLS.md" | "MEMORY.md" | "HEARTBEAT.md"
                          >
                        ]
                      }
                      disabled={isWorking}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        if (step === "AGENTS.md") {
                          updateDraft("agents", nextValue);
                          return;
                        }
                        if (step === "TOOLS.md") {
                          updateDraft("tools", nextValue);
                          return;
                        }
                        if (step === "MEMORY.md") {
                          updateDraft("memory", nextValue);
                          return;
                        }
                        if (step === "HEARTBEAT.md") {
                          updateDraft("heartbeat", nextValue);
                        }
                      }}
                    />
                  </section>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
