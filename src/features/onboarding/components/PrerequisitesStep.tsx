import { CheckCircle2, ExternalLink } from "lucide-react";

const prerequisites = [
  {
    label: "OpenClaw 설치",
    detail: "npm, pnpm 또는 소스에서 설치하세요",
    link: "https://docs.openclaw.ai",
    linkLabel: "설치 문서",
  },
  {
    label: "게이트웨이 실행",
    detail: "다음 명령으로 시작하세요: openclaw gateway start",
    command: "openclaw gateway start",
  },
  {
    label: "게이트웨이 URL 및 토큰",
    detail: "~/.openclaw/openclaw.json 또는 원격 설정에서 확인할 수 있습니다",
  },
  {
    label: "Node.js 20+",
    detail: "Claw3D를 로컬에서 실행하려면 필요합니다",
    link: "https://nodejs.org",
    linkLabel: "Node.js 다운로드",
  },
] as const;

export const PrerequisitesStep = () => (
  <div className="space-y-2.5">
    <p className="text-[13px] leading-5 text-white/70">
      연결하기 전에 아래 항목이 준비되어 있는지 확인하세요. 이미 OpenClaw가
      실행 중이면 이 단계는 건너뛰어도 됩니다.
    </p>

    <div className="space-y-1.5">
      {prerequisites.map(({ label, detail, ...rest }) => (
        <div
          key={label}
          className="flex gap-2.5 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2"
        >
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/30" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-white">{label}</p>
            <p className="mt-0.5 text-[10px] leading-4 text-white/55">{detail}</p>
            {"command" in rest ? (
              <code className="mt-1 block rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                {rest.command}
              </code>
            ) : null}
            {"link" in rest && rest.link ? (
              <a
                href={rest.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-[10px] leading-4 text-amber-300 hover:text-amber-200"
              >
                {rest.linkLabel ?? "자세히 보기"}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        </div>
      ))}
    </div>

    <p className="text-[10px] leading-4 text-white/40">
      도움이 필요하면{" "}
      <a
        href="https://docs.openclaw.ai"
        target="_blank"
        rel="noopener noreferrer"
        className="text-amber-300/70 hover:text-amber-200"
      >
        docs.openclaw.ai
      </a>
      를 확인하거나{" "}
      <a
        href="https://discord.com/invite/clawd"
        target="_blank"
        rel="noopener noreferrer"
        className="text-amber-300/70 hover:text-amber-200"
      >
        Discord에 참여하세요
      </a>
      .
    </p>
  </div>
);
