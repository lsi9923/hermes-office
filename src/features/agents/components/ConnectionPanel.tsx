import type { GatewayStatus } from "@/lib/gateway/GatewayClient";
import type { StudioGatewayAdapterType } from "@/lib/studio/settings";
import { X } from "lucide-react";
import { resolveGatewayStatusBadgeClass, resolveGatewayStatusLabel } from "./colorSemantics";
import {
  ADAPTER_BUTTON_LABELS,
  ADAPTER_HINTS,
  formatAdapterLabel,
} from "@/features/office/i18n/koLabels";

type ConnectionPanelProps = {
  gatewayUrl: string;
  token: string;
  selectedAdapterType: StudioGatewayAdapterType;
  activeAdapterType: StudioGatewayAdapterType;
  localGatewayUrl?: string | null;
  localGatewayToken?: string | null;
  status: GatewayStatus;
  error: string | null;
  onGatewayUrlChange: (value: string) => void;
  onTokenChange: (value: string) => void;
  onAdapterTypeChange: (value: StudioGatewayAdapterType) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onClose?: () => void;
};

export const ConnectionPanel = ({
  gatewayUrl,
  token,
  selectedAdapterType,
  activeAdapterType,
  localGatewayUrl = null,
  localGatewayToken = null,
  status,
  error,
  onGatewayUrlChange,
  onTokenChange,
  onAdapterTypeChange,
  onConnect,
  onDisconnect,
  onClose,
}: ConnectionPanelProps) => {
  const isConnected = status === "connected";
  const isConnecting = status === "connecting";
  const tokenOptional =
    selectedAdapterType === "hermes" ||
    selectedAdapterType === "demo" ||
    selectedAdapterType === "local" ||
    selectedAdapterType === "claw3d" ||
    selectedAdapterType === "custom";
  const applyDemoPreset = () => {
    onAdapterTypeChange("demo");
  };
  const applyHermesPreset = () => {
    onAdapterTypeChange("hermes");
  };
  const applyCustomPreset = () => {
    onAdapterTypeChange("custom");
  };
  const applyLocalPreset = () => {
    onAdapterTypeChange("local");
  };
  const applyClaw3dPreset = () => {
    onAdapterTypeChange("claw3d");
  };
  const applyOpenClawPreset = () => {
    onAdapterTypeChange("openclaw");
  };
  const selectedAdapterHint = ADAPTER_HINTS[selectedAdapterType];

  return (
    <div className="fade-up-delay flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`ui-chip inline-flex items-center px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] ${resolveGatewayStatusBadgeClass(status)}`}
            data-status={status}
          >
            {resolveGatewayStatusLabel(status)}
          </span>
          <button
            className="ui-btn-secondary px-4 py-2 text-xs font-semibold tracking-[0.05em] text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={isConnected ? onDisconnect : onConnect}
            disabled={isConnecting || !gatewayUrl.trim()}
          >
            {isConnected ? "연결 끊기" : "연결"}
          </button>
        </div>
        {onClose ? (
          <button
            className="ui-btn-ghost inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold tracking-[0.05em] text-foreground"
            type="button"
            onClick={onClose}
            data-testid="gateway-connection-close"
            aria-label="게이트웨이 연결 패널 닫기"
          >
            <X className="h-3.5 w-3.5" />
            닫기
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <label className="flex flex-col gap-1 font-mono text-[10px] font-semibold tracking-[0.06em] text-muted-foreground">
          업스트림 URL
          <input
            className="ui-input h-10 rounded-md px-4 font-sans text-sm text-foreground outline-none"
            type="text"
            value={gatewayUrl}
            onChange={(event) => onGatewayUrlChange(event.target.value)}
            placeholder="ws://localhost:18789"
            spellCheck={false}
          />
        </label>
        <label className="flex flex-col gap-1 font-mono text-[10px] font-semibold tracking-[0.06em] text-muted-foreground">
          {tokenOptional ? "업스트림 토큰(선택)" : "업스트림 토큰"}
          <input
            className="ui-input h-10 rounded-md px-4 font-sans text-sm text-foreground outline-none"
            type="password"
            value={token}
            onChange={(event) => onTokenChange(event.target.value)}
            placeholder={tokenOptional ? "선택 토큰" : "게이트웨이 토큰"}
            spellCheck={false}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="font-mono">선택 백엔드: {formatAdapterLabel(selectedAdapterType)}</span>
        <span className="font-mono">활성 백엔드: {formatAdapterLabel(activeAdapterType)}</span>
        <span>각 백엔드는 저장된 URL과 토큰을 따로 보관합니다.</span>
      </div>
      <div className="text-[11px] leading-snug text-muted-foreground">
        {selectedAdapterHint}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="ui-btn-secondary px-3 py-1.5 text-[11px] font-semibold tracking-[0.05em]"
          type="button"
          onClick={applyDemoPreset}
        >
          {ADAPTER_BUTTON_LABELS.demo}
        </button>
        <button
          className="ui-btn-secondary px-3 py-1.5 text-[11px] font-semibold tracking-[0.05em]"
          type="button"
          onClick={applyHermesPreset}
        >
          {ADAPTER_BUTTON_LABELS.hermes}
        </button>
        <button
          className="ui-btn-secondary px-3 py-1.5 text-[11px] font-semibold tracking-[0.05em]"
          type="button"
          onClick={applyLocalPreset}
        >
          {ADAPTER_BUTTON_LABELS.local}
        </button>
        <button
          className="ui-btn-secondary px-3 py-1.5 text-[11px] font-semibold tracking-[0.05em]"
          type="button"
          onClick={applyClaw3dPreset}
        >
          {ADAPTER_BUTTON_LABELS.claw3d}
        </button>
        <button
          className="ui-btn-secondary px-3 py-1.5 text-[11px] font-semibold tracking-[0.05em]"
          type="button"
          onClick={applyCustomPreset}
        >
          {ADAPTER_BUTTON_LABELS.custom}
        </button>
        <button
          className="ui-btn-secondary px-3 py-1.5 text-[11px] font-semibold tracking-[0.05em]"
          type="button"
          onClick={applyOpenClawPreset}
        >
          {ADAPTER_BUTTON_LABELS.openclaw}
        </button>
      </div>
      {error ? (
        <p className="ui-alert-danger rounded-md px-4 py-2 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
};
