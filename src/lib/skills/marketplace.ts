import {
  buildSkillMissingDetails,
  canRemoveSkill,
  deriveSkillReadinessState,
  groupSkillsBySource,
  hasInstallableMissingBinary,
  type SkillReadinessState,
} from "@/lib/skills/presentation";
import { getPackagedSkillBySkillKey } from "@/lib/skills/catalog";
import type { SkillStatusEntry } from "@/lib/skills/types";

export type SkillMarketplaceCollectionId =
  | "claw3d"
  | "featured"
  | "installed"
  | "setup-required"
  | "built-in"
  | "workspace"
  | "extra"
  | "other";

export type SkillMarketplaceMetadata = {
  category: string;
  tagline: string;
  trustLabel: string;
  capabilities: string[];
  featured?: boolean;
  editorBadge?: string;
  rating?: number;
  installs?: number;
  poweredByName?: string;
  poweredByUrl?: string;
  hideStats?: boolean;
};

export type SkillMarketplaceEntry = {
  skill: SkillStatusEntry;
  readiness: SkillReadinessState;
  metadata: SkillMarketplaceMetadata;
  installable: boolean;
  removable: boolean;
  missingDetails: string[];
};

const SKILL_MARKETPLACE_OVERRIDES: Record<
  string,
  Partial<SkillMarketplaceMetadata>
> = {
  github: {
    category: "엔지니어링",
    tagline: "저장소 작업을 한 단계짜리 팀원 워크플로로 바꿉니다.",
    capabilities: [
      "풀 리퀘스트 지원",
      "이슈 맥락",
      "저장소 작업",
    ],
    featured: true,
    editorBadge: "인기",
    rating: 4.9,
    installs: 18240,
  },
  figma: {
    category: "디자인",
    tagline: "디자인 파일, 사양, 구현 맥락을 연결합니다.",
    capabilities: ["디자인 맥락", "에셋 조회", "사양 전달"],
    featured: true,
    editorBadge: "추천",
    rating: 4.8,
    installs: 9640,
  },
  slack: {
    category: "커뮤니케이션",
    tagline: "에이전트를 팀 채널과 알림에 연결합니다.",
    capabilities: [
      "채널 업데이트",
      "메시지 초안",
      "알림 라우팅",
    ],
    featured: true,
    rating: 4.7,
    installs: 14110,
  },
  linear: {
    category: "기획",
    tagline:
      "이슈 추적과 실행 루프를 에이전트 워크플로에 직접 넣습니다.",
    capabilities: ["이슈 조회", "상태 업데이트", "기획 워크플로"],
    featured: true,
    rating: 4.7,
    installs: 11980,
  },
  "todo-board": {
    category: "생산성",
    tagline:
      "에이전트에게 막힌 작업 추적이 가능한 공유 TODO 보드를 제공합니다.",
    capabilities: [
      "작업 기록",
      "막힌 항목 추적",
      "공유 워크스페이스 상태",
    ],
    featured: true,
    editorBadge: "Claw3D 테스트",
    hideStats: true,
  },
  "task-manager": {
    category: "생산성",
    tagline:
      "실행 가능한 요청을 Claw3D 칸반 보드의 영구 공유 작업으로 바꿉니다.",
    capabilities: [
      "자동 작업 기록",
      "작업 수명 주기 추적",
      "공유 칸반 상태",
    ],
    featured: true,
    editorBadge: "칸반 핵심",
    hideStats: true,
  },
  soundclaw: {
    category: "오디오",
    tagline:
      "에이전트가 Spotify를 검색하고 재생을 제어하며 현재 채널에 음악 링크를 보낼 수 있게 합니다.",
    capabilities: ["Spotify 검색", "재생 제어", "같은 채널 링크 공유"],
    featured: true,
    editorBadge: "오피스 데모",
    hideStats: true,
  },
};

const hashString = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const titleCaseWords = (value: string): string =>
  value
    .split(/[\s_-]+/)
    .filter((part) => part.length > 0)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const buildFallbackCapabilities = (skill: SkillStatusEntry): string[] => {
  const capabilities: string[] = [];
  if (skill.primaryEnv) {
    capabilities.push(`${skill.primaryEnv} 환경 변수를 사용합니다.`);
  }
  if (skill.install.length > 0) {
    capabilities.push("안내형 의존성 설치를 지원합니다.");
  }
  if (skill.always) {
    capabilities.push("정책상 항상 사용할 수 있습니다.");
  }
  if (skill.homepage) {
    capabilities.push("외부 문서가 있습니다.");
  }
  if (capabilities.length === 0) {
    capabilities.push("재사용 가능한 운영 워크플로입니다.");
  }
  return capabilities.slice(0, 3);
};

