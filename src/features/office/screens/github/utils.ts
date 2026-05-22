"use client";

export const GITHUB_RECORDING_PRIVACY_MASK_ACTIVE = false;

export const maskGitHubRecordingText = (
  value: string | null | undefined,
): string => {
  return value ?? "";
};

export const formatRelativeTime = (value: string | null): string => {
  if (!value) return "업데이트 시간 알 수 없음";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  const deltaMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (deltaMinutes < 1) return "방금 업데이트됨";
  if (deltaMinutes < 60) return `${deltaMinutes}분 전 업데이트됨`;
  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}시간 전 업데이트됨`;
  const deltaDays = Math.round(deltaHours / 24);
  return `${deltaDays}일 전 업데이트됨`;
};

export const summarizeChecksTone = (summary: string | null): string => {
  if (!summary) return "text-white/45";
  if (summary.includes("failing")) return "text-rose-300";
  if (summary.includes("pending")) return "text-amber-200";
  return "text-emerald-200";
};
