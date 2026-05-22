export const AGENT_FILE_NAMES = [
  "AGENTS.md",
  "SOUL.md",
  "IDENTITY.md",
  "USER.md",
  "TOOLS.md",
  "HEARTBEAT.md",
  "MEMORY.md",
] as const;

export type AgentFileName = (typeof AGENT_FILE_NAMES)[number];

export const PERSONALITY_FILE_NAMES = [
  "SOUL.md",
  "AGENTS.md",
  "USER.md",
  "IDENTITY.md",
] as const satisfies readonly AgentFileName[];

export type PersonalityFileName = (typeof PERSONALITY_FILE_NAMES)[number];

export const PERSONALITY_FILE_LABELS: Record<PersonalityFileName, string> = {
  "SOUL.md": "페르소나",
  "AGENTS.md": "지시사항",
  "USER.md": "사용자 맥락",
  "IDENTITY.md": "정체성",
};

export const isAgentFileName = (value: string): value is AgentFileName =>
  AGENT_FILE_NAMES.includes(value as AgentFileName);

export const AGENT_FILE_META: Record<AgentFileName, { title: string; hint: string }> = {
  "AGENTS.md": {
    title: "AGENTS.md",
    hint: "작동 지침, 우선순위, 규칙입니다.",
  },
  "SOUL.md": {
    title: "SOUL.md",
    hint: "페르소나, 말투, 경계입니다.",
  },
  "IDENTITY.md": {
    title: "IDENTITY.md",
    hint: "이름, 분위기, 이모지입니다.",
  },
  "USER.md": {
    title: "USER.md",
    hint: "사용자 프로필과 선호입니다.",
  },
  "TOOLS.md": {
    title: "TOOLS.md",
    hint: "로컬 도구 메모와 규칙입니다.",
  },
  "HEARTBEAT.md": {
    title: "HEARTBEAT.md",
    hint: "하트비트 실행용 짧은 체크리스트입니다.",
  },
  "MEMORY.md": {
    title: "MEMORY.md",
    hint: "이 에이전트의 장기 기억입니다.",
  },
};

export const AGENT_FILE_PLACEHOLDERS: Record<AgentFileName, string> = {
  "AGENTS.md": "이 에이전트가 어떻게 일해야 하나요? 우선순위, 규칙, 습관을 적어주세요.",
  "SOUL.md": "말투, 성격, 경계, 응답 방식입니다.",
  "IDENTITY.md": "이름, 분위기, 이모지, 한 줄 정체성입니다.",
  "USER.md": "사용자를 어떻게 불러야 하나요? 선호와 맥락을 적어주세요.",
  "TOOLS.md": "로컬 도구 메모, 규칙, 단축 팁입니다.",
  "HEARTBEAT.md": "주기 실행을 위한 짧은 체크리스트입니다.",
  "MEMORY.md": "기억해야 할 사실, 결정, 선호입니다.",
};

export const createAgentFilesState = () =>
  Object.fromEntries(
    AGENT_FILE_NAMES.map((name) => [name, { content: "", exists: false, path: null, workspace: null }])
  ) as Record<AgentFileName, { content: string; exists: boolean; path: string | null; workspace: string | null }>;
