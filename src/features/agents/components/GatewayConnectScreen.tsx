import { useMemo, useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import type { GatewayStatus } from "@/lib/gateway/GatewayClient";
import { isLocalGatewayUrl } from "@/lib/gateway/local-gateway";
import type { StudioGatewayAdapterType, StudioGatewaySettings } from "@/lib/studio/settings";
import { RunningAvatarLoader } from "@/features/agents/components/RunningAvatarLoader";
import {
  ADAPTER_BUTTON_LABELS,
  ADAPTER_HINTS,
  formatAdapterLabel,
} from "@/features/office/i18n/koLabels";

type GatewayConnectScreenProps = {
  gatewayUrl: string;
  token: string;
  selectedAdapterType: StudioGatewayAdapterType;
  activeAdapterType: StudioGatewayAdapterType;
  localGatewayDefaults: StudioGatewaySettings | null;
  status: GatewayStatus;
  error: string | null;
  showApprovalHint: boolean;
  onGatewayUrlChange: (value: string) => void;
  onTokenChange: (value: string) => void;
  onAdapterTypeChange: (value: StudioGatewayAdapterType) => void;
  onUseLocalDefaults: () => void;
  onConnect: () => void;
};

const resolveLocalGatewayPort = (gatewayUrl: string): number => {
  try {
    const parsed = new URL(gatewayUrl);
    const port = Number(parsed.port);
    if (Number.isFinite(port) && port > 0) return port;
  } catch {}
  return 18789;
};

const ADAPTER_ORDER: StudioGatewayAdapterType[] = [
  "demo",
  "hermes",
  "local",
  "claw3d",
  "custom",
  "openclaw",
];

export const GatewayConnectScreen = ({
  gatewayUrl,
  token,
  selectedAdapterType,
  activeAdapterType,
  localGatewayDefaults,
  status,
  error,
  showApprovalHint,
  onGatewayUrlChange,
  onTokenChange,
  onAdapterTypeChange,
  onUseLocalDefaults,
  onConnect,
}: GatewayConnectScreenProps) => {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [showToken, setShowToken] = useState(false);
  const tokenOptional =
    selectedAdapterType === "hermes" ||
    selectedAdapterType === "demo" ||
    selectedAdapterType === "local" ||
    selectedAdapterType === "claw3d" ||
    selectedAdapterType === "custom";
  const isLocal = useMemo(() => isLocalGatewayUrl(gatewayUrl), [gatewayUrl]);
  const localPort = useMemo(() => resolveLocalGatewayPort(gatewayUrl), [gatewayUrl]);
  const localGatewayCommand = useMemo(
    () => `npx openclaw gateway run --bind loopback --port ${localPort} --verbose`,
    [localPort],
  );
  const localGatewayCommandPnpm = useMemo(
    () => `pnpm openclaw gateway run --bind loopback --port ${localPort} --verbose`,
    [localPort],
  );
  const localDemoCommand = useMemo(() => "npm run demo-gateway", []);
  const statusCopy = useMemo(() => {
    if (status === "connecting" && isLocal) {
      return `${localPort} 포트에서 로컬 게이트웨이를 찾았습니다. 연결 중...`;
    }
    if (status === "connecting") {
      return "원격 게이트웨이에 연결 중...";
    }
    if (isLocal) {
      return "로컬 게이트웨이를 찾지 못했습니다.";
    }
    return "아직 게이트웨이에 연결되지 않았습니다.";
  }, [isLocal, localPort, status]);
  const selectedAdapterHint = ADAPTER_HINTS[selectedAdapterType];
  const connectDisabled = status === "connecting";
  const connectLabel = connectDisabled ? "연결 중..." : "연결";
  const statusDotClass =
    status === "connected"
      ? "ui-dot-status-connected"
      : status === "connecting"
        ? "ui-dot-status-connecting"
        : "ui-dot-status-disconnected";

  const copyLocalCommand = async () => {
    try {
      await navigator.clipboard.writeText(localGatewayCommand);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1200);
    } catch {
      setCopyStatus("failed");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    }
  };

  const commandField = (
    <div className="space-y-1.5">
      <div className="ui-command-surface flex items-center gap-2 rounded-md px-3 py-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[12px] text-[var(--command-fg)]">
          {localGatewayCommand}
        </code>
        <button
          type="button"
          className="ui-btn-icon ui-command-copy h-7 w-7 shrink-0"
          onClick={copyLocalCommand}
          aria-label="로컬 게이트웨이 명령 복사"
          title="명령 복사"
        >
          {copyStatus === "copied" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      {copyStatus === "copied" ? (
        <p className="text-xs text-muted-foreground">복사했습니다.</p>
      ) : copyStatus === "failed" ? (
        <p className="ui-text-danger text-xs">명령을 복사하지 못했습니다.</p>
      ) : (
        <p className="text-xs leading-snug text-muted-foreground">
          소스 체크아웃에서는 <span className="font-mono text-foreground">{localGatewayCommandPnpm}</span>를 사용하세요.
        </p>
      )}
    </div>
  );

  const remoteForm = (
    <div className="mt-2.5 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-[11px] font-medium text-foreground/90">
        업스트림 URL
        <input
          className="ui-input h-10 rounded-md px-4 font-sans text-sm text-foreground outline-none"
          type="text"
          value={gatewayUrl}
          onChange={(event) => onGatewayUrlChange(event.target.value)}
          placeholder="wss://your-gateway.example.com"
          spellCheck={false}
        />
      </label>

      <div className="space-y-0.5 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Tailscale을 쓰나요?</p>
        <p>
          URL: <span className="font-mono">wss://&lt;your-tailnet-host&gt;</span>
        </p>
      </div>

      <label className="flex flex-col gap-1 text-[11px] font-medium text-foreground/90">
        {tokenOptional ? "업스트림 토큰(선택)" : "업스트림 토큰"}
        <div className="relative">
          <input
            className="ui-input h-10 w-full rounded-md px-4 pr-10 font-sans text-sm text-foreground outline-none"
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(event) => onTokenChange(event.target.value)}
            placeholder={tokenOptional ? "선택 토큰" : "게이트웨이 토큰"}
            spellCheck={false}
          />
          <button
            type="button"
            className="ui-btn-icon absolute inset-y-0 right-1 my-auto h-8 w-8 border-transparent bg-transparent text-muted-foreground hover:bg-transparent hover:text-foreground"
            aria-label={showToken ? "토큰 숨기기" : "토큰 보기"}
            onClick={() => setShowToken((prev) => !prev)}
          >
            {showToken ? (
              <EyeOff className="h-4 w-4 transition-transform duration-150" />
            ) : (
              <Eye className="h-4 w-4 transition-transform duration-150" />
            )}
          </button>
        </div>
      </label>

      <button
        type="button"
        className="ui-btn-primary mt-1 h-11 w-full px-4 text-xs font-semibold tracking-[0.05em] disabled:cursor-not-allowed disabled:opacity-60"
        onClick={onConnect}
        disabled={connectDisabled || !gatewayUrl.trim()}
      >
        {connectLabel}
      </button>

      {status === "connecting" ? (
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <RunningAvatarLoader size={16} trackWidth={32} inline />
          연결 중...
        </div>
      ) : null}
      {error ? <p className="ui-text-danger text-xs leading-snug">{error}</p> : null}
      {showApprovalHint && selectedAdapterType === "openclaw" ? (
        <div className="rounded-md border border-border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
          <p className="leading-snug">
            첫 연결이 되지 않았다면 OpenClaw가 실행 중인 컴퓨터에서 이 장치를 승인하세요.
          </p>
          <code className="mt-2 block overflow-x-auto whitespace-nowrap rounded-md bg-[var(--command-bg)] px-2.5 py-2 font-mono text-[11px] text-[var(--command-fg)]">
            openclaw devices approve --latest
          </code>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[820px] flex-1 flex-col gap-5">
      <div className="ui-card px-4 py-2">
        <div className="flex items-center gap-2">
          {status === "connecting" ? (
            <RunningAvatarLoader size={18} trackWidth={36} inline />
          ) : (
            <span className={`h-2.5 w-2.5 ${statusDotClass}`} />
          )}
          <p className="text-sm font-semibold text-foreground">{statusCopy}</p>
        </div>
      </div>

      <div className="ui-card px-4 py-5 sm:px-6">
        <div>
          <p className="font-mono text-[10px] font-medium tracking-[0.06em] text-muted-foreground">
            원격 게이트웨이(권장)
          </p>
          <p className="mt-2 text-sm text-foreground/90">
            백엔드를 선택한 뒤 게이트웨이 URL에 연결하세요.
          </p>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
            선택 백엔드: {formatAdapterLabel(selectedAdapterType)} | 활성 백엔드: {formatAdapterLabel(activeAdapterType)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            각 백엔드는 저장된 URL과 토큰을 따로 보관합니다.
          </p>
          <p className="mt-2 text-xs leading-snug text-muted-foreground">
            {selectedAdapterHint}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ADAPTER_ORDER.map((adapterType) => (
              <button
                key={adapterType}
                type="button"
                className="ui-btn-secondary px-3 py-1.5 text-[11px] font-semibold tracking-[0.05em]"
                onClick={() => onAdapterTypeChange(adapterType)}
              >
                {ADAPTER_BUTTON_LABELS[adapterType]}
              </button>
            ))}
          </div>
        </div>
        {remoteForm}
      </div>

      <div className="ui-card px-4 py-4 sm:px-6 sm:py-5">
        <div className="space-y-1.5">
          <p className="font-mono text-[10px] font-semibold tracking-[0.06em] text-muted-foreground">
            로컬 실행(선택)
          </p>
          <p className="text-sm text-foreground/90">
            이 컴퓨터에서 로컬 게이트웨이 프로세스를 시작한 뒤 연결하세요.
          </p>
        </div>
        <div className="mt-3 space-y-3">
          {commandField}
          <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
            <p className="text-xs font-medium text-foreground">오피스만 먼저 보고 싶나요?</p>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">
              <span className="font-mono text-foreground">{localDemoCommand}</span>를 실행하면 데모 에이전트가 있는 내장 모의 게이트웨이가 시작됩니다.
              그 다음 <span className="font-mono text-foreground">데모 백엔드</span>를 선택하고 연결하세요.
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
            <p className="text-xs font-medium text-foreground">Hermes를 로컬에서 쓰나요?</p>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">
              <span className="font-mono text-foreground">npm run hermes-adapter</span>를 실행한 뒤
              <span className="font-mono text-foreground"> Hermes 백엔드</span>를 선택하세요. 기본 로컬 URL은
              <span className="font-mono text-foreground"> ws://localhost:18789</span>입니다.
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
            <p className="text-xs font-medium text-foreground">로컬 또는 사용자 지정 런타임을 쓰나요?</p>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">
              <span className="font-mono text-foreground">로컬 런타임</span>,
              <span className="font-mono text-foreground"> Claw3D 런타임</span>, 또는
              <span className="font-mono text-foreground"> 사용자 지정 백엔드</span>를 선택하고 URL을 오케스트레이터나 런타임 엔드포인트로 맞추세요.
              이 프로필들은 URL과 토큰을 서로 따로 저장합니다.
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
            <p className="text-xs font-medium text-foreground">다른 컴퓨터에서 Claw3D를 열고 있나요?</p>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">
              Studio를 <span className="font-mono text-foreground">HOST=0.0.0.0</span> 또는 특정 LAN/Tailscale 호스트로 시작하고,
              로컬호스트 밖으로 노출하기 전에 <span className="font-mono text-foreground"> STUDIO_ACCESS_TOKEN</span>을 설정하세요.
              게이트웨이 설정은 Studio 호스트에 저장되지만 OpenClaw 장치 승인은 브라우저/장치마다 필요합니다.
            </p>
          </div>
          {localGatewayDefaults ? (
            <div className="ui-input rounded-md px-3 py-3">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">~/.openclaw/openclaw.json</span>의 토큰을 사용합니다.
                </p>
                <p className="font-mono text-[11px] text-foreground">
                  {localGatewayDefaults.url}
                </p>
                <button
                  type="button"
                  className="ui-btn-secondary h-9 w-full px-3 text-xs font-semibold tracking-[0.05em]"
                  onClick={onUseLocalDefaults}
                >
                  로컬 기본값 사용
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
