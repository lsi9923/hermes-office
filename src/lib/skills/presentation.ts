import type {
  RemovableSkillSource,
  SkillInstallOption,
  SkillStatusEntry,
} from "@/lib/skills/types";

export type SkillSourceGroupId = "workspace" | "built-in" | "installed" | "extra" | "other";

export type SkillSourceGroup = {
  id: SkillSourceGroupId;
  label: string;
  skills: SkillStatusEntry[];
};

export type SkillReadinessState =
  | "ready"
  | "needs-setup"
  | "unavailable"
  | "disabled-globally";

export type AgentSkillDisplayState = "ready" | "setup-required" | "not-supported";

export type AgentSkillsAccessMode = "all" | "none" | "selected";

const GROUP_DEFINITIONS: Array<{ id: Exclude<SkillSourceGroupId, "other">; label: string }> = [
  { id: "workspace", label: "워크스페이스 스킬" },
  { id: "built-in", label: "내장 스킬" },
  { id: "installed", label: "설치된 스킬" },
  { id: "extra", label: "추가 스킬" },
];

const WORKSPACE_SOURCES = new Set(["openclaw-workspace", "agents-skills-personal", "agents-skills-project"]);
const REMOVABLE_SOURCES = new Set<RemovableSkillSource>([
  "openclaw-managed",
  "openclaw-workspace",
]);

const trimNonEmpty = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const OS_LABELS: Record<string, string> = {
  darwin: "macOS",
  linux: "Linux",
  win32: "Windows",
  windows: "Windows",
};

const toOsLabel = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  return OS_LABELS[normalized] ?? value.trim();
};

const normalizeStringList = (values: string[] | undefined): string[] => {
  if (!Array.isArray(values)) {
    return [];
  }
  const normalized: string[] = [];
  for (const value of values) {
    const trimmed = trimNonEmpty(value);
    if (trimmed) {
      normalized.push(trimmed);
    }
  }
  return normalized;
};

export const normalizeAgentSkillsAllowlist = (values: string[] | undefined): string[] => {
  const normalized = normalizeStringList(values);
  return Array.from(new Set(normalized));
};

export const deriveAgentSkillsAccessMode = (
  values: string[] | undefined
): AgentSkillsAccessMode => {
  if (!Array.isArray(values)) {
    return "all";
  }
  return normalizeAgentSkillsAllowlist(values).length === 0 ? "none" : "selected";
};

export const buildAgentSkillsAllowlistSet = (values: string[] | undefined): Set<string> =>
  new Set(normalizeAgentSkillsAllowlist(values));

const resolveGroupId = (skill: SkillStatusEntry): SkillSourceGroupId => {
  const source = trimNonEmpty(skill.source) ?? "";
  const bundled = skill.bundled || source === "openclaw-bundled";
  if (bundled) return "built-in";
  if (WORKSPACE_SOURCES.has(source)) return "workspace";
  if (source === "openclaw-managed") return "installed";
  if (source === "openclaw-extra") return "extra";
  return "other";
};

export const groupSkillsBySource = (skills: SkillStatusEntry[]): SkillSourceGroup[] => {
  const grouped = new Map<SkillSourceGroupId, SkillSourceGroup>();
  for (const def of GROUP_DEFINITIONS) {
    grouped.set(def.id, { id: def.id, label: def.label, skills: [] });
  }
  grouped.set("other", { id: "other", label: "기타 스킬", skills: [] });

  for (const skill of skills) {
    const groupId = resolveGroupId(skill);
    grouped.get(groupId)?.skills.push(skill);
  }

  const ordered: SkillSourceGroup[] = [];
  for (const def of GROUP_DEFINITIONS) {
    const group = grouped.get(def.id);
    if (group && group.skills.length > 0) {
      ordered.push(group);
    }
  }
  const other = grouped.get("other");
  if (other && other.skills.length > 0) {
    ordered.push(other);
  }
  return ordered;
};

export const canRemoveSkillSource = (source: string): source is RemovableSkillSource => {
  const trimmed = trimNonEmpty(source);
  if (!trimmed) {
    return false;
  }
  return REMOVABLE_SOURCES.has(trimmed as RemovableSkillSource);
};

export const canRemoveSkill = (skill: SkillStatusEntry): boolean => {
  return canRemoveSkillSource(skill.source);
};

