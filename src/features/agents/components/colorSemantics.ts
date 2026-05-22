import type { AgentStatus } from "@/features/agents/state/store";
import type { GatewayStatus } from "@/lib/gateway/GatewayClient";

export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  idle: "대기",
  running: "실행 중",
  error: "오류",
};

export const AGENT_STATUS_BADGE_CLASS: Record<AgentStatus, string> = {
  idle: "ui-badge-status-idle",
  running: "ui-badge-status-running",
  error: "ui-badge-status-error",
};

export const GATEWAY_STATUS_LABEL: Record<GatewayStatus, string> = {
  disconnected: "연결 끊김",
  connecting: "연결 중",
  connected: "연결됨",
};

export const GATEWAY_STATUS_BADGE_CLASS: Record<GatewayStatus, string> = {
  disconnected: "ui-badge-status-disconnected",
  connecting: "ui-badge-status-connecting",
  connected: "ui-badge-status-connected",
};

export const NEEDS_APPROVAL_BADGE_CLASS = "ui-badge-approval";

export const resolveAgentStatusBadgeClass = (status: AgentStatus): string =>
  AGENT_STATUS_BADGE_CLASS[status];

export const resolveGatewayStatusBadgeClass = (status: GatewayStatus): string =>
  GATEWAY_STATUS_BADGE_CLASS[status];

export const resolveAgentStatusLabel = (status: AgentStatus): string => AGENT_STATUS_LABEL[status];

export const resolveGatewayStatusLabel = (status: GatewayStatus): string => GATEWAY_STATUS_LABEL[status];
