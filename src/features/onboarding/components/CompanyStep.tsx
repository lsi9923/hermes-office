import { Building2, Sparkles, Users, Wand2 } from "lucide-react";

export type CompanyStepProps = {
  connected: boolean;
  agentCount: number;
  onOpenCompanyBuilder: () => void;
};

export const CompanyStep = ({
  connected,
  agentCount,
  onOpenCompanyBuilder,
}: CompanyStepProps) => {
  const canOpenBuilder = connected && agentCount > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
            <Building2 className="h-5 w-5 text-amber-300" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">AI로 회사 구조 만들기</p>
            <p className="text-xs leading-5 text-white/60">
              회사가 하는 일을 설명하면 Claw3D가 전문 에이전트, 작업 파일, 역할
              지침이 포함된 조직 구조로 바꿔줍니다.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {[
          {
            icon: Sparkles,
            title: "요청 정리",
            description: "연결된 런타임으로 회사 생성 프롬프트를 더 명확하게 다듬습니다.",
          },
          {
            icon: Users,
            title: "팀 생성",
            description: "역할, 책임, 인수인계 흐름이 담긴 실용적인 조직도를 만듭니다.",
          },
          {
            icon: Wand2,
            title: "전체 생성",
            description: "에이전트 파일을 작성하고 연결된 런타임에 팀을 바로 생성합니다.",
          },
        ].map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-md border border-white/8 bg-white/[0.02] px-3 py-3"
          >
            <Icon className="h-4 w-4 text-white/70" />
            <p className="mt-2 text-[11px] font-semibold text-white">{title}</p>
            <p className="mt-1 text-[10px] leading-4 text-white/45">{description}</p>
          </div>
        ))}
      </div>

      <div className="pt-4">
        {canOpenBuilder ? (
          <div className="flex justify-center">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-[#1a1206] transition-colors hover:bg-amber-400"
              onClick={onOpenCompanyBuilder}
            >
              <Sparkles className="h-3.5 w-3.5" />
              회사 빌더 열기
            </button>
          </div>
        ) : (
          <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100/80">
            AI로 회사를 생성하려면 런타임에 연결하고 계획 담당 에이전트를 최소
            1개 이상 준비하세요.
          </div>
        )}
      </div>
    </div>
  );
};
