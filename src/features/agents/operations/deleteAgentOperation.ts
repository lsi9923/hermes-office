import type { GatewayClient } from "@/lib/gateway/GatewayClient";
import { fetchJson as defaultFetchJson } from "@/lib/http";
import {
  removeCronJobsForAgentWithBackup,
  restoreCronJobs,
  type CronJobRestoreInput,
} from "@/lib/cron/types";
import { deleteGatewayAgent } from "@/lib/gateway/agentConfig";

type FetchJson = typeof defaultFetchJson;

export type GatewayAgentStateMove = { from: string; to: string };

export type TrashAgentStateResult = {
  trashDir: string;
  moved: GatewayAgentStateMove[];
};

export type RestoreAgentStateResult = {
  restored: GatewayAgentStateMove[];
};

type DeleteAgentTransactionDeps = {
  trashAgentState: (agentId: string) => Promise<TrashAgentStateResult>;
  restoreAgentState: (agentId: string, trashDir: string) => Promise<RestoreAgentStateResult>;
  removeCronJobsForAgentWithBackup: (agentId: string) => Promise<CronJobRestoreInput[]>;
  restoreCronJobs: (jobs: CronJobRestoreInput[]) => Promise<void>;
  deleteGatewayAgent: (agentId: string) => Promise<void>;
  logError?: (message: string, error: unknown) => void;
};

export type DeleteAgentTransactionResult = {
  trashed: TrashAgentStateResult;
  restored: RestoreAgentStateResult | null;
};

const EMPTY_TRASH_RESULT: TrashAgentStateResult = {
  trashDir: "",
  moved: [],
};

const runDeleteFlow = async (
  deps: DeleteAgentTransactionDeps,
  agentId: string
): Promise<DeleteAgentTransactionResult> => {
  const trimmedAgentId = agentId.trim();
  if (!trimmedAgentId) {
    throw new Error("에이전트 ID가 필요합니다.");
  }

  let trashed = EMPTY_TRASH_RESULT;
  try {
    trashed = await deps.trashAgentState(trimmedAgentId);
  } catch (err) {
    deps.logError?.(
      "에이전트 작업공간/상태를 휴지통으로 옮기지 못했습니다. 게이트웨이 삭제만 계속합니다.",
      err
    );
  }
  let removedCronJobs: CronJobRestoreInput[] = [];

  try {
    removedCronJobs = await deps.removeCronJobsForAgentWithBackup(trimmedAgentId);
    await deps.deleteGatewayAgent(trimmedAgentId);
    return { trashed, restored: null };
  } catch (err) {
    if (removedCronJobs.length > 0) {
      try {
        await deps.restoreCronJobs(removedCronJobs);
      } catch (restoreCronErr) {
        deps.logError?.("삭제했던 Cron 작업을 복원하지 못했습니다.", restoreCronErr);
      }
    }
    if (trashed.moved.length > 0) {
      try {
        await deps.restoreAgentState(trimmedAgentId, trashed.trashDir);
      } catch (restoreErr) {
        deps.logError?.("휴지통으로 옮긴 에이전트 상태를 복원하지 못했습니다.", restoreErr);
      }
    }
    throw err;
  }
};

export const deleteAgentViaStudio = async (params: {
  client: GatewayClient;
  agentId: string;
  fetchJson?: FetchJson;
  logError?: (message: string, error: unknown) => void;
}): Promise<DeleteAgentTransactionResult> => {
  const fetchJson = params.fetchJson ?? defaultFetchJson;
  const logError = params.logError ?? ((message, error) => console.error(message, error));

  return runDeleteFlow(
    {
      trashAgentState: async (agentId) => {
        const { result } = await fetchJson<{ result: TrashAgentStateResult }>(
          "/api/gateway/agent-state",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ agentId }),
          }
        );
        return result;
      },
      restoreAgentState: async (agentId, trashDir) => {
        const { result } = await fetchJson<{ result: RestoreAgentStateResult }>(
          "/api/gateway/agent-state",
          {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ agentId, trashDir }),
          }
        );
        return result;
      },
      removeCronJobsForAgentWithBackup: async (agentId) => {
        return await removeCronJobsForAgentWithBackup(params.client, agentId);
      },
      restoreCronJobs: async (jobs) => {
        await restoreCronJobs(params.client, jobs);
      },
      deleteGatewayAgent: async (agentId) => {
        await deleteGatewayAgent({ client: params.client, agentId });
      },
      logError,
    },
    params.agentId
  );
};

export const deleteAgentRecordViaStudio = async (params: {
  client: GatewayClient;
  agentId: string;
  logError?: (message: string, error: unknown) => void;
}): Promise<void> => {
  const trimmedAgentId = params.agentId.trim();
  if (!trimmedAgentId) {
    throw new Error("에이전트 ID가 필요합니다.");
  }
  const logError = params.logError ?? ((message, error) => console.error(message, error));
  let removedCronJobs: CronJobRestoreInput[] = [];
  try {
    removedCronJobs = await removeCronJobsForAgentWithBackup(params.client, trimmedAgentId);
    await deleteGatewayAgent({ client: params.client, agentId: trimmedAgentId });
  } catch (err) {
    if (removedCronJobs.length > 0) {
      try {
        await restoreCronJobs(params.client, removedCronJobs);
      } catch (restoreErr) {
        logError("삭제했던 Cron 작업을 복원하지 못했습니다.", restoreErr);
      }
    }
    throw err;
  }
};

export const trashAgentStateViaStudio = async (params: {
  agentId: string;
  fetchJson?: FetchJson;
}): Promise<TrashAgentStateResult> => {
  const trimmedAgentId = params.agentId.trim();
  if (!trimmedAgentId) {
    throw new Error("에이전트 ID가 필요합니다.");
  }
  const fetchJson = params.fetchJson ?? defaultFetchJson;
  const { result } = await fetchJson<{ result: TrashAgentStateResult }>(
    "/api/gateway/agent-state",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: trimmedAgentId }),
    }
  );
  return result;
};
