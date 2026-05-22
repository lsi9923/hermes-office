"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  ChevronRight,
  ExternalLink,
  ListChecks,
  Play,
  Sun,
  Trash2,
} from "lucide-react";

import { AgentSkillsPanel } from "@/features/agents/components/AgentSkillsPanel";
import { SystemSkillsPanel } from "@/features/agents/components/SystemSkillsPanel";
import { AgentInspectHeader } from "@/features/agents/components/inspect/AgentInspectHeader";
import {
  resolveExecutionRoleFromAgent,
  resolvePresetDefaultsForRole,
  type AgentPermissionsDraft,
} from "@/features/agents/operations/agentPermissionsOperation";
import type { AgentState } from "@/features/agents/state/store";
import type { CronCreateDraft, CronCreateTemplateId } from "@/lib/cron/createPayloadBuilder";
import { formatCronPayload, formatCronSchedule, type CronJobSummary } from "@/lib/cron/types";
import type { SkillStatusReport } from "@/lib/skills/types";
import type { StudioGatewayAdapterType } from "@/lib/studio/settings";

export type AgentSettingsPanelProps = {
  agent: AgentState;
  mode?: "capabilities" | "skills" | "system" | "automations" | "advanced";
  showHeader?: boolean;
  onClose: () => void;
  permissionsDraft?: AgentPermissionsDraft;
  onUpdateAgentPermissions?: (draft: AgentPermissionsDraft) => Promise<void> | void;
  onDelete: () => void;
  canDelete?: boolean;
  onToolCallingToggle: (enabled: boolean) => void;
  onThinkingTracesToggle: (enabled: boolean) => void;
  cronJobs: CronJobSummary[];
  cronLoading: boolean;
  cronError: string | null;
  cronRunBusyJobId: string | null;
  cronDeleteBusyJobId: string | null;
  onRunCronJob: (jobId: string) => Promise<void> | void;
  onDeleteCronJob: (jobId: string) => Promise<void> | void;
  cronCreateBusy?: boolean;
  onCreateCronJob?: (draft: CronCreateDraft) => Promise<void> | void;
  controlUiUrl?: string | null;
  adapterType?: StudioGatewayAdapterType | null;
  skillsReport?: SkillStatusReport | null;
  skillsLoading?: boolean;
  skillsError?: string | null;
  skillsBusy?: boolean;
  skillsBusyKey?: string | null;
  skillMessages?: Record<string, { kind: "success" | "error"; message: string }>;
  skillApiKeyDrafts?: Record<string, string>;
  defaultAgentScopeWarning?: string | null;
  systemInitialSkillKey?: string | null;
  onSystemInitialSkillHandled?: () => void;
  skillsAllowlist?: string[] | undefined;
  onSetSkillEnabled?: (skillName: string, enabled: boolean) => Promise<void> | void;
  onOpenSystemSetup?: (skillKey?: string) => void;
  onSetSkillGlobalEnabled?: (skillKey: string, enabled: boolean) => Promise<void> | void;
  onInstallSkill?: (skillKey: string, name: string, installId: string) => Promise<void> | void;
  onRemoveSkill?: (
    skill: { skillKey: string; source: string; baseDir: string }
  ) => Promise<void> | void;
  onSkillApiKeyChange?: (skillKey: string, value: string) => Promise<void> | void;
  onSaveSkillApiKey?: (skillKey: string) => Promise<void> | void;
};

const formatCronStateLine = (job: CronJobSummary): string | null => {
  if (typeof job.state.runningAtMs === "number" && Number.isFinite(job.state.runningAtMs)) {
    return "지금 실행 중";
  }
  if (typeof job.state.nextRunAtMs === "number" && Number.isFinite(job.state.nextRunAtMs)) {
    return `다음: ${new Date(job.state.nextRunAtMs).toLocaleString()}`;
  }
  if (typeof job.state.lastRunAtMs === "number" && Number.isFinite(job.state.lastRunAtMs)) {
    const status = job.state.lastStatus ? `${job.state.lastStatus} ` : "";
    return `마지막: ${status}${new Date(job.state.lastRunAtMs).toLocaleString()}`.trim();
  }
  return null;
};

const getFirstLinePreview = (value: string, maxChars: number): string => {
  const firstLine =
    value
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? "";
  if (!firstLine) return "";
  if (firstLine.length <= maxChars) return firstLine;
  return `${firstLine.slice(0, maxChars)}...`;
};

type CronTemplateOption = {
  id: CronCreateTemplateId;
  title: string;
  description: string;
  icon: typeof Sun;
};

