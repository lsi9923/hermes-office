export type CreateBootstrapFacts = {
  completion: { agentId: string; agentName: string };
  createdAgent: { agentId: string; sessionKey: string } | null;
  bootstrapErrorMessage: string | null;
  focusedAgentId: string | null;
};

export type CreateBootstrapCommand =
  | { kind: "set-create-modal-error"; message: string | null }
  | { kind: "set-global-error"; message: string }
  | { kind: "set-create-block"; value: null }
  | { kind: "set-create-modal-open"; open: boolean }
  | { kind: "flush-pending-draft"; agentId: string | null }
  | { kind: "select-agent"; agentId: string }
  | { kind: "set-inspect-sidebar"; agentId: string; tab: "capabilities" }
  | { kind: "set-mobile-pane"; pane: "chat" };

const buildMissingCreatedAgentMessage = (agentName: string): string =>
  `"${agentName}" 에이전트를 만들었지만 스튜디오가 아직 불러오지 못했습니다.`;

const buildBootstrapGlobalErrorMessage = (errorMessage: string): string =>
  `에이전트는 생성됐지만 기본 권한을 적용하지 못했습니다: ${errorMessage}`;

const buildBootstrapModalErrorMessage = (errorMessage: string): string =>
  `기본 권한 적용 실패: ${errorMessage}`;

export function planCreateAgentBootstrapCommands(
  facts: CreateBootstrapFacts
): CreateBootstrapCommand[] {
  if (!facts.createdAgent) {
    const message = buildMissingCreatedAgentMessage(facts.completion.agentName);
    return [
      { kind: "set-create-modal-error", message },
      { kind: "set-global-error", message },
      { kind: "set-create-block", value: null },
      { kind: "set-create-modal-open", open: false },
    ];
  }

  const commands: CreateBootstrapCommand[] = [];
  if (facts.bootstrapErrorMessage) {
    commands.push({
      kind: "set-global-error",
      message: buildBootstrapGlobalErrorMessage(facts.bootstrapErrorMessage),
    });
  }
  commands.push({ kind: "flush-pending-draft", agentId: facts.focusedAgentId });
  commands.push({ kind: "select-agent", agentId: facts.completion.agentId });
  commands.push({
    kind: "set-inspect-sidebar",
    agentId: facts.completion.agentId,
    tab: "capabilities",
  });
  commands.push({ kind: "set-mobile-pane", pane: "chat" });
  commands.push({
    kind: "set-create-modal-error",
    message: facts.bootstrapErrorMessage
      ? buildBootstrapModalErrorMessage(facts.bootstrapErrorMessage)
      : null,
  });
  commands.push({ kind: "set-create-block", value: null });
  commands.push({ kind: "set-create-modal-open", open: false });
  return commands;
}
