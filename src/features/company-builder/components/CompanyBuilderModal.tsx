"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GitBranch, Plus, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { AgentAvatarPreview3D } from "@/features/agents/components/AgentAvatarPreview3D";
import { RunningAvatarLoader } from "@/features/agents/components/RunningAvatarLoader";
import { createDefaultAgentAvatarProfile } from "@/lib/avatars/profile";
import type {
  CompanyBuilderInput,
  CompanyBuilderPlan,
  CompanyBuilderRole,
} from "@/features/company-builder/types";

type CompanyBuilderModalProps = {
  open: boolean;
  connected: boolean;
  agentCount: number;
  plannerAgentName: string | null;
  busy?: boolean;
  error?: string | null;
  statusLine?: string | null;
  initialInput?: CompanyBuilderInput;
  initialPlan?: CompanyBuilderPlan | null;
  onClose: () => void;
  onClear: () => void;
  onImproveBrief: (brief: string) => Promise<string>;
  onGeneratePlan: (brief: string) => Promise<CompanyBuilderPlan>;
  onCreateCompany: (params: {
    input: CompanyBuilderInput;
    plan: CompanyBuilderPlan;
  }) => Promise<void>;
};

const inputClassName =
  "w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30";
const textareaClassName =
  "min-h-[120px] w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30";

const createEmptyRole = (index: number): CompanyBuilderRole => ({
  id: `custom-role-${index + 1}`,
  title: "",
  purpose: "",
  soul: "",
  responsibilities: [],
  collaborators: [],
  tools: [],
  heartbeat: [],
  emoji: "🤖",
  creature: "specialist",
  vibe: "helpful and focused",
  userContext: "",
  commandMode: "ask",
});

const parseCommaList = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const joinCommaList = (values: string[]) => values.join(", ");

const buildRoleAvatarProfile = (role: CompanyBuilderRole) =>
  createDefaultAgentAvatarProfile(
    [
      role.id,
      role.title,
      role.emoji,
      role.creature,
      role.vibe,
      role.commandMode,
    ]
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .join(":") || "company-role"
  );

const renderRoleFacts = (label: string, values: string[]) => {
  if (values.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100/65">
        {label}
      </p>
      <div className="text-xs leading-5 text-white/75">{values.join(", ")}</div>
    </div>
  );
};