const CRON_TEMPLATE_OPTIONS: CronTemplateOption[] = [
  {
    id: "morning-brief",
    title: "아침 브리핑",
    description: "밤사이 업데이트를 포함한 일일 상태 요약입니다.",
    icon: Sun,
  },
  {
    id: "reminder",
    title: "리마인더",
    description: "특정 이벤트나 작업을 위한 시간 지정 알림입니다.",
    icon: Bell,
  },
  {
    id: "weekly-review",
    title: "주간 리뷰",
    description: "긴 기간을 주기적으로 종합합니다.",
    icon: CalendarDays,
  },
  {
    id: "inbox-triage",
    title: "인박스 분류",
    description: "들어오는 업데이트를 주기적으로 정리하고 요약합니다.",
    icon: ListChecks,
  },
  {
    id: "custom",
    title: "사용자 지정",
    description: "빈 흐름에서 시작해 각 설정을 직접 고릅니다.",
    icon: ListChecks,
  },
];

const TIMED_AUTOMATION_STEP_META: Array<{ title: string; indicator: string }> = [
  { title: "유형 선택", indicator: "유형" },
  { title: "기능 정의", indicator: "기능" },
  { title: "시간 설정", indicator: "시간" },
  { title: "검토 후 생성", indicator: "검토" },
];

const resolveLocalTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const createInitialCronDraft = (): CronCreateDraft => ({
  templateId: "morning-brief",
  name: "",
  taskText: "",
  scheduleKind: "every",
  everyAmount: 30,
  everyUnit: "minutes",
  everyAtTime: "09:00",
  everyTimeZone: resolveLocalTimeZone(),
  deliveryMode: "none",
  deliveryChannel: "last",
});

const arePermissionsDraftEqual = (a: AgentPermissionsDraft, b: AgentPermissionsDraft): boolean =>
  a.commandMode === b.commandMode &&
  a.webAccess === b.webAccess &&
  a.fileTools === b.fileTools;

const applyTemplateDefaults = (templateId: CronCreateTemplateId, current: CronCreateDraft): CronCreateDraft => {
  const nextTimeZone = (current.everyTimeZone ?? "").trim() || resolveLocalTimeZone();
  const base = {
    ...createInitialCronDraft(),
    deliveryMode: current.deliveryMode ?? "none",
    deliveryChannel: current.deliveryChannel || "last",
    deliveryTo: current.deliveryTo,
    advancedSessionTarget: current.advancedSessionTarget,
    advancedWakeMode: current.advancedWakeMode,
    everyTimeZone: nextTimeZone,
  } satisfies CronCreateDraft;

  if (templateId === "morning-brief") {
    return {
      ...base,
      templateId,
      name: "아침 브리핑",
      taskText: "밤사이 업데이트와 우선순위를 요약하세요.",
      scheduleKind: "every",
      everyAmount: 1,
      everyUnit: "days",
      everyAtTime: "07:00",
    };
  }
  if (templateId === "reminder") {
    return {
      ...base,
      templateId,
      name: "리마인더",
      taskText: "리마인더: 오늘의 우선순위 작업을 후속 확인하세요.",
      scheduleKind: "at",
      scheduleAt: "",
    };
  }
  if (templateId === "weekly-review") {
    return {
      ...base,
      templateId,
      name: "주간 리뷰",
      taskText: "성과, 막힌 항목, 다음 주 우선순위를 요약하세요.",
      scheduleKind: "every",
      everyAmount: 7,
      everyUnit: "days",
      everyAtTime: "09:00",
    };
  }
  if (templateId === "inbox-triage") {
    return {
      ...base,
      templateId,
      name: "인박스 분류",
      taskText: "읽지 않은 업데이트를 분류하고 가장 중요한 행동을 뽑아주세요.",
      scheduleKind: "every",
      everyAmount: 30,
      everyUnit: "minutes",
    };
  }
  return {
    ...base,
    templateId: "custom",
    name: "",
    taskText: "",
    scheduleKind: "every",
    everyAmount: 30,
    everyUnit: "minutes",
  };
};

