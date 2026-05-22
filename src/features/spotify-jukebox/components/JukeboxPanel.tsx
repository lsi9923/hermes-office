"use client";

import { useEffect, useRef, useState } from "react";
import { RunningAvatarLoader } from "@/features/agents/components/RunningAvatarLoader";
import { useJukeboxStore } from "../store";
import {
  startSpotifyAuth,
  buildRedirectUri,
  loadToken,
  exchangeCodeForToken,
  loadCallbackBaseUrl,
  saveCallbackBaseUrl,
  loadAuthState,
} from "../auth";
import type { SpotifyTrack } from "../spotifyApi";

type JukeboxPanelProps = {
  onClose: () => void;
  selectedAgentName?: string | null;
  client?: unknown;
};

// ---------------------------------------------------------------------------
// Root panel
// ---------------------------------------------------------------------------

export function JukeboxPanel({ onClose }: JukeboxPanelProps) {
  const { view, init } = useJukeboxStore();

  useEffect(() => {
    init();
    const handleMessage = (event: MessageEvent) => {
      const callbackBaseUrl = loadCallbackBaseUrl();
      if (!callbackBaseUrl) return;
      const callbackOrigin = new URL(callbackBaseUrl).origin;
      if (event.origin !== callbackOrigin) return;
      const payload = event.data as
        | {
            type?: string;
            code?: string;
            error?: string;
            state?: string;
          }
        | undefined;
      if (!payload || payload.type !== "soundclaw-spotify-auth") return;
      if (payload.error) return;
      if (!payload.code) return;
      if (payload.state !== loadAuthState()) return;

      const { clientId, setToken } = useJukeboxStore.getState();
      void exchangeCodeForToken(payload.code, clientId, buildRedirectUri(callbackBaseUrl)).then(
        (ok) => {
          if (!ok) return;
          const token = loadToken();
          if (token) setToken(token);
        },
      );
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
      <div
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-cyan-500/20 bg-slate-950/98 shadow-2xl"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header. */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎵</span>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400/70">
                Soundclaw
              </div>
              <h2 className="text-base font-semibold text-white">오피스 주크박스</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-1.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            닫기
          </button>
        </div>

        {/* Body. */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(90vh - 68px)" }}>
          {view === "setup" ? <SetupView /> : <PlayerView />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Setup view — shown before the user authenticates
// ---------------------------------------------------------------------------

function SetupView() {
  const { clientId, setClientId } = useJukeboxStore();
  const [inputId, setInputId] = useState(clientId);
  const [callbackBaseUrl, setCallbackBaseUrl] = useState(() => loadCallbackBaseUrl());
  const [isRedirecting, setIsRedirecting] = useState(false);
  const redirectUri = buildRedirectUri(callbackBaseUrl);
  const localhostOrigin =
    typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "";
  const callbackLooksValid = /^https:\/\/.+/i.test(callbackBaseUrl.trim());

  const handleConnect = async () => {
    if (!inputId.trim() || !redirectUri) return;
    saveCallbackBaseUrl(callbackBaseUrl);
    setClientId(inputId.trim());
    setIsRedirecting(true);
    const popup = window.open(
      "",
      "soundclaw-spotify-auth",
      "popup=yes,width=520,height=760,resizable=yes,scrollbars=yes",
    );
    if (!popup) {
      setIsRedirecting(false);
      return;
    }
    popup.document.write("<p style=\"font-family: sans-serif; padding: 24px;\">Spotify로 이동 중...</p>");
    await startSpotifyAuth(inputId.trim(), redirectUri, popup);
    setIsRedirecting(false);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-100">
        <code className="rounded bg-slate-900/70 px-1">{localhostOrigin}</code>에서
        Claw3D를 계속 열어두세요. Spotify가 ngrok 콜백으로 이동하면 인증 코드가
        이 창으로 돌아옵니다.
      </div>

      {!callbackLooksValid && callbackBaseUrl.trim().length > 0 && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          올바른 HTTPS ngrok URL을 입력하세요. 예: <code className="rounded bg-slate-900/70 px-1">https://your-id.ngrok-free.app</code>
        </div>
      )}

      {/* What you need card. */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-300">
          <span>⚠️</span> 연결 전에 필요한 것
        </h3>
        <ol className="space-y-3 text-sm text-slate-300">
          <li className="flex gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-300">1</span>
            <span>
              {" "}
              <a
                href="https://developer.spotify.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
              >
                developer.spotify.com/dashboard
              </a>{" "}
              에서 앱을 만들거나 기존 앱을 사용하세요.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-300">2</span>
            <span>
              Spotify 앱 설정에 이 <strong className="text-white">Redirect URI</strong>를 추가하세요:
            </span>
          </li>
          {redirectUri && (
            <li className="ml-7">
              <code className="block w-full rounded-lg border border-cyan-500/20 bg-slate-900 px-3 py-2 font-mono text-xs text-cyan-300 break-all">
                {redirectUri}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(redirectUri)}
                className="mt-1.5 text-xs text-slate-500 hover:text-slate-300"
              >
                클립보드에 복사
              </button>
            </li>
          )}
          <li className="flex gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-300">3</span>
            <span>아래에 공개 <strong className="text-white">ngrok URL</strong>을 붙여넣고, 여기 표시된 리디렉션 주소를 Spotify에 그대로 사용하세요.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-300">4</span>
            <span>인증하는 동안 이 로컬 오피스 탭을 열어두세요. 팝업 콜백이 이 페이지로 코드를 전달합니다.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-300">5</span>
            <span>재생 컨트롤을 사용하기 전에 Spotify가 최소 한 기기에서 열려 있고 재생 준비가 되어 있는지 확인하세요.</span>
          </li>
        </ol>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">
          ngrok 공개 URL
        </label>
        <input
          type="url"
          value={callbackBaseUrl}
          onChange={(e) => setCallbackBaseUrl(e.target.value)}
          placeholder="https://your-id.ngrok-free.app"
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 font-mono text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
        />
        <p className="text-xs text-slate-500">
          Spotify OAuth 콜백 브리지에만 사용됩니다. 앱 화면은 계속 {localhostOrigin}에서 열어두면 됩니다.
        </p>
      </div>

      {/* Client ID input. */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">
          Spotify Client ID
        </label>
        <input
          type="text"
          value={inputId}
          onChange={(e) => setInputId(e.target.value)}
          placeholder="e.g. 1a2b3c4d5e6f…"
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 font-mono text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
        />
        <p className="text-xs text-slate-500">
          브라우저에 로컬로 저장되며 Spotify 외 서버로 전송되지 않습니다.
        </p>
      </div>

      <button
        type="button"
        disabled={!inputId.trim() || !redirectUri || !callbackLooksValid || isRedirecting}
        onClick={handleConnect}
        className="w-full rounded-xl bg-[#1DB954] py-3 text-sm font-semibold text-black transition hover:bg-[#1ed760] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isRedirecting ? "Spotify 여는 중..." : "Spotify 연결"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Player view — shown after authentication
// ---------------------------------------------------------------------------

function PlayerView() {
  const {
    playerState,
    searchResults,
    searchQuery,
    isSearching,
    isLoadingPlayer,
    error,
    refreshPlayer,
    search,
    setSearchQuery,
    play,
    pause,
    resume,
    next,
    previous,
    volume,
    disconnect,
  } = useJukeboxStore();

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Poll player state every 5 seconds.
  useEffect(() => {
    refreshPlayer();
    const id = window.setInterval(() => { void refreshPlayer(); }, 5000);
    return () => window.clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      if (value.trim()) void search(value);
    }, 400);
  };

  const track = playerState?.track;
  const albumArt = track?.album.images[0]?.url ?? null;

  return (
    <div className="flex flex-col gap-4 p-6">
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Now playing. */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
          현재 재생 중
        </div>
        {isLoadingPlayer && !track ? (
          <div className="flex items-center gap-3 text-slate-500">
            <RunningAvatarLoader size={16} trackWidth={32} inline />
            <span className="text-sm">플레이어 불러오는 중...</span>
          </div>
        ) : track ? (
          <div className="flex items-center gap-4">
            {albumArt && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={albumArt}
                alt={track.album.name}
                className="h-14 w-14 shrink-0 rounded-lg object-cover shadow-lg"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-white">{track.name}</div>
              <div className="truncate text-sm text-slate-400">
                {track.artists.map((a) => a.name).join(", ")}
              </div>
              <div className="truncate text-xs text-slate-600">{track.album.name}</div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            활성 재생이 없습니다. 먼저 기기에서 Spotify를 열고 재생을 눌러주세요.
          </p>
        )}

        {/* Transport controls. */}
        <div className="mt-4 flex items-center justify-center gap-4">
          <ControlButton icon="⏮" onClick={() => void previous()} title="이전" />
          {playerState?.isPlaying ? (
            <ControlButton icon="⏸" onClick={() => void pause()} title="일시정지" large />
          ) : (
            <ControlButton icon="▶" onClick={() => void resume()} title="재생" large />
          )}
          <ControlButton icon="⏭" onClick={() => void next()} title="다음" />
        </div>

        {/* Volume. */}
        {playerState && (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-slate-500">🔈</span>
            <input
              type="range"
              min={0}
              max={100}
              value={playerState.volumePercent}
              onChange={(e) => void volume(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-cyan-400"
            />
            <span className="w-8 text-right font-mono text-xs text-slate-500">
              {playerState.volumePercent}%
            </span>
          </div>
        )}
      </div>

      {/* Search. */}
      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
          트랙 검색
        </div>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="아티스트, 곡 또는 앨범..."
            className="w-full rounded-xl border border-white/10 bg-slate-900 py-2.5 pl-4 pr-10 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <RunningAvatarLoader size={14} trackWidth={28} />
            </div>
          )}
        </div>

        {searchResults.length > 0 && (
          <ul className="mt-2 divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5 bg-slate-900/60">
            {searchResults.map((track) => (
              <SearchResult key={track.id} track={track} onPlay={() => void play(track.uri)} />
            ))}
          </ul>
        )}
      </div>

      {/* Disconnect. */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={disconnect}
          className="text-xs text-slate-600 underline underline-offset-2 hover:text-slate-400"
        >
          Spotify 연결 해제
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ControlButton({
  icon,
  onClick,
  title,
  large,
}: {
  icon: string;
  onClick: () => void;
  title: string;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex items-center justify-center rounded-full border border-white/10 text-white transition hover:bg-white/10 active:scale-95 ${
        large ? "h-11 w-11 text-lg" : "h-9 w-9 text-sm"
      }`}
    >
      {icon}
    </button>
  );
}

function SearchResult({
  track,
  onPlay,
}: {
  track: SpotifyTrack;
  onPlay: () => void;
}) {
  const art = track.album.images[track.album.images.length - 1]?.url ?? null;
  return (
    <li className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/5">
      {art && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art} alt={track.album.name} className="h-9 w-9 shrink-0 rounded object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">{track.name}</div>
        <div className="truncate text-xs text-slate-400">
          {track.artists.map((a) => a.name).join(", ")} · {track.album.name}
        </div>
      </div>
      <button
        type="button"
        onClick={onPlay}
        className="shrink-0 rounded-full border border-cyan-500/30 px-3 py-1 text-xs font-medium text-cyan-400 transition hover:bg-cyan-500/10"
      >
        재생
      </button>
    </li>
  );
}
