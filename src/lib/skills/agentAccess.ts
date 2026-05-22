import type { GatewayClient } from "@/lib/gateway/GatewayClient";
import {
  readGatewayAgentSkillsAllowlist,
  updateGatewayAgentSkillsAllowlist,
} from "@/lib/gateway/agentConfig";
import { filterOsCompatibleSkills } from "@/lib/skills/presentation";
import type { SkillStatusEntry } from "@/lib/skills/types";

const normalizeSkillName = (value: string): string => value.trim();

export const resolveVisibleAgentSkillNames = (skills: SkillStatusEntry[]): string[] => {
  return Array.from(
    new Set(
      filterOsCompatibleSkills(skills)
        .map((entry) => normalizeSkillName(entry.name))
        .filter((name) => name.length > 0)
    )
  );
};

export const setAgentSkillEnabled = async (params: {
  client: GatewayClient;
  agentId: string;
  skillName: string;
  enabled: boolean;
  visibleSkills: SkillStatusEntry[];
}): Promise<void> => {
  const resolvedSkillName = normalizeSkillName(params.skillName);
  if (!resolvedSkillName) {
    throw new Error("스킬 이름이 필요합니다.");
  }

  const visibleSkillNames = resolveVisibleAgentSkillNames(params.visibleSkills);
  if (visibleSkillNames.length === 0) {
    throw new Error("스킬 접근 권한을 업데이트할 수 없습니다: 이 에이전트에서 사용할 수 있는 스킬이 없습니다.");
  }

  const existingAllowlist = await readGatewayAgentSkillsAllowlist({
    client: params.client,
    agentId: params.agentId,
  });
  const baseline = existingAllowlist ?? visibleSkillNames;
  const next = new Set(
    baseline.map((value) => normalizeSkillName(value)).filter((value) => value.length > 0)
  );

  if (params.enabled) {
    next.add(resolvedSkillName);
  } else {
    next.delete(resolvedSkillName);
  }

  await updateGatewayAgentSkillsAllowlist({
    client: params.client,
    agentId: params.agentId,
    mode: "allowlist",
    skillNames: [...next],
  });
};
