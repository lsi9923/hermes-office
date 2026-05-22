"use client";

type JukeboxDisabledPanelProps = {
  onClose: () => void;
  onInstall: () => void;
};

export function JukeboxDisabledPanel({ onClose, onInstall }: JukeboxDisabledPanelProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-sm rounded-3xl border border-slate-700/40 bg-slate-950/95 p-8 text-center shadow-2xl">
        {/* Jukebox icon. */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700/40 bg-slate-800/60 text-4xl">
          🎵
        </div>

        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
          Soundclaw
        </div>
        <h2 className="mt-1 text-xl font-semibold text-white">주크박스가 설치되지 않았습니다</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          <span className="text-cyan-400">SOUNDCLAW</span> 스킬을 설치하면 에이전트가
          오피스 주크박스에서 바로 음악을 고르고 재생할 수 있습니다.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 active:scale-95"
            onClick={onInstall}
          >
            SOUNDCLAW 스킬 설치
          </button>
          <button
            type="button"
            className="rounded-xl border border-slate-700/40 px-5 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800/50"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