export function CompanyBuilderModal({
  open,
  connected,
  agentCount,
  plannerAgentName,
  busy = false,
  error = null,
  statusLine = null,
  initialInput,
  initialPlan,
  onClose,
  onClear,
  onImproveBrief,
  onGeneratePlan,
  onCreateCompany,
}: CompanyBuilderModalProps) {
  const [input, setInput] = useState<CompanyBuilderInput>({
    businessDescription: initialInput?.businessDescription ?? "",
    improvedBrief: initialInput?.improvedBrief ?? "",
  });
  const [plan, setPlan] = useState<CompanyBuilderPlan | null>(initialPlan ?? null);
  const [promptModalOpen, setPromptModalOpen] = useState(
    () =>
      !(
        (initialInput?.businessDescription ?? "").trim() ||
        (initialInput?.improvedBrief ?? "").trim()
      )
  );
  const [promptDraft, setPromptDraft] = useState(initialInput?.businessDescription ?? "");
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [orgChartOpen, setOrgChartOpen] = useState(false);
  const [hoveredOrgRoleId, setHoveredOrgRoleId] = useState<string | null>(null);
  const roleListContainerRef = useRef<HTMLElement | null>(null);
  const pendingRoleScrollRef = useRef(false);

  const effectiveBrief = useMemo(
    () => input.improvedBrief.trim() || input.businessDescription.trim(),
    [input.businessDescription, input.improvedBrief]
  );
  const canUseAi = connected && agentCount > 0;
  const canGenerate = canUseAi && effectiveBrief.length > 0 && !busy;
  const canPreviewChart = Boolean(plan && plan.roles.length > 0);
  const canCreate = Boolean(connected && plan && plan.roles.length > 0 && !busy);
  const canClear = Boolean(
    !busy &&
      (input.businessDescription.trim() ||
        input.improvedBrief.trim() ||
        promptDraft.trim() ||
        plan?.roles.length)
  );
  const replacesExistingAgents = agentCount > 0;

  useEffect(() => {
    if (!plan || !pendingRoleScrollRef.current) return;
    pendingRoleScrollRef.current = false;
    requestAnimationFrame(() => {
      roleListContainerRef.current?.scrollTo({
        top: roleListContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [plan]);

  const fireAutoGenerate = useCallback(
    (brief: string) => {
      void onGeneratePlan(brief)
        .then((nextPlan) => {
          setPlan(nextPlan);
        })
        .catch((error) => {
          console.error("Failed to auto-generate company plan.", error);
        });
    },
    [onGeneratePlan],
  );

  const orgChartDefaultRoleId = orgChartOpen && plan?.roles.length
    ? plan.roles[0]?.id ?? null
    : null;
  const resolvedHoveredOrgRoleId =
    hoveredOrgRoleId && plan?.roles.some((role) => role.id === hoveredOrgRoleId)
      ? hoveredOrgRoleId
      : orgChartDefaultRoleId;

  const triggerCreateCompany = () => {
    if (!plan) return;
    void onCreateCompany({ input, plan }).catch((error) => {
      console.error("Failed to create company.", error);
    });
  };

  if (!open) return null;

  const hoveredOrgRole =
    plan?.roles.find((role) => role.id === resolvedHoveredOrgRoleId) ?? plan?.roles[0] ?? null;

  return (
    <div className="fixed inset-0 z-[100100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex h-[min(92vh,920px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#090d13] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-cyan-200/70">
              <Sparkles className="h-4 w-4" />
              회사 빌더
            </div>
            <h2 className="mt-1 text-lg font-semibold">프롬프트 하나로 AI 회사 설계</h2>
            <p className="mt-1 text-sm text-white/55">
              연결된 런타임 사용
              {plannerAgentName ? `: ${plannerAgentName}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                setInput({ businessDescription: "", improvedBrief: "" });
                setPromptDraft("");
                setPlan(null);
                setPromptModalOpen(true);
                setReplaceConfirmOpen(false);
                onClear();
              }}
              disabled={!canClear}
            >
              비우기
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-[#1a1206] transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                void onGeneratePlan(effectiveBrief)
                  .then((nextPlan) => {
                    setPlan(nextPlan);
                  })
                  .catch(() => {});
              }}
              disabled={!canGenerate}
            >
              <Sparkles className="h-3.5 w-3.5" />
              생성
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                setOrgChartOpen(true);
              }}
              disabled={!canPreviewChart}
            >
              <GitBranch className="h-3.5 w-3.5" />
              조직도
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                if (!plan) return;
                if (replacesExistingAgents) {
                  setReplaceConfirmOpen(true);
                  return;
                }
                triggerCreateCompany();
              }}
              disabled={!canCreate}
            >
              <Wand2 className="h-3.5 w-3.5" />
              회사 생성
            </button>
            <button
              type="button"
              className="rounded-md border border-white/10 p-2 text-white/60 transition hover:bg-white/5 hover:text-white"
              onClick={onClose}
              disabled={busy}
              aria-label="회사 빌더 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="overflow-y-auto border-b border-white/10 px-6 py-5 lg:border-b-0 lg:border-r">
            <div className="space-y-5">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">
                      원본 프롬프트
                    </p>
                    <button
                      type="button"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => {
                        setPromptDraft(input.businessDescription);
                        setPromptModalOpen(true);
                      }}
                      disabled={busy}
                    >
                      <Wand2 className="h-3 w-3" />
                      {input.businessDescription.trim() ? "프롬프트 편집" : "회사 설명"}
                    </button>
                  </div>
                  <div className="text-sm leading-6 text-white/70">
                    {input.businessDescription.trim()
                      ? input.businessDescription
                      : "회사가 무엇을 해야 하는지 설명하면 Claw3D가 바로 개선된 브리프로 바꿉니다."}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">
                      개선된 브리프
                    </p>
                    <p className="mt-1 text-[11px] text-white/45">
                      회사 생성에 사용할 텍스트입니다.
                    </p>
                  </div>
                </div>
                <textarea
                  className={`${textareaClassName} mt-3 min-h-[340px]`}
                  placeholder="AI가 여기에 브리프를 다시 작성합니다."
                  value={input.improvedBrief}
                  onChange={(event) =>
                    setInput((current) => ({
                      ...current,
                      improvedBrief: event.target.value,
                    }))
                  }
                  disabled={busy}
                />
              </div>

              <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">
                    회사 작업
                  </p>
                  <p className="mt-1 text-[11px] text-white/45">
                    조직을 생성한 뒤 연결된 런타임에 만듭니다.
                  </p>
                </div>
                {replacesExistingAgents ? (
                  <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100/85">
                    회사를 만들면 현재 {agentCount === 1 ? "에이전트" : `에이전트 ${agentCount}개`}가
                    삭제되고 이 회사로 교체됩니다. 이 작업은 되돌릴 수 없으며 기존
                    에이전트의 작업 공간도 삭제됩니다.
                  </div>
                ) : null}
                {!canUseAi ? (
                  <p className="text-xs text-amber-200/80">
                    AI 제안을 사용하려면 런타임에 연결하고 사용 가능한 계획 담당
                    에이전트를 최소 1개 유지하세요.
                  </p>
                ) : null}
                {statusLine ? <p className="text-xs text-cyan-100/75">{statusLine}</p> : null}
                {error ? <p className="text-xs text-red-200">{error}</p> : null}
              </div>
            </div>
          </section>

          <section ref={roleListContainerRef} className="min-h-0 overflow-y-auto px-6 py-5">
            {plan ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-xs text-white/60">
                    회사 이름
                    <input
                      className={inputClassName}
                      value={plan.companyName}
                      onChange={(event) =>
                        setPlan((current) =>
                          current
                            ? {
                                ...current,
                                companyName: event.target.value,
                              }
                            : current
                        )
                      }
                      disabled={busy}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-xs text-white/60">
                    공유 규칙
                    <input
                      className={inputClassName}
                      value={joinCommaList(plan.sharedRules)}
                      onChange={(event) =>
                        setPlan((current) =>
                          current
                            ? {
                                ...current,
                                sharedRules: parseCommaList(event.target.value),
                              }
                            : current
                        )
                      }
                      disabled={busy}
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-2 text-xs text-white/60">
                  회사 요약
                  <textarea
                    className={`${textareaClassName} min-h-[110px]`}
                    value={plan.summary}
                    onChange={(event) =>
                      setPlan((current) =>
                        current
                          ? {
                              ...current,
                              summary: event.target.value,
                            }
                          : current
                      )
                    }
                    disabled={busy}
                  />
                </label>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">조직 구조</p>
                    <p className="text-xs text-white/55">
                      연결된 런타임에 에이전트를 만들기 전에 팀을 편집하세요.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => {
                      pendingRoleScrollRef.current = true;
                      setPlan((current) =>
                        current
                          ? {
                              ...current,
                              roles: [...current.roles, createEmptyRole(current.roles.length)],
                            }
                          : current
                      );
                    }}
                    disabled={busy}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    역할 추가
                  </button>
                </div>

                <div className="space-y-4">
                  {plan.roles.map((role, index) => (
                    <div
                      key={role.id || `role-${index}`}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="h-28 w-24 overflow-hidden rounded-xl border border-white/10 bg-[#070b16]">
                            <AgentAvatarPreview3D
                              profile={buildRoleAvatarProfile(role)}
                              className="h-full w-full"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs uppercase tracking-[0.14em] text-white/45">
                              역할 {index + 1}
                            </div>
                            <div className="mt-2 text-sm font-semibold text-white">
                              {role.title || "제목 없는 역할"}
                            </div>
                            <div className="mt-1 text-xs text-white/45">
                              이 역할에 대해 생성된 3D 아바타 미리보기입니다.
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="rounded-md border border-red-500/20 bg-red-500/10 p-2 text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={() =>
                            setPlan((current) =>
                              current
                                ? {
                                    ...current,
                                    roles: current.roles.filter((_, roleIndex) => roleIndex !== index),
                                  }
                                : current
                            )
                          }
                          disabled={busy || plan.roles.length <= 1}
                          aria-label={`Remove role ${index + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="flex flex-col gap-2 text-xs text-white/60">
                          Name
                          <input
                            className={inputClassName}
                            value={role.title}
                            onChange={(event) =>
                              setPlan((current) =>
                                current
                                  ? {
                                      ...current,
                                      roles: current.roles.map((entry, roleIndex) =>
                                        roleIndex === index
                                          ? { ...entry, title: event.target.value }
                                          : entry
                                      ),
                                    }
                                  : current
                              )
                            }
                            disabled={busy}
                          />
                        </label>
                        <label className="flex flex-col gap-2 text-xs text-white/60">
                          Emoji
                          <input
                            className={inputClassName}
                            value={role.emoji}
                            onChange={(event) =>
                              setPlan((current) =>
                                current
                                  ? {
                                      ...current,
                                      roles: current.roles.map((entry, roleIndex) =>
                                        roleIndex === index
                                          ? { ...entry, emoji: event.target.value }
                                          : entry
                                      ),
                                    }
                                  : current
                              )
                            }
                            disabled={busy}
                          />
                        </label>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <label className="flex flex-col gap-2 text-xs text-white/60">
                          Purpose
                          <textarea
                            className={textareaClassName}
                            value={role.purpose}
                            onChange={(event) =>
                              setPlan((current) =>
                                current
                                  ? {
                                      ...current,
                                      roles: current.roles.map((entry, roleIndex) =>
                                        roleIndex === index
                                          ? { ...entry, purpose: event.target.value }
                                          : entry
                                      ),
                                    }
                                  : current
                              )
                            }
                            disabled={busy}
                          />
                        </label>
                        <label className="flex flex-col gap-2 text-xs text-white/60">
                          Soul
                          <textarea
                            className={textareaClassName}
                            value={role.soul}
                            onChange={(event) =>
                              setPlan((current) =>
                                current
                                  ? {
                                      ...current,
                                      roles: current.roles.map((entry, roleIndex) =>
                                        roleIndex === index
                                          ? { ...entry, soul: event.target.value }
                                          : entry
                                      ),
                                    }
                                  : current
                              )
                            }
                            disabled={busy}
                          />
                        </label>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <label className="flex flex-col gap-2 text-xs text-white/60">
                          Responsibilities
                          <input
                            className={inputClassName}
                            value={joinCommaList(role.responsibilities)}
                            onChange={(event) =>
                              setPlan((current) =>
                                current
                                  ? {
                                      ...current,
                                      roles: current.roles.map((entry, roleIndex) =>
                                        roleIndex === index
                                          ? {
                                              ...entry,
                                              responsibilities: parseCommaList(event.target.value),
                                            }
                                          : entry
                                      ),
                                    }
                                  : current
                              )
                            }
                            disabled={busy}
                          />
                        </label>
                        <label className="flex flex-col gap-2 text-xs text-white/60">
                          Collaborators
                          <input
                            className={inputClassName}
                            value={joinCommaList(role.collaborators)}
                            onChange={(event) =>
                              setPlan((current) =>
                                current
                                  ? {
                                      ...current,
                                      roles: current.roles.map((entry, roleIndex) =>
                                        roleIndex === index
                                          ? {
                                              ...entry,
                                              collaborators: parseCommaList(event.target.value),
                                            }
                                          : entry
                                      ),
                                    }
                                  : current
                              )
                            }
                            disabled={busy}
                          />
                        </label>
                        <label className="flex flex-col gap-2 text-xs text-white/60">
                          도구 메모
                          <input
                            className={inputClassName}
                            value={joinCommaList(role.tools)}
                            onChange={(event) =>
                              setPlan((current) =>
                                current
                                  ? {
                                      ...current,
                                      roles: current.roles.map((entry, roleIndex) =>
                                        roleIndex === index
                                          ? { ...entry, tools: parseCommaList(event.target.value) }
                                          : entry
                                      ),
                                    }
                                  : current
                              )
                            }
                            disabled={busy}
                          />
                        </label>
                        <label className="flex flex-col gap-2 text-xs text-white/60">
                          하트비트 체크리스트
                          <input
                            className={inputClassName}
                            value={joinCommaList(role.heartbeat)}
                            onChange={(event) =>
                              setPlan((current) =>
                                current
                                  ? {
                                      ...current,
                                      roles: current.roles.map((entry, roleIndex) =>
                                        roleIndex === index
                                          ? { ...entry, heartbeat: parseCommaList(event.target.value) }
                                          : entry
                                      ),
                                    }
                                  : current
                              )
                            }
                            disabled={busy}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                <div className="max-w-md space-y-3">
                  <Sparkles className="mx-auto h-8 w-8 text-cyan-300/70" />
                  <p className="text-lg font-semibold text-white">아직 생성된 회사가 없습니다</p>
                  <p className="text-sm text-white/55">
                    회사 설명부터 시작하세요. Claw3D가 개선된 브리프를 자동으로
                    만들고, 실제 생성 전에 조직 구조를 생성하고 편집할 수 있습니다.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      {busy ? (
        <div className="fixed inset-0 z-[100120] flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/20 bg-[#08111a] px-6 py-6 text-center shadow-2xl">
            <RunningAvatarLoader size={40} trackWidth={104} />
            <p className="mt-4 text-sm font-semibold text-white">
              {statusLine?.trim() || "회사를 작업하는 중입니다."}
            </p>
            <p className="mt-2 text-xs leading-5 text-white/55">
              Claw3D가 연결된 런타임을 사용 중입니다. 완료될 때까지 기다려주세요.
            </p>
            <div className="mt-5 flex gap-2">
              {Array.from({ length: 4 }, (_, index) => (
                <span
                  key={`company-loading-${index}`}
                  className="h-1.5 flex-1 rounded-full bg-cyan-400/30 animate-pulse"
                  style={{ animationDelay: `${index * 120}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {replaceConfirmOpen ? (
        <div className="fixed inset-0 z-[100115] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b1119] p-6 shadow-2xl">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">현재 에이전트를 교체할까요?</p>
              <p className="text-sm leading-6 text-white/65">
                현재 {agentCount === 1 ? "에이전트" : `에이전트 ${agentCount}개`}가
                삭제되고 새 회사로 교체됩니다. 이 작업은 되돌릴 수 없으며 기존
                에이전트의 작업 공간도 삭제됩니다. 계속할까요?
              </p>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                onClick={() => {
                  setReplaceConfirmOpen(false);
                }}
                disabled={busy}
              >
                취소
              </button>
              <button
                type="button"
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-[#1a1206] transition hover:bg-amber-400"
                onClick={() => {
                  setReplaceConfirmOpen(false);
                  triggerCreateCompany();
                }}
                disabled={busy}
              >
                회사 생성
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {orgChartOpen && plan ? (
        <div className="fixed inset-0 z-[100112] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex h-[min(88vh,860px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1119] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200/70">
                  조직도 미리보기
                </p>
                <p className="mt-2 text-sm text-white/60">
                  아바타에 마우스를 올리면 역할 브리프, 책임, 협업 대상을 확인할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md border border-white/10 p-2 text-white/60 transition hover:bg-white/5 hover:text-white"
                onClick={() => {
                  setOrgChartOpen(false);
                }}
                disabled={busy}
                aria-label="조직도 미리보기 닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="flex min-h-0 flex-col items-center">
                  <button
                    type="button"
                    className={`flex w-full max-w-xs flex-col items-center rounded-2xl border px-5 py-5 text-center transition ${
                      resolvedHoveredOrgRoleId === plan.roles[0]?.id
                        ? "border-cyan-400/40 bg-cyan-500/12"
                        : "border-cyan-500/20 bg-cyan-500/10 hover:border-cyan-300/35"
                    }`}
                    onMouseEnter={() => {
                      setHoveredOrgRoleId(plan.roles[0]?.id ?? null);
                    }}
                    onFocus={() => {
                      setHoveredOrgRoleId(plan.roles[0]?.id ?? null);
                    }}
                  >
                    <div className="h-28 w-24 overflow-hidden rounded-xl border border-white/10 bg-[#070b16]">
                      <AgentAvatarPreview3D
                        profile={buildRoleAvatarProfile(plan.roles[0])}
                        className="h-full w-full"
                      />
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.14em] text-cyan-100/65">역할 1</p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {plan.roles[0].title || "제목 없는 역할"}
                    </p>
                    <p className="mt-1 text-sm text-white/60">
                      {plan.roles[0].purpose || "아직 목적이 없습니다."}
                    </p>
                  </button>
                  {plan.roles.length > 1 ? (
                    <>
                      <div className="h-10 w-px bg-white/10" />
                      <div className="mb-8 h-px w-[min(100%,720px)] bg-white/10" />
                      <div className="grid w-full max-w-4xl gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {plan.roles.slice(1).map((role, index) => (
                          <button
                            key={role.id || `org-chart-role-${index + 2}`}
                            type="button"
                            className={`flex flex-col items-center rounded-2xl border px-4 py-5 text-center transition ${
                              resolvedHoveredOrgRoleId === role.id
                                ? "border-cyan-400/40 bg-cyan-500/10"
                                : "border-white/10 bg-white/[0.03] hover:border-cyan-300/25"
                            }`}
                            onMouseEnter={() => {
                              setHoveredOrgRoleId(role.id);
                            }}
                            onFocus={() => {
                              setHoveredOrgRoleId(role.id);
                            }}
                          >
                            <div className="h-24 w-20 overflow-hidden rounded-xl border border-white/10 bg-[#070b16]">
                              <AgentAvatarPreview3D
                                profile={buildRoleAvatarProfile(role)}
                                className="h-full w-full"
                              />
                            </div>
                            <p className="mt-3 text-xs uppercase tracking-[0.14em] text-white/45">
                              역할 {index + 2}
                            </p>
                            <p className="mt-1 text-base font-semibold text-white">
                              {role.title || "제목 없는 역할"}
                            </p>
                            <p className="mt-1 text-sm text-white/60">
                              {role.purpose || "아직 목적이 없습니다."}
                            </p>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
                <aside className="rounded-2xl border border-white/10 bg-[#08111a] p-5 lg:sticky lg:top-0 lg:h-fit">
                  {hoveredOrgRole ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-cyan-100/65">
                          활성 역할
                        </p>
                        <p className="mt-2 text-xl font-semibold text-white">
                          {hoveredOrgRole.title || "제목 없는 역할"}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white/70">
                          {hoveredOrgRole.soul || "아직 성격 메모가 없습니다."}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100/65">
                          목적
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white/75">
                          {hoveredOrgRole.purpose || "아직 목적이 없습니다."}
                        </p>
                      </div>
                      {renderRoleFacts("책임", hoveredOrgRole.responsibilities)}
                      {renderRoleFacts("협업 대상", hoveredOrgRole.collaborators)}
                      {renderRoleFacts("도구", hoveredOrgRole.tools)}
                      {renderRoleFacts("하트비트", hoveredOrgRole.heartbeat)}
                    </div>
                  ) : (
                    <p className="text-sm text-white/55">역할에 마우스를 올려 자세히 확인하세요.</p>
                  )}
                </aside>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {promptModalOpen ? (
        <div className="fixed inset-0 z-[100110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0b1119] p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200/70">
                  회사가 무엇을 해야 하나요?
                </p>
                <p className="mt-2 text-sm text-white/55">
                  제출하면 Claw3D가 연결된 런타임으로 브리프를 개선합니다.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md border border-white/10 p-2 text-white/60 transition hover:bg-white/5 hover:text-white"
                onClick={() => {
                  if (busy) return;
                  setPromptModalOpen(false);
                }}
                disabled={busy}
                aria-label="프롬프트 모달 닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              className={`${textareaClassName} mt-5 min-h-[220px]`}
              placeholder="웹사이트, 웹앱, 모바일 앱, SEO 캠페인, 소셜 미디어 서비스를 만드는 웹 디자인 회사를 운영합니다..."
              value={promptDraft}
              onChange={(event) => {
                setPromptDraft(event.target.value);
              }}
              disabled={busy}
            />
            <div className="mt-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-white/45">
                  개선된 브리프가 생성에 사용할 기본 편집 입력값이 됩니다.
                </p>
                {error ? <p className="mt-2 text-xs text-red-200">{error}</p> : null}
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-[#1a1206] transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  const trimmedPrompt = promptDraft.trim();
                  if (!trimmedPrompt) return;
                  void (async () => {
                    try {
                      const improvedBrief = await onImproveBrief(trimmedPrompt);
                      setInput({
                        businessDescription: trimmedPrompt,
                        improvedBrief,
                      });
                      setPromptModalOpen(false);
                      fireAutoGenerate(improvedBrief);
                    } catch {}
                  })();
                }}
                disabled={!canUseAi || promptDraft.trim().length === 0 || busy}
              >
                <Sparkles className="h-4 w-4" />
                회사 생성
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
