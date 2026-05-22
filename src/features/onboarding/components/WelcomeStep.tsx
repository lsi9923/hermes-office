import { Building2, Eye, MessageSquare, Users } from "lucide-react";

const features = [
  {
    icon: Eye,
    title: "에이전트 작업 보기",
    description: "공유 3D 오피스에서 AI 에이전트가 움직이는 모습을 실시간으로 확인",
  },
  {
    icon: Users,
    title: "팀 관리",
    description: "한곳에서 에이전트를 만들고 설정하고 상태를 모니터링",
  },
  {
    icon: MessageSquare,
    title: "채팅 및 승인",
    description: "에이전트와 대화하고 실행 명령을 승인하며 결과를 검토",
  },
  {
    icon: Building2,
    title: "오피스 구성",
    description: "방, 책상, 전체 오피스 배치를 원하는 형태로 조정",
  },
] as const;

export const WelcomeStep = () => (
  <div className="space-y-5">
    <div className="space-y-2">
      <p className="text-sm leading-relaxed text-white/80">
        Claw3D는 AI 자동화를{" "}
        <span className="font-medium text-white">눈으로 보는 작업 공간</span>으로
        바꿉니다. 공유 3D 환경에서 AI 에이전트가 협업하고, 코딩하고,
        테스트하고, 작업을 실행하는 오피스입니다.
      </p>
      <p className="text-sm text-white/60">
        이 마법사는 런타임 게이트웨이에 연결하고 약 2분 안에 시작할 수 있도록
        도와줍니다.
      </p>
    </div>

    <div className="grid grid-cols-2 gap-3">
      {features.map(({ icon: Icon, title, description }) => (
        <div
          key={title}
          className="rounded-lg border border-white/8 bg-white/[0.03] px-3.5 py-3"
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-amber-300" />
            <span className="text-xs font-semibold text-white">{title}</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-white/55">
            {description}
          </p>
        </div>
      ))}
    </div>
  </div>
);
