import type { AgentStatus } from "@/features/agents/state/store";
import type { TaskBoardStatus } from "@/features/office/tasks/types";
import type { GatewayStatus } from "@/lib/gateway/GatewayClient";
import type { FloorProvider } from "@/lib/office/floors";
import type { StudioGatewayAdapterType } from "@/lib/studio/settings";

export const ADAPTER_LABELS: Record<StudioGatewayAdapterType, string> = {
  demo: "데모",
  hermes: "Hermes",
  local: "로컬 런타임",
  claw3d: "Claw3D 런타임",
  custom: "사용자 지정",
  openclaw: "OpenClaw",
};

export const ADAPTER_BUTTON_LABELS: Record<StudioGatewayAdapterType, string> = {
  demo: "데모 백엔드",
  hermes: "Hermes 백엔드",
  local: "로컬 런타임",
  claw3d: "Claw3D 런타임",
  custom: "사용자 지정 백엔드",
  openclaw: "OpenClaw 백엔드",
};

export const ADAPTER_HINTS: Record<StudioGatewayAdapterType, string> = {
  openclaw:
    "OpenClaw는 모델과 제공자 라우팅을 게이트웨이 안에서 관리하는 경로입니다.",
  hermes: "Hermes는 게이트웨이 뒤에서 자체 제공자와 계정 흐름을 쓰는 에이전트 런타임입니다.",
  demo: "데모는 로컬 기본 에이전트를 쓰거나 내장 모의 게이트웨이에 연결할 수 있습니다.",
  local: "로컬 런타임은 제공자 목록이 아니라 직접 HTTP 런타임 또는 오케스트레이터 경계를 기대합니다.",
  claw3d: "Claw3D 런타임은 직접 런타임 연결 위에서 Claw3D 대화 규칙을 유지합니다.",
  custom: "사용자 지정은 호환 런타임용 일반 엔드포인트입니다. 제공자별 인증 흐름용은 아닙니다.",
};

export const FLOOR_PROVIDER_LABELS: Record<FloorProvider, string> = {
  demo: "데모",
  openclaw: "OpenClaw",
  hermes: "Hermes",
  paperclip: "Paperclip",
  custom: "사용자 지정",
  local: "로컬",
  claw3d: "Claw3D",
};

export const AGENT_STATUS_LABELS_KO: Record<AgentStatus, string> = {
  idle: "대기",
  running: "실행 중",
  error: "오류",
};

export const GATEWAY_STATUS_LABELS_KO: Record<GatewayStatus, string> = {
  disconnected: "연결 끊김",
  connecting: "연결 중",
  connected: "연결됨",
};

export const TASK_STATUS_LABELS_KO: Record<TaskBoardStatus, string> = {
  todo: "할 일",
  in_progress: "진행 중",
  blocked: "막힘",
  review: "검토",
  done: "완료",
};

export const formatAdapterLabel = (value: string | null | undefined): string => {
  if (!value) return "알 수 없음";
  return ADAPTER_LABELS[value as StudioGatewayAdapterType] ?? value;
};

export const formatRosterStatus = (value: string | null | undefined): string => {
  switch (value) {
    case "idle":
      return "대기";
    case "loading":
      return "불러오는 중";
    case "connected":
      return "연결됨";
    case "disconnected":
      return "연결 끊김";
    case "error":
      return "오류";
    default:
      return value?.trim() || "알 수 없음";
  }
};

export const formatAccessMode = (value: "all" | "none" | "selected"): string => {
  switch (value) {
    case "all":
      return "모든 스킬";
    case "none":
      return "없음";
    case "selected":
      return "선택한 스킬";
  }
};
