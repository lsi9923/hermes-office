import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, Wifi, WifiOff } from "lucide-react";
import { RunningAvatarLoader } from "@/features/agents/components/RunningAvatarLoader";

export type ConnectStepProps = {
  gatewayUrl: string;
  token: string;
  onGatewayUrlChange: (value: string) => void;
  onTokenChange: (value: string) => void;
  onConnect: () => void;
  connected: boolean;
  connecting: boolean;
  error: string | null;
};

export const ConnectStep = ({
  gatewayUrl,
  token,
  onGatewayUrlChange,
  onTokenChange,
  onConnect,
  connected,
  connecting,
  error,
}: ConnectStepProps) => {
  const [showToken, setShowToken] = useState(false);

  if (connected) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
          <CheckCircle2 className="h-6 w-6 text-amber-300" />
        </div>
        <p className="text-sm font-semibold text-white">연결되었습니다!</p>
        <p className="text-xs text-white/60">
          게이트웨이가 활성화되었습니다. 다음을 눌러 계속하세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5">
        <WifiOff className="h-4 w-4 text-white/40" />
        <p className="text-xs text-white/60">연결되지 않음</p>
      </div>

      <div className="space-y-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-white/80">
            게이트웨이 URL
          </span>
          <input
            className="h-9 rounded-md border border-white/10 bg-white/5 px-3 font-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-amber-400/50"
            type="text"
            value={gatewayUrl}
            onChange={(e) => onGatewayUrlChange(e.target.value)}
            placeholder="ws://localhost:18789 또는 wss://your-host"
            spellCheck={false}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-white/80">
            게이트웨이 토큰
          </span>
          <div className="relative">
            <input
              className="h-9 w-full rounded-md border border-white/10 bg-white/5 px-3 pr-9 font-mono text-sm text-white outline-none placeholder:text-white/30 focus:border-amber-400/50"
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => onTokenChange(e.target.value)}
              placeholder="게이트웨이 토큰"
              spellCheck={false}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-1 my-auto flex h-7 w-7 items-center justify-center rounded text-white/50 hover:text-white"
              onClick={() => setShowToken((prev) => !prev)}
              aria-label={showToken ? "토큰 숨기기" : "토큰 보기"}
            >
              {showToken ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </label>

        <button
          type="button"
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-amber-500 px-4 text-xs font-semibold text-[#1a1206] transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onConnect}
          disabled={connecting || !gatewayUrl.trim()}
        >
          {connecting ? (
            <>
              <RunningAvatarLoader size={16} trackWidth={32} inline />
              연결 중...
            </>
          ) : (
            <>
              <Wifi className="h-3.5 w-3.5" />
              연결
            </>
          )}
        </button>
      </div>

      {error ? (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      ) : null}

      <div className="space-y-1.5 text-[11px] text-white/40">
        <p>
          <strong className="text-white/60">로컬?</strong>{" "}
          <code className="text-white/50">ws://localhost:18789</code>
        </p>
        <p>
          <strong className="text-white/60">Tailscale?</strong>{" "}
          <code className="text-white/50">wss://your-host.ts.net</code>
        </p>
        <p>
          <strong className="text-white/60">SSH 터널?</strong> 먼저 18789 포트를
          포워딩한 뒤 localhost를 사용하세요.
        </p>
      </div>
    </div>
  );
};
