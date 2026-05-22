export type CuratedVoiceOption = {
  id: string | null;
  label: string;
  description: string;
};

export const CURATED_ELEVENLABS_VOICES: CuratedVoiceOption[] = [
  {
    id: null,
    label: "Rachel",
    description: "균형 잡힌 대화형 음성입니다.",
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    label: "Bella",
    description: "따뜻하고 친근한 음성입니다.",
  },
  {
    id: "MF3mGyEYCl7XYWbV9V6O",
    label: "Elli",
    description: "또렷하고 밝은 음성입니다.",
  },
  {
    id: "ErXwobaYiN019PkySvjV",
    label: "Antoni",
    description: "차분하고 전문적인 음성입니다.",
  },
  {
    id: "TxGEqnHWrfWFTfGW9XjX",
    label: "Josh",
    description: "안정적이고 자신감 있는 음성입니다.",
  },
  {
    id: "pNInz6obpgDQGcFmaJgB",
    label: "Adam",
    description: "낮고 권위 있는 음성입니다.",
  },
];
