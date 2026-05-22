import { buildAgentMainSessionKey, type GatewayClient } from "@/lib/gateway/GatewayClient";
import {
  removeGatewayAgentFromConfigOnly,
  updateGatewayAgentOverrides,
} from "@/lib/gateway/agentConfig";
import type { SkillRemoveRequest, SkillRemoveResult } from "@/lib/skills/types";

const normalizeRequired = (value: string, field: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} 값이 필요합니다.`);
  }
  return trimmed;
};

const escapeForJsonString = (value: string) => JSON.stringify(value);

const resolveRunId = (payload: unknown): string => {
  if (!payload || typeof payload !== "object") {
    throw new Error("게이트웨이가 올바르지 않은 chat.send 응답을 반환했습니다.");
  }
  const record = payload as Record<string, unknown>;
  const runId = typeof record.runId === "string" ? record.runId.trim() : "";
  if (!runId) {
    throw new Error("게이트웨이가 올바르지 않은 chat.send 응답을 반환했습니다(runId 없음).");
  }
  return runId;
};

const resolveMainKey = async (client: GatewayClient): Promise<string> => {
  const result = (await client.call("agents.list", {})) as { mainKey?: unknown };
  return typeof result?.mainKey === "string" && result.mainKey.trim() ? result.mainKey.trim() : "main";
};

const buildSkillRemovalMessage = (params: {
  baseDir: string;
  allowedRoot: string;
}) => {
  return [
    "현재 작업공간 컨텍스트에서 설치된 스킬 디렉터리 하나만 삭제하세요.",
    "런타임 도구 또는 파일 도구를 사용할 수 있습니다.",
    `대상 디렉터리: ${escapeForJsonString(params.baseDir)}`,
    `허용된 루트: ${escapeForJsonString(params.allowedRoot)}`,
    "",
    "규칙:",
    "1. 허용된 루트 밖에서는 작업을 거부하세요.",
    "2. 허용된 루트 디렉터리 자체는 삭제하지 마세요.",
    "3. 대상 디렉터리가 있으면 삭제 전에 SKILL.md가 있는지 확인하세요.",
    "4. 대상 디렉터리가 없으면 다음 단어만 답하세요: REMOVED_ALREADY",
    "5. 삭제가 성공하면 다음 단어만 답하세요: REMOVED",
    "6. 다른 파일이나 디렉터리는 수정하지 마세요.",
  ].join("\n");
};

const resolveRemovalWorkspace = (request: SkillRemoveRequest): string => {
  return request.source === "openclaw-managed" ? request.managedSkillsDir : request.workspaceDir;
};

const resolveAllowedRoot = (request: SkillRemoveRequest): string => {
  return request.source === "openclaw-managed"
    ? request.managedSkillsDir
    : `${request.workspaceDir.replace(/[\\/]+$/, "")}/skills`;
};

export const removeSkillViaGatewayAgent = async (params: {
  client: GatewayClient;
  request: SkillRemoveRequest;
}): Promise<SkillRemoveResult> => {
  const skillKey = normalizeRequired(params.request.skillKey, "skillKey");
  const source = params.request.source;
  const baseDir = normalizeRequired(params.request.baseDir, "baseDir");
  const workspaceDir = normalizeRequired(params.request.workspaceDir, "workspaceDir");
  const managedSkillsDir = normalizeRequired(params.request.managedSkillsDir, "managedSkillsDir");
  const workspace = resolveRemovalWorkspace({
    ...params.request,
    skillKey,
    baseDir,
    workspaceDir,
    managedSkillsDir,
  });
  const allowedRoot = resolveAllowedRoot({
    ...params.request,
    skillKey,
    baseDir,
    workspaceDir,
    managedSkillsDir,
  });
  const removerName = `스킬 제거기 ${Date.now()}`;

  let removerAgentId: string | null = null;
  try {
    const created = (await params.client.call("agents.create", {
      name: removerName,
      workspace,
    })) as { agentId?: unknown };
    removerAgentId = typeof created?.agentId === "string" ? created.agentId.trim() : "";
    if (!removerAgentId) {
      throw new Error("게이트웨이가 올바르지 않은 agents.create 응답을 반환했습니다(agentId 없음).");
    }

    await updateGatewayAgentOverrides({
      client: params.client,
      agentId: removerAgentId,
      overrides: {
        tools: {
          alsoAllow: ["group:runtime", "group:fs"],
          deny: ["group:web"],
        },
      },
    });

    const mainKey = await resolveMainKey(params.client);
    const sessionKey = buildAgentMainSessionKey(removerAgentId, mainKey);
    const sendResult = await params.client.call("chat.send", {
      sessionKey,
      message: buildSkillRemovalMessage({ baseDir, allowedRoot }),
      deliver: false,
      idempotencyKey: `skill-remove:${skillKey}:${Date.now()}`,
    });
    const runId = resolveRunId(sendResult);
    await params.client.call("agent.wait", { runId, timeoutMs: 60_000 });

    return {
      removed: true,
      removedPath: baseDir,
      source,
    };
  } finally {
    if (removerAgentId) {
      try {
        await removeGatewayAgentFromConfigOnly({
          client: params.client,
          agentId: removerAgentId,
        });
      } catch {
        // Best-effort cleanup for temporary remover agents.
      }
    }
  }
};