const buildFallbackMetadata = (
  skill: SkillStatusEntry,
): SkillMarketplaceMetadata => {
  const normalizedKey = skill.skillKey.trim().toLowerCase();
  const source = skill.source.trim();
  const seed = hashString(`${normalizedKey}:${source}`);
  const category =
    skill.bundled || source === "openclaw-bundled"
      ? "내장"
      : source === "openclaw-managed"
        ? "설치됨"
        : source === "openclaw-workspace"
          ? "워크스페이스"
          : source === "openclaw-extra"
            ? "커뮤니티"
            : "자동화";
  const trustLabel =
    skill.bundled || source === "openclaw-bundled"
      ? "검증됨"
      : source === "openclaw-managed"
        ? "관리됨"
        : source === "openclaw-workspace"
          ? "워크스페이스"
          : "커뮤니티";
  return {
    category,
    tagline:
      skill.description.trim() ||
      `${titleCaseWords(skill.name)} 기능 팩입니다.`,
    trustLabel,
    capabilities: buildFallbackCapabilities(skill),
    featured: skill.bundled || source === "openclaw-managed",
    rating: 4.2 + (seed % 7) / 10,
    installs: 400 + (seed % 9500),
  };
};

export const resolveSkillMarketplaceMetadata = (
  skill: SkillStatusEntry,
): SkillMarketplaceMetadata => {
  const normalizedKey = skill.skillKey.trim().toLowerCase();
  const fallback = buildFallbackMetadata(skill);
  const override = SKILL_MARKETPLACE_OVERRIDES[normalizedKey];
  const packagedSkill = getPackagedSkillBySkillKey(skill.skillKey);
  if (!override) {
    return {
      ...fallback,
      poweredByName: packagedSkill?.creatorName,
      poweredByUrl: packagedSkill?.creatorUrl,
      hideStats: Boolean(packagedSkill),
    };
  }
  return {
    ...fallback,
    ...override,
    capabilities: override.capabilities ?? fallback.capabilities,
    poweredByName: packagedSkill?.creatorName,
    poweredByUrl: packagedSkill?.creatorUrl,
    hideStats: override.hideStats ?? Boolean(packagedSkill),
  };
};

export const buildSkillMarketplaceEntry = (
  skill: SkillStatusEntry,
): SkillMarketplaceEntry => {
  const packagedSkill = getPackagedSkillBySkillKey(skill.skillKey);
  const missingDetails = buildSkillMissingDetails(skill);
  if (packagedSkill && !skill.baseDir.trim()) {
    missingDetails.unshift(
      "패키지된 Claw3D 스킬을 설치해 게이트웨이에서 사용할 수 있게 하세요.",
    );
  }
  return {
    skill,
    readiness: deriveSkillReadinessState(skill),
    metadata: resolveSkillMarketplaceMetadata(skill),
    installable: hasInstallableMissingBinary(skill),
    removable: canRemoveSkill(skill),
    missingDetails,
  };
};

export const buildSkillMarketplaceCollections = (
  skills: SkillStatusEntry[],
): Array<{
  id: SkillMarketplaceCollectionId;
  label: string;
  entries: SkillMarketplaceEntry[];
}> => {
  const entries = skills.map(buildSkillMarketplaceEntry);
  const sourceGroups = groupSkillsBySource(skills);
  const collections: Array<{
    id: SkillMarketplaceCollectionId;
    label: string;
    entries: SkillMarketplaceEntry[];
  }> = [];

  const featured = entries
    .filter((entry) => entry.metadata.featured)
    .slice(0, 6);
  if (featured.length > 0) {
    collections.push({ id: "featured", label: "추천", entries: featured });
  }

  const claw3d = entries.filter((entry) =>
    getPackagedSkillBySkillKey(entry.skill.skillKey),
  );
  if (claw3d.length > 0) {
    collections.push({ id: "claw3d", label: "Claw3D", entries: claw3d });
  }

  const installed = entries.filter(
    (entry) => entry.readiness === "ready" || entry.skill.disabled,
  );
  if (installed.length > 0) {
    collections.push({
      id: "installed",
      label: "설치됨",
      entries: installed,
    });
  }

  const setupRequired = entries.filter(
    (entry) => entry.readiness === "needs-setup",
  );
  if (setupRequired.length > 0) {
    collections.push({
      id: "setup-required",
      label: "설정 필요",
      entries: setupRequired,
    });
  }

  for (const group of sourceGroups) {
    const groupEntries = group.skills.map(buildSkillMarketplaceEntry);
    const groupId =
      group.id === "built-in" ||
      group.id === "workspace" ||
      group.id === "extra" ||
      group.id === "other"
        ? group.id
        : "installed";
    collections.push({
      id: groupId,
      label: group.label,
      entries: groupEntries,
    });
  }

  return collections;
};
