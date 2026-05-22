import { buildCompanyAgentBlueprints } from "@/features/company-builder/planning";
import {
  buildCompanyRolePermissionsDraft,
} from "@/features/company-builder/operations/companyBuilderGateway";
import type {
  CompanyBuilderInput,
  CompanyBuilderPlan,
} from "@/features/company-builder/types";
import type { AgentFileName } from "@/lib/agents/agentFiles";
import type { CommandModeId } from "@/features/agents/operations/agentPermissionsOperation";

type CreatedAgentRecord = {
  agentId: string;
  commandMode: CommandModeId;
};

export async function runCompanyBootstrapOperation(params: {
  input: CompanyBuilderInput;
  plan: CompanyBuilderPlan;
  existingAgentIds?: string[];
  deleteExistingAgent?: (agentId: string) => Promise<void>;
  clearReusedAgentState?: (agentId: string) => Promise<void>;
  renameAgent?: (agentId: string, name: string) => Promise<void>;
  onExistingAgentDeleted?: (agentId: string) => void;
  createAgent: (name: string) => Promise<{ id: string }>;
  writeAgentFiles: (
    agentId: string,
    files: Record<AgentFileName, string>,
  ) => Promise<void>;
  saveAvatar: (agentId: string) => void;
  loadAgents: () => Promise<void>;
  findAgentById: (agentId: string) => { agentId: string; sessionKey: string } | null;
  resetAgentSession?: (agentId: string, sessionKey: string) => Promise<void>;
  applyPermissions: (
    agentId: string,
    sessionKey: string,
    commandMode: CommandModeId,
  ) => Promise<void>;
  persistSnapshot: (input: CompanyBuilderInput, plan: CompanyBuilderPlan) => void;
  setOfficeTitle: (title: string) => void;
  selectAgent: (agentId: string) => void;
  setStatusLine: (value: string | null) => void;
}): Promise<string[]> {
  const blueprints = buildCompanyAgentBlueprints(params.plan);
  const existingAgentIds = params.existingAgentIds ?? [];
  const reusableAgentId = existingAgentIds.includes("main") && blueprints[0] ? "main" : null;
  const deletableAgentIds = existingAgentIds.filter((agentId) => agentId !== reusableAgentId);

  if (deletableAgentIds.length > 0 && params.deleteExistingAgent) {
    params.setStatusLine(
      deletableAgentIds.length === 1
        ? "현재 에이전트를 교체하는 중입니다."
        : `현재 에이전트 ${deletableAgentIds.length}개를 교체하는 중입니다.`,
    );
    for (const agentId of deletableAgentIds) {
      await params.deleteExistingAgent(agentId);
      params.onExistingAgentDeleted?.(agentId);
    }
  }
  const createdAgents: CreatedAgentRecord[] = [];
  const remainingBlueprints = [...blueprints];

  if (reusableAgentId && remainingBlueprints[0]) {
    const firstBlueprint = remainingBlueprints.shift();
    if (firstBlueprint) {
      if (params.clearReusedAgentState) {
        params.setStatusLine("기존 메인 에이전트 상태를 정리하는 중입니다.");
        await params.clearReusedAgentState(reusableAgentId);
      }
      params.setStatusLine(`메인을 ${firstBlueprint.agentName}(으)로 재구성하는 중입니다.`);
      await params.renameAgent?.(reusableAgentId, firstBlueprint.agentName);
      await params.writeAgentFiles(reusableAgentId, firstBlueprint.files);
      params.saveAvatar(reusableAgentId);
      createdAgents.push({
        agentId: reusableAgentId,
        commandMode: firstBlueprint.role.commandMode,
      });
    }
  }

  for (const blueprint of remainingBlueprints) {
    params.setStatusLine(`${blueprint.agentName} 생성 중입니다.`);
    const created = await params.createAgent(blueprint.agentName);
    createdAgents.push({
      agentId: created.id,
      commandMode: blueprint.role.commandMode,
    });
    await params.writeAgentFiles(created.id, blueprint.files);
    params.saveAvatar(created.id);
  }

  params.setStatusLine("새 회사를 오피스에 동기화하는 중입니다.");
  await params.loadAgents();

  for (const createdAgent of createdAgents) {
    const liveAgent = params.findAgentById(createdAgent.agentId);
    if (!liveAgent?.sessionKey) continue;
    await params.applyPermissions(
      liveAgent.agentId,
      liveAgent.sessionKey,
      createdAgent.commandMode,
    );
  }

  if (reusableAgentId && params.resetAgentSession) {
    const reusableAgent = params.findAgentById(reusableAgentId);
    if (reusableAgent?.sessionKey) {
      params.setStatusLine("첫 역할 세션을 새로고침하는 중입니다.");
      await params.resetAgentSession(reusableAgentId, reusableAgent.sessionKey);
    }
  }

  params.persistSnapshot(params.input, params.plan);
  params.setOfficeTitle(`${params.plan.companyName} 본부`);
  if (createdAgents[0]?.agentId) {
    params.selectAgent(createdAgents[0].agentId);
  }
  params.setStatusLine(null);
  return createdAgents.map((entry) => entry.agentId);
}

export { buildCompanyRolePermissionsDraft };