export const buildSkillMissingDetails = (skill: SkillStatusEntry): string[] => {
  const details: string[] = [];
  const bins = normalizeStringList(skill.missing.bins);
  if (bins.length > 0) {
    details.push(`없는 도구: ${bins.join(", ")}`);
  }

  const anyBins = normalizeStringList(skill.missing.anyBins);
  if (anyBins.length > 0) {
    details.push(`대체 도구 중 하나가 없습니다(아무거나 설치): ${anyBins.join(" | ")}`);
  }

  const env = normalizeStringList(skill.missing.env);
  if (env.length > 0) {
    details.push(`없는 환경 변수(게이트웨이 환경에 설정): ${env.join(", ")}`);
  }

  const config = normalizeStringList(skill.missing.config);
  if (config.length > 0) {
    details.push(`없는 설정값(openclaw.json에 설정): ${config.join(", ")}`);
  }

  const os = normalizeStringList(skill.missing.os);
  if (os.length > 0) {
    details.push(`필요한 OS: ${os.map((value) => toOsLabel(value)).join(", ")}`);
  }

  return details;
};

export const buildSkillReasons = (skill: SkillStatusEntry): string[] => {
  const reasons: string[] = [];
  if (skill.disabled) {
    reasons.push("비활성화됨");
  }
  if (skill.blockedByAllowlist) {
    reasons.push("허용 목록에 의해 차단됨");
  }
  if (normalizeStringList(skill.missing.bins).length > 0) {
    reasons.push("도구 없음");
  }
  if (normalizeStringList(skill.missing.anyBins).length > 0) {
    reasons.push("대체 도구 없음");
  }
  if (normalizeStringList(skill.missing.env).length > 0) {
    reasons.push("환경 변수 없음");
  }
  if (normalizeStringList(skill.missing.config).length > 0) {
    reasons.push("설정값 없음");
  }
  if (normalizeStringList(skill.missing.os).length > 0) {
    reasons.push("지원하지 않는 OS");
  }
  return reasons;
};

export const isSkillOsIncompatible = (skill: SkillStatusEntry): boolean => {
  return normalizeStringList(skill.missing.os).length > 0;
};

export const filterOsCompatibleSkills = (skills: SkillStatusEntry[]): SkillStatusEntry[] => {
  return skills.filter((skill) => !isSkillOsIncompatible(skill));
};

export const deriveSkillReadinessState = (skill: SkillStatusEntry): SkillReadinessState => {
  if (skill.disabled) {
    return "disabled-globally";
  }
  if (isSkillOsIncompatible(skill) || skill.blockedByAllowlist) {
    return "unavailable";
  }
  if (skill.eligible) {
    return "ready";
  }
  return "needs-setup";
};

export const deriveAgentSkillDisplayState = (
  readiness: SkillReadinessState
): AgentSkillDisplayState => {
  if (readiness === "ready") {
    return "ready";
  }
  if (readiness === "unavailable") {
    return "not-supported";
  }
  return "setup-required";
};

export const isBundledBlockedSkill = (skill: SkillStatusEntry): boolean => {
  const source = trimNonEmpty(skill.source) ?? "";
  return (skill.bundled || source === "openclaw-bundled") && !skill.eligible;
};

export const hasInstallableMissingBinary = (skill: SkillStatusEntry): boolean => {
  const installOptions = Array.isArray(skill.install) ? skill.install : [];
  if (installOptions.length === 0) {
    return false;
  }

  const missingBinarySet = new Set([
    ...normalizeStringList(skill.missing.bins),
    ...normalizeStringList(skill.missing.anyBins),
  ]);

  if (missingBinarySet.size === 0) {
    return false;
  }

  for (const option of installOptions) {
    const bins = normalizeStringList(option.bins);
    if (bins.length === 0) {
      return true;
    }
    for (const bin of bins) {
      if (missingBinarySet.has(bin)) {
        return true;
      }
    }
  }

  return false;
};

export const resolvePreferredInstallOption = (
  skill: SkillStatusEntry
): SkillInstallOption | null => {
  if (!hasInstallableMissingBinary(skill)) {
    return null;
  }
  const missingBinarySet = new Set([
    ...normalizeStringList(skill.missing.bins),
    ...normalizeStringList(skill.missing.anyBins),
  ]);
  for (const option of skill.install) {
    const bins = normalizeStringList(option.bins);
    if (bins.length === 0) {
      return option;
    }
    for (const bin of bins) {
      if (missingBinarySet.has(bin)) {
        return option;
      }
    }
  }
  return skill.install[0] ?? null;
};