export const AgentSettingsPanel = ({
  agent,
  mode = "capabilities",
  showHeader = true,
  onClose,
  permissionsDraft,
  onUpdateAgentPermissions = () => {},
  onDelete,
  canDelete = true,
  cronJobs,
  cronLoading,
  cronError,
  cronRunBusyJobId,
  cronDeleteBusyJobId,
  onRunCronJob,
  onDeleteCronJob,
  cronCreateBusy = false,
  onCreateCronJob = () => {},
  controlUiUrl = null,
  adapterType = "openclaw",
  skillsReport = null,
  skillsLoading = false,
  skillsError = null,
  skillsBusy = false,
  skillsBusyKey = null,
  skillMessages = {},
  skillApiKeyDrafts = {},
  defaultAgentScopeWarning = null,
  systemInitialSkillKey = null,
  onSystemInitialSkillHandled = () => {},
  skillsAllowlist,
  onSetSkillEnabled = () => {},
  onOpenSystemSetup = () => {},
  onSetSkillGlobalEnabled = () => {},
  onInstallSkill = () => {},
  onRemoveSkill = () => {},
  onSkillApiKeyChange = () => {},
  onSaveSkillApiKey = () => {},
}: AgentSettingsPanelProps) => {
  const isOpenClawRuntime = adapterType === "openclaw";
  const initialPermissionsDraft =
    permissionsDraft ?? resolvePresetDefaultsForRole(resolveExecutionRoleFromAgent(agent));
  const [permissionsBaselineValue, setPermissionsBaselineValue] =
    useState<AgentPermissionsDraft>(initialPermissionsDraft);
  const [permissionsDraftValue, setPermissionsDraftValue] =
    useState<AgentPermissionsDraft>(initialPermissionsDraft);
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const [permissionsSaveState, setPermissionsSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [permissionsSaveError, setPermissionsSaveError] = useState<string | null>(null);
  const permissionsSaveTimerRef = useRef<number | null>(null);
  const permissionsDraftAgentIdRef = useRef(agent.agentId);
  const [expandedCronJobIds, setExpandedCronJobIds] = useState<Set<string>>(() => new Set());
  const [cronCreateOpen, setCronCreateOpen] = useState(false);
  const [cronCreateStep, setCronCreateStep] = useState(0);
  const [cronCreateError, setCronCreateError] = useState<string | null>(null);
  const [cronDraft, setCronDraft] = useState<CronCreateDraft>(createInitialCronDraft);

  const resolvedExecutionRole = useMemo(() => resolveExecutionRoleFromAgent(agent), [agent]);
  const resolvedPermissionsDraft = useMemo(
    () => permissionsDraft ?? resolvePresetDefaultsForRole(resolvedExecutionRole),
    [permissionsDraft, resolvedExecutionRole]
  );
  const permissionsDirty = useMemo(
    () => !arePermissionsDraftEqual(permissionsDraftValue, permissionsBaselineValue),
    [permissionsBaselineValue, permissionsDraftValue]
  );

  useEffect(() => {
    const agentChanged = permissionsDraftAgentIdRef.current !== agent.agentId;
    permissionsDraftAgentIdRef.current = agent.agentId;
    setPermissionsBaselineValue(resolvedPermissionsDraft);
    if (!agentChanged && (permissionsSaving || permissionsDirty)) {
      return;
    }
    setPermissionsDraftValue(resolvedPermissionsDraft);
    setPermissionsSaveState("idle");
    setPermissionsSaveError(null);
    setPermissionsSaving(false);
  }, [agent.agentId, permissionsDirty, permissionsSaving, resolvedPermissionsDraft]);

  const runPermissionsSave = useCallback(
    async (draft: AgentPermissionsDraft) => {
      if (permissionsSaving) return;
      setPermissionsSaving(true);
      setPermissionsSaveState("saving");
      setPermissionsSaveError(null);
      try {
        await onUpdateAgentPermissions(draft);
        setPermissionsSaveState("saved");
      } catch (err) {
        const message = err instanceof Error ? err.message : "권한을 저장하지 못했습니다.";
        setPermissionsSaveState("error");
        setPermissionsSaveError(message);
      } finally {
        setPermissionsSaving(false);
      }
    },
    [onUpdateAgentPermissions, permissionsSaving]
  );

  useEffect(() => {
    return () => {
      if (permissionsSaveTimerRef.current !== null) {
        window.clearTimeout(permissionsSaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!permissionsDirty) return;
    if (permissionsSaving) return;
    if (permissionsSaveTimerRef.current !== null) {
      window.clearTimeout(permissionsSaveTimerRef.current);
    }
    setPermissionsSaveState("idle");
    permissionsSaveTimerRef.current = window.setTimeout(() => {
      permissionsSaveTimerRef.current = null;
      void runPermissionsSave(permissionsDraftValue);
    }, 450);
    return () => {
      if (permissionsSaveTimerRef.current !== null) {
        window.clearTimeout(permissionsSaveTimerRef.current);
        permissionsSaveTimerRef.current = null;
      }
    };
  }, [permissionsDirty, permissionsDraftValue, permissionsSaving, runPermissionsSave]);

  const openCronCreate = () => {
    setCronCreateOpen(true);
    setCronCreateStep(0);
    setCronCreateError(null);
    setCronDraft(createInitialCronDraft());
  };

  const closeCronCreate = () => {
    setCronCreateOpen(false);
    setCronCreateStep(0);
    setCronCreateError(null);
    setCronDraft(createInitialCronDraft());
  };

  const updateCronDraft = (patch: Partial<CronCreateDraft>) => {
    setCronDraft((prev) => ({ ...prev, ...patch }));
  };

  const selectCronTemplate = (templateId: CronCreateTemplateId) => {
    setCronDraft((prev) => applyTemplateDefaults(templateId, prev));
  };

  const canMoveToScheduleStep = cronDraft.name.trim().length > 0 && cronDraft.taskText.trim().length > 0;
  const canMoveToReviewStep =
    cronDraft.scheduleKind === "every"
      ? Number.isFinite(cronDraft.everyAmount) &&
        (cronDraft.everyAmount ?? 0) > 0 &&
        (cronDraft.everyUnit !== "days" ||
          ((cronDraft.everyAtTime ?? "").trim().length > 0 &&
            (cronDraft.everyTimeZone ?? "").trim().length > 0))
      : (cronDraft.scheduleAt ?? "").trim().length > 0;
  const canSubmitCronCreate = canMoveToScheduleStep && canMoveToReviewStep;

  const submitCronCreate = async () => {
    if (cronCreateBusy || !canSubmitCronCreate) {
      return;
    }
    setCronCreateError(null);
    const payload: CronCreateDraft = {
      templateId: cronDraft.templateId,
      name: cronDraft.name.trim(),
      taskText: cronDraft.taskText.trim(),
      scheduleKind: cronDraft.scheduleKind,
      ...(typeof cronDraft.everyAmount === "number" ? { everyAmount: cronDraft.everyAmount } : {}),
      ...(cronDraft.everyUnit ? { everyUnit: cronDraft.everyUnit } : {}),
      ...(cronDraft.everyUnit === "days" && cronDraft.everyAtTime
        ? { everyAtTime: cronDraft.everyAtTime }
        : {}),
      ...(cronDraft.everyUnit === "days" && cronDraft.everyTimeZone
        ? { everyTimeZone: cronDraft.everyTimeZone }
        : {}),
      ...(cronDraft.scheduleAt ? { scheduleAt: cronDraft.scheduleAt } : {}),
      ...(cronDraft.deliveryMode ? { deliveryMode: cronDraft.deliveryMode } : {}),
      ...(cronDraft.deliveryChannel ? { deliveryChannel: cronDraft.deliveryChannel } : {}),
      ...(cronDraft.deliveryTo ? { deliveryTo: cronDraft.deliveryTo } : {}),
      ...(cronDraft.advancedSessionTarget
        ? { advancedSessionTarget: cronDraft.advancedSessionTarget }
        : {}),
      ...(cronDraft.advancedWakeMode ? { advancedWakeMode: cronDraft.advancedWakeMode } : {}),
    };
    try {
      await onCreateCronJob(payload);
      closeCronCreate();
    } catch (err) {
      setCronCreateError(err instanceof Error ? err.message : "자동화를 만들지 못했습니다.");
    }
  };

  const moveCronCreateBack = () => {
    setCronCreateStep((prev) => Math.max(0, prev - 1));
  };

  const moveCronCreateNext = () => {
    if (cronCreateStep === 0) {
      setCronCreateStep(1);
      return;
    }
    if (cronCreateStep === 1 && canMoveToScheduleStep) {
      setCronCreateStep(2);
      return;
    }
    if (cronCreateStep === 2 && canMoveToReviewStep) {
      setCronCreateStep(3);
    }
  };

  const panelLabel =
    mode === "advanced"
      ? "고급"
      : mode === "skills"
        ? "스킬"
        : mode === "system"
          ? "시스템 설정"
          : "";
  const canOpenControlUi = typeof controlUiUrl === "string" && controlUiUrl.trim().length > 0;
  const timedAutomationStepMeta =
    TIMED_AUTOMATION_STEP_META[cronCreateStep] ??
    TIMED_AUTOMATION_STEP_META[TIMED_AUTOMATION_STEP_META.length - 1];

  return (
    <div
      className="agent-inspect-panel"
      data-testid="agent-settings-panel"
      style={{ position: "relative", left: "auto", top: "auto", width: "100%", height: "100%" }}
    >
      {showHeader ? (
        <AgentInspectHeader
          label={panelLabel}
          title={agent.name}
          onClose={onClose}
          closeTestId="agent-settings-close"
        />
      ) : null}

      <div className="flex flex-col gap-0 px-5 pb-5">
        {mode === "capabilities" ? (
          <section className="sidebar-section" data-testid="agent-settings-permissions">
            <div className="mt-2 flex flex-col gap-8">
              <div className="px-1 py-1">
                <div className="sidebar-copy flex flex-col gap-1 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground/88">명령 실행</span>
                  <div
                    className="ui-segment ui-segment-command-mode mt-2 grid-cols-3"
                    role="group"
                    aria-label="명령 실행"
                  >
                    {(
                      [
                        { id: "off", label: "끔" },
                        { id: "ask", label: "묻기" },
                        { id: "auto", label: "자동" },
                      ] as const
                    ).map((option) => {
                      const selected = permissionsDraftValue.commandMode === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          aria-label={`명령 실행 ${option.label}`}
                          aria-pressed={selected}
                          className="ui-segment-item px-3 py-2.5 text-center font-mono text-[11px] font-semibold tracking-[0.04em]"
                          data-active={selected ? "true" : "false"}
                          onClick={() =>
                            setPermissionsDraftValue((current) => ({
                              ...current,
                              commandMode: option.id,
                            }))
                          }
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="ui-settings-row flex min-h-[68px] items-center justify-between gap-6 px-4 py-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-label="웹 접근"
                    aria-checked={permissionsDraftValue.webAccess}
                    className={`ui-switch self-center ${permissionsDraftValue.webAccess ? "ui-switch--on" : ""}`}
                    onClick={() =>
                      setPermissionsDraftValue((current) => ({
                        ...current,
                        webAccess: !current.webAccess,
                      }))
                    }
                  >
                    <span className="ui-switch-thumb" />
                  </button>
                  <div className="sidebar-copy flex flex-col">
                    <span className="text-[11px] font-medium text-foreground/88">웹 접근</span>
                    <span className="text-[10px] text-muted-foreground/70">
                      이 에이전트가 실시간 웹 결과를 가져올 수 있게 합니다.
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/55" aria-hidden="true" />
              </div>
              <div className="ui-settings-row flex min-h-[68px] items-center justify-between gap-6 px-4 py-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-label="파일 도구"
                    aria-checked={permissionsDraftValue.fileTools}
                    className={`ui-switch self-center ${permissionsDraftValue.fileTools ? "ui-switch--on" : ""}`}
                    onClick={() =>
                      setPermissionsDraftValue((current) => ({
                        ...current,
                        fileTools: !current.fileTools,
                      }))
                    }
                  >
                    <span className="ui-switch-thumb" />
                  </button>
                  <div className="sidebar-copy flex flex-col">
                    <span className="text-[11px] font-medium text-foreground/88">파일 도구</span>
                    <span className="text-[10px] text-muted-foreground/70">
                      이 에이전트가 작업 공간의 파일을 읽고 편집할 수 있게 합니다.
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/55" aria-hidden="true" />
              </div>
              <div className="ui-settings-row flex min-h-[68px] items-center justify-between gap-6 px-4 py-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-label="브라우저 자동화"
                    aria-checked="false"
                    className="ui-switch self-center"
                    disabled
                  >
                    <span className="ui-switch-thumb" />
                  </button>
                  <div className="sidebar-copy flex flex-col">
                    <span className="text-[11px] font-medium text-foreground/88">브라우저 자동화</span>
                    <span className="text-[10px] text-muted-foreground/70">준비 중</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/55" aria-hidden="true" />
              </div>
            </div>
            <div className="sidebar-copy mt-3 text-[11px] text-muted-foreground">
              {permissionsSaveState === "saving" ? "저장 중..." : null}
              {permissionsSaveState === "saved" ? "저장됨" : null}
              {permissionsSaveState === "error" && permissionsSaveError ? (
                <span>
                  저장하지 못했습니다. {permissionsSaveError}{" "}
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={() => {
                      void runPermissionsSave(permissionsDraftValue);
                    }}
                  >
                    다시 시도
                  </button>
                </span>
              ) : null}
            </div>
            {permissionsSaveState === "error" && !permissionsSaveError ? (
              <div className="ui-alert-danger mt-3 rounded-md px-3 py-2 text-xs">
                권한을 저장하지 못했습니다.
              </div>
            ) : null}
          </section>
        ) : null}

        {mode === "skills" ? (
          <AgentSkillsPanel
            skillsReport={skillsReport}
            skillsLoading={skillsLoading}
            skillsError={skillsError}
            skillsBusy={skillsBusy}
            skillsBusyKey={skillsBusyKey}
            skillsAllowlist={skillsAllowlist}
            onSetSkillEnabled={onSetSkillEnabled}
            onOpenSystemSetup={onOpenSystemSetup}
          />
        ) : null}

        {mode === "system" ? (
          <SystemSkillsPanel
            skillsReport={skillsReport}
            skillsLoading={skillsLoading}
            skillsError={skillsError}
            skillsBusy={skillsBusy}
            skillsBusyKey={skillsBusyKey}
            skillMessages={skillMessages}
            skillApiKeyDrafts={skillApiKeyDrafts}
            defaultAgentScopeWarning={defaultAgentScopeWarning}
            initialSkillKey={systemInitialSkillKey}
            onInitialSkillKeyHandled={onSystemInitialSkillHandled}
            onSetSkillGlobalEnabled={onSetSkillGlobalEnabled}
            onInstallSkill={onInstallSkill}
            onRemoveSkill={onRemoveSkill}
            onSkillApiKeyChange={onSkillApiKeyChange}
            onSaveSkillApiKey={onSaveSkillApiKey}
          />
        ) : null}

        {mode === "automations" ? (
          <section className="sidebar-section" data-testid="agent-settings-cron">
            <div className="flex items-center justify-between gap-2">
              <h3 className="sidebar-section-title">시간 지정 자동화</h3>
              {!cronLoading && !cronError && cronJobs.length > 0 ? (
                <button
                  className="sidebar-btn-ghost px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.06em] disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={openCronCreate}
                >
                  만들기
                </button>
              ) : null}
            </div>
            {cronLoading ? (
              <div className="mt-3 text-[11px] text-muted-foreground">시간 지정 자동화를 불러오는 중...</div>
            ) : null}
            {!cronLoading && cronError ? (
              <div className="ui-alert-danger mt-3 rounded-md px-3 py-2 text-xs">
                {cronError}
              </div>
            ) : null}
            {!cronLoading && !cronError && cronJobs.length === 0 ? (
              <div className="sidebar-card mt-3 flex flex-col items-center justify-center gap-4 px-5 py-6 text-center">
                <CalendarDays
                  className="h-4 w-4 text-muted-foreground/70"
                  aria-hidden="true"
                  data-testid="cron-empty-icon"
                />
                <div className="sidebar-copy text-[11px] text-muted-foreground/82">
                  이 에이전트에는 시간 지정 자동화가 없습니다.
                </div>
                <button
                  className="sidebar-btn-primary mt-2 w-auto min-w-[116px] self-center px-4 py-2 font-mono text-[10px] font-semibold tracking-[0.06em] disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={openCronCreate}
                >
                  만들기
                </button>
              </div>
            ) : null}
            {!cronLoading && !cronError && cronJobs.length > 0 ? (
              <div className="mt-3 flex flex-col gap-3">
                {cronJobs.map((job) => {
                  const runBusy = cronRunBusyJobId === job.id;
                  const deleteBusy = cronDeleteBusyJobId === job.id;
                  const busy = runBusy || deleteBusy;
                  const scheduleText = formatCronSchedule(job.schedule);
                  const payloadText = formatCronPayload(job.payload).trim();
                  const payloadPreview = getFirstLinePreview(payloadText, 160);
                  const payloadExpandable =
                    payloadText.length > payloadPreview.length || payloadText.split("\n").length > 1;
                  const expanded = expandedCronJobIds.has(job.id);
                  const stateLine = formatCronStateLine(job);
                  return (
                    <div
                      key={job.id}
                      className="group/cron ui-card flex items-start justify-between gap-2 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <div className="min-w-0 flex-1 truncate font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground">
                            {job.name}
                          </div>
                          {!job.enabled ? (
                            <div className="shrink-0 rounded-md bg-muted/50 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground shadow-2xs">
                              비활성
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            빈도
                          </span>
                          <div className="break-words">{scheduleText}</div>
                        </div>
                        {stateLine ? (
                          <div className="mt-1 break-words text-[11px] text-muted-foreground">
                            {stateLine}
                          </div>
                        ) : null}
                        {payloadText ? (
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                작업
                              </span>
                              {payloadExpandable ? (
                                <button
                                  className="ui-btn-secondary shrink-0 min-h-0 px-2 py-0.5 font-mono text-[9px] font-semibold tracking-[0.06em] text-muted-foreground"
                                  type="button"
                                  onClick={() => {
                                    setExpandedCronJobIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(job.id)) {
                                        next.delete(job.id);
                                      } else {
                                        next.add(job.id);
                                      }
                                      return next;
                                    });
                                  }}
                                >
                                  {expanded ? "접기" : "더 보기"}
                                </button>
                              ) : null}
                            </div>
                            <div className="mt-0.5 whitespace-pre-wrap break-words" title={payloadText}>
                              {expanded ? payloadText : payloadPreview || payloadText}
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 transition group-focus-within/cron:opacity-100 group-hover/cron:opacity-100">
                        <button
                          className="ui-btn-icon h-7 w-7 disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          aria-label={`시간 지정 자동화 ${job.name} 지금 실행`}
                          onClick={() => {
                            void onRunCronJob(job.id);
                          }}
                          disabled={busy}
                        >
                          <Play className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="ui-btn-icon ui-btn-icon-danger h-7 w-7 bg-transparent disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          aria-label={`시간 지정 자동화 ${job.name} 삭제`}
                          onClick={() => {
                            void onDeleteCronJob(job.id);
                          }}
                          disabled={busy}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {isOpenClawRuntime ? (
              <section className="sidebar-section" data-testid="agent-settings-heartbeat-coming-soon">
                <h3 className="sidebar-section-title">하트비트</h3>
                <div className="mt-3 text-[11px] text-muted-foreground">
                  하트비트 자동화 제어는 곧 제공됩니다.
                </div>
              </section>
            ) : null}
          </section>
        ) : null}

        {mode === "advanced" ? (
          <>
            {isOpenClawRuntime ? (
              <section className="sidebar-section mt-8" data-testid="agent-settings-control-ui">
                <h3 className="sidebar-section-title ui-text-danger">위험 구역</h3>
                <div className="ui-alert-danger mt-3 rounded-md px-3 py-3 text-[11px]">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <div className="space-y-1">
                      <div className="font-medium">고급 사용자 전용입니다.</div>
                      <div>Studio 밖에서 전체 OpenClaw Control UI를 엽니다.</div>
                      <div>여기서 변경하면 에이전트 동작이 깨지거나 Studio와 상태가 어긋날 수 있습니다.</div>
                    </div>
                  </div>
                </div>
                {canOpenControlUi ? (
                  <a
                    className="sidebar-btn-primary ui-btn-danger mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-center font-mono text-[10px] font-semibold tracking-[0.06em]"
                    href={controlUiUrl ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                  >
                    전체 Control UI 열기
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : (
                  <>
                    <button
                      className="sidebar-btn-primary ui-btn-danger mt-3 inline-flex px-3 py-2.5 font-mono text-[10px] font-semibold tracking-[0.06em] disabled:cursor-not-allowed disabled:opacity-65"
                      type="button"
                      disabled
                    >
                      전체 Control UI 열기
                    </button>
                    <div className="mt-2 text-[10px] text-muted-foreground/70">
                      이 게이트웨이에서는 Control UI 링크를 사용할 수 없습니다.
                    </div>
                  </>
                )}
              </section>
            ) : null}

            {canDelete ? (
              <section className="sidebar-section mt-8">
                <div className="text-[11px] text-muted-foreground/68">
                  게이트웨이 설정에서 에이전트를 제거하고 예약된 자동화를 삭제합니다.
                </div>
                <button
                  className="sidebar-btn-ghost ui-btn-danger mt-3 inline-flex px-3 py-2 font-mono text-[10px] font-semibold tracking-[0.06em]"
                  type="button"
                  onClick={onDelete}
                >
                  에이전트 삭제
                </button>
              </section>
            ) : (
              <section className="sidebar-section mt-8">
                <h3 className="sidebar-section-title">시스템 에이전트</h3>
                <div className="mt-3 text-[11px] text-muted-foreground">
                  메인 에이전트는 예약되어 있어 삭제할 수 없습니다.
                </div>
              </section>
            )}
          </>
        ) : null}
      </div>

      {cronCreateOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="자동화 만들기"
          onClick={closeCronCreate}
        >
          <div
            className="ui-panel w-full max-w-2xl bg-card shadow-xs"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-6 py-5">
              <div className="min-w-0">
                <div className="text-[11px] font-medium tracking-[0.01em] text-muted-foreground/80">
                  시간 지정 자동화 작성기
                </div>
                <div className="mt-1 text-base font-semibold text-foreground">
                  {timedAutomationStepMeta.title}
                </div>
              </div>
              <button
                type="button"
                className="sidebar-btn-ghost px-3 font-mono text-[10px] font-semibold tracking-[0.06em]"
                onClick={closeCronCreate}
              >
                닫기
              </button>
            </div>
            <div className="space-y-4 px-5 py-5">
              {cronCreateError ? (
                <div className="ui-alert-danger rounded-md px-3 py-2 text-xs">
                  {cronCreateError}
                </div>
              ) : null}
              {cronCreateStep === 0 ? (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    빠르게 시작할 템플릿을 고르거나 사용자 지정을 선택하세요.
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {CRON_TEMPLATE_OPTIONS.map((option) => {
                      const active = option.id === cronDraft.templateId;
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          aria-label={option.title}
                          className={`ui-card px-3 py-3 text-left transition ${
                            active ? "ui-selected" : "bg-surface-2/60 hover:bg-surface-3/90"
                          }`}
                          onClick={() => selectCronTemplate(option.id)}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-foreground" />
                            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground">
                              {option.title}
                            </div>
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {option.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {cronCreateStep === 1 ? (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    자동화 이름을 정하고 수행할 작업을 설명하세요.
                  </div>
                  <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em]">
                      자동화 이름
                    </span>
                    <input
                      aria-label="자동화 이름"
                      className="h-10 rounded-md border border-border bg-surface-3 px-3 text-sm text-foreground outline-none"
                      value={cronDraft.name}
                      onChange={(event) => updateCronDraft({ name: event.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em]">
                      작업
                    </span>
                    <textarea
                      aria-label="작업"
                      className="min-h-28 rounded-md border border-border bg-surface-3 px-3 py-2 text-sm text-foreground outline-none"
                      value={cronDraft.taskText}
                      onChange={(event) => updateCronDraft({ taskText: event.target.value })}
                    />
                  </label>
                </div>
              ) : null}
              {cronCreateStep === 2 ? (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">언제 실행할지 선택하세요.</div>
                  <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em]">
                      일정 유형
                    </span>
                    <select
                      className="h-10 rounded-md border border-border bg-surface-3 px-3 text-sm text-foreground outline-none"
                      value={cronDraft.scheduleKind}
                      onChange={(event) =>
                        updateCronDraft({
                          scheduleKind: event.target.value as CronCreateDraft["scheduleKind"],
                        })
                      }
                    >
                      <option value="every">반복</option>
                      <option value="at">한 번</option>
                    </select>
                  </label>
                  {cronDraft.scheduleKind === "every" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em]">
                          반복 간격
                        </span>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          className="h-10 rounded-md border border-border bg-surface-3 px-3 text-sm text-foreground outline-none"
                          value={String(cronDraft.everyAmount ?? 30)}
                          onChange={(event) =>
                            updateCronDraft({
                              everyAmount: Number.parseInt(event.target.value, 10) || 0,
                            })
                          }
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em]">
                          단위
                        </span>
                        <select
                          className="h-10 rounded-md border border-border bg-surface-3 px-3 text-sm text-foreground outline-none"
                          value={cronDraft.everyUnit ?? "minutes"}
                          onChange={(event) =>
                            updateCronDraft({
                              everyUnit: event.target.value as CronCreateDraft["everyUnit"],
                            })
                          }
                        >
                          <option value="minutes">분</option>
                          <option value="hours">시간</option>
                          <option value="days">일</option>
                        </select>
                      </label>
                      {cronDraft.everyUnit === "days" ? (
                        <>
                          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em]">
                              시간
                            </span>
                            <input
                              type="time"
                              className="h-10 rounded-md border border-border bg-surface-3 px-3 text-sm text-foreground outline-none"
                              value={cronDraft.everyAtTime ?? "09:00"}
                              onChange={(event) => updateCronDraft({ everyAtTime: event.target.value })}
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em]">
                              시간대
                            </span>
                            <input
                              className="h-10 rounded-md border border-border bg-surface-3 px-3 text-sm text-foreground outline-none"
                              value={cronDraft.everyTimeZone ?? resolveLocalTimeZone()}
                              onChange={(event) =>
                                updateCronDraft({ everyTimeZone: event.target.value })
                              }
                            />
                          </label>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                  {cronDraft.scheduleKind === "at" ? (
                    <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em]">
                        실행 일시
                      </span>
                      <input
                        type="datetime-local"
                        className="h-10 rounded-md border border-border bg-surface-3 px-3 text-sm text-foreground outline-none"
                        value={cronDraft.scheduleAt ?? ""}
                        onChange={(event) => updateCronDraft({ scheduleAt: event.target.value })}
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}
              {cronCreateStep === 3 ? (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div>자동화를 만들기 전에 세부 정보를 검토하세요.</div>
                  <div className="ui-card px-3 py-2">
                    <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground">
                      {cronDraft.name || "제목 없는 자동화"}
                    </div>
                    <div className="mt-1 text-[11px]">
                      {cronDraft.taskText || "작업이 없습니다."}
                    </div>
                    <div className="mt-2 text-[11px]">
                      일정:{" "}
                      {cronDraft.scheduleKind === "every"
                        ? `${cronDraft.everyAmount ?? 0}${
                            cronDraft.everyUnit === "hours"
                              ? "시간"
                              : cronDraft.everyUnit === "days"
                                ? "일"
                                : "분"
                          }마다${
                            cronDraft.everyUnit === "days"
                              ? ` ${cronDraft.everyAtTime ?? ""} (${cronDraft.everyTimeZone ?? resolveLocalTimeZone()})`
                              : ""
                          }`
                        : `${cronDraft.scheduleAt ?? ""}`}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border/50 px-5 pb-4 pt-5">
              <div className="text-[11px] text-muted-foreground">
                {timedAutomationStepMeta.indicator} - {cronCreateStep + 1}/4 단계
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="sidebar-btn-ghost px-3 py-2 font-mono text-[10px] font-semibold tracking-[0.06em] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={moveCronCreateBack}
                  disabled={cronCreateStep === 0 || cronCreateBusy}
                >
                  뒤로
                </button>
                {cronCreateStep < 3 ? (
                  <button
                    type="button"
                    className="sidebar-btn-ghost px-3 py-2 font-mono text-[10px] font-semibold tracking-[0.06em] disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={moveCronCreateNext}
                    disabled={
                      cronCreateBusy ||
                      (cronCreateStep === 1 && !canMoveToScheduleStep) ||
                      (cronCreateStep === 2 && !canMoveToReviewStep)
                    }
                  >
                    다음
                  </button>
                ) : null}
                {cronCreateStep === 3 ? (
                  <button
                    type="button"
                    className="sidebar-btn-primary px-3 py-2 font-mono text-[10px] font-semibold tracking-[0.06em] disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground"
                    onClick={() => {
                      void submitCronCreate();
                    }}
                    disabled={cronCreateBusy || !canSubmitCronCreate}
                  >
                    자동화 만들기
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
