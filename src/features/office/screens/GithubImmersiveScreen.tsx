"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ExternalLink,
  Github,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  MessageSquare,
} from "lucide-react";
import { RunningAvatarLoader } from "@/features/agents/components/RunningAvatarLoader";

import type {
  GitHubDashboardResponse,
  GitHubDetailResponse,
  GitHubInlineCommentSide,
  GitHubPullRequestDetail,
  GitHubPullRequestSummary,
  GitHubReviewAction,
} from "@/lib/office/github";
import { resolveSkillMarketplaceMetadata } from "@/lib/skills/marketplace";
import {
  buildSkillMissingDetails,
  deriveSkillReadinessState,
  type SkillReadinessState,
} from "@/lib/skills/presentation";
import type { SkillStatusEntry } from "@/lib/skills/types";

import { FileDiffModal } from "./github/FileDiffModal";
import { useBrowserPreview } from "./github/useBrowserPreview";
import {
  GITHUB_RECORDING_PRIVACY_MASK_ACTIVE,
  formatRelativeTime,
  maskGitHubRecordingText,
  summarizeChecksTone,
} from "./github/utils";

type GithubImmersiveScreenProps = {
  agentName?: string | null;
  githubSkill?: SkillStatusEntry | null;
  onOpenSetup?: () => void;
};

export function GithubImmersiveScreen({
  agentName,
  githubSkill = null,
  onOpenSetup,
}: GithubImmersiveScreenProps) {
  const [dashboard, setDashboard] = useState<GitHubDashboardResponse | null>(
    null,
  );
  const [detail, setDetail] = useState<GitHubPullRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"queue" | "repo">("queue");
  const [selectedPr, setSelectedPr] = useState<GitHubPullRequestSummary | null>(
    null,
  );
  const [reviewBody, setReviewBody] = useState("");
  const [reviewBusyAction, setReviewBusyAction] =
    useState<GitHubReviewAction | null>(null);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<"summary" | "browser">(
    "summary",
  );
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);

  const skillReadiness = useMemo<SkillReadinessState | null>(
    () => (githubSkill ? deriveSkillReadinessState(githubSkill) : null),
    [githubSkill],
  );
  const skillMissingDetails = useMemo(
    () => (githubSkill ? buildSkillMissingDetails(githubSkill) : []),
    [githubSkill],
  );
  const skillMetadata = useMemo(
    () => (githubSkill ? resolveSkillMarketplaceMetadata(githubSkill) : null),
    [githubSkill],
  );

  const refreshDashboard = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/office/github", { cache: "no-store" });
      const payload = (await response.json()) as GitHubDashboardResponse & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          payload.error?.trim() || "GitHub 대시보드를 불러오지 못했습니다.",
        );
      }
      if (requestIdRef.current !== requestId) return;
      setDashboard(payload);
      setSelectedPr((current) => {
        if (!current) {
          return (
            payload.reviewRequests[0] ??
            payload.currentRepoPullRequests[0] ??
            payload.authoredPullRequests[0] ??
            null
          );
        }
        return (
          [
            ...payload.reviewRequests,
            ...payload.currentRepoPullRequests,
            ...payload.authoredPullRequests,
          ].find(
            (entry) =>
              entry.repo === current.repo && entry.number === current.number,
          ) ?? current
        );
      });
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      setDashboard(null);
      setError(
        error instanceof Error
          ? error.message
          : "GitHub 대시보드를 불러오지 못했습니다.",
      );
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  const loadDetail = useCallback(
    async (summary: GitHubPullRequestSummary | null) => {
      if (!summary) {
        detailRequestIdRef.current += 1;
        setDetail(null);
        setSelectedFilePath(null);
        return;
      }
      const requestId = detailRequestIdRef.current + 1;
      detailRequestIdRef.current = requestId;
      setDetailLoading(true);
      try {
        const params = new URLSearchParams({
          repo: summary.repo,
          number: String(summary.number),
        });
        const response = await fetch(
          `/api/office/github?${params.toString()}`,
          {
            cache: "no-store",
          },
        );
        const payload = (await response.json()) as GitHubDetailResponse & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(
            payload.error?.trim() || "Pull Request 상세 정보를 불러오지 못했습니다.",
          );
        }
        if (detailRequestIdRef.current !== requestId) return;
        setDetail(payload.pullRequest);
        setSelectedFilePath(null);
      } catch (error) {
        if (detailRequestIdRef.current !== requestId) return;
        setDetail(null);
        setSelectedFilePath(null);
        setError(
          error instanceof Error
            ? error.message
            : "Pull Request 상세 정보를 불러오지 못했습니다.",
        );
      } finally {
        if (detailRequestIdRef.current === requestId) {
          setDetailLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadDetail(selectedPr);
  }, [loadDetail, selectedPr]);

  const browserPreview = useBrowserPreview(
    detail?.url ?? null,
    detailMode === "browser" && !GITHUB_RECORDING_PRIVACY_MASK_ACTIVE,
  );

  const queueEntries = useMemo(
    () =>
      dashboard
        ? [
            ...dashboard.reviewRequests,
            ...dashboard.authoredPullRequests,
          ].filter(
            (entry, index, list) =>
              list.findIndex(
                (candidate) =>
                  candidate.repo === entry.repo &&
                  candidate.number === entry.number,
              ) === index,
          )
        : [],
    [dashboard],
  );

  const activeList =
    activeTab === "queue"
      ? queueEntries
      : (dashboard?.currentRepoPullRequests ?? []);
  const currentRepoLabel = useMemo(() => {
    const slug = dashboard?.currentRepoSlug?.trim();
    if (!slug) return "Git 원격 저장소 없음";
    const segments = slug.split("/").filter(Boolean);
    return maskGitHubRecordingText(segments.at(-1) ?? slug);
  }, [dashboard?.currentRepoSlug]);
  const isInitialLoading = loading && dashboard === null && !error;
  const selectedFile = useMemo(
    () => detail?.files.find((file) => file.path === selectedFilePath) ?? null,
    [detail?.files, selectedFilePath],
  );

  useEffect(() => {
    if (!selectedFile) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedFilePath(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFile]);

  const handleSelectPr = useCallback(
    (summary: GitHubPullRequestSummary, tab: "queue" | "repo") => {
      setActiveTab(tab);
      setSelectedPr(summary);
      setSelectedFilePath(null);
      setReviewBody("");
      setReviewMessage(null);
    },
    [],
  );

  const handleSubmitReview = useCallback(
    async (action: GitHubReviewAction) => {
      if (!detail) return;
      setReviewBusyAction(action);
      setReviewMessage(null);
      setError(null);
      try {
        const response = await fetch("/api/office/github", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repo: detail.repo,
            number: detail.number,
            action,
            body: reviewBody,
          }),
        });
        const payload = (await response.json()) as {
          error?: string;
          message?: string;
        };
        if (!response.ok) {
          throw new Error(
            payload.error?.trim() || "GitHub 리뷰를 제출하지 못했습니다.",
          );
        }
        setReviewMessage(payload.message?.trim() || "리뷰가 제출되었습니다.");
        setReviewBody("");
        await Promise.all([refreshDashboard(), loadDetail(selectedPr)]);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "GitHub 리뷰를 제출하지 못했습니다.",
        );
      } finally {
        setReviewBusyAction(null);
      }
    },
    [detail, loadDetail, refreshDashboard, reviewBody, selectedPr],
  );

  const handleSubmitInlineComment = useCallback(
    async (input: {
      repo: string;
      pullNumber: number;
      commitId: string | null;
      path: string;
      line: number;
      side: GitHubInlineCommentSide;
      body: string;
    }) => {
      const response = await fetch("/api/office/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: input.repo,
          number: input.pullNumber,
          commitId: input.commitId,
          path: input.path,
          line: input.line,
          side: input.side,
          body: input.body,
        }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        const message =
          payload.error?.trim() || "GitHub 인라인 댓글을 제출하지 못했습니다.";
        throw new Error(message);
      }
    },
    [],
  );

  const shouldBlockForSkillSetup =
    githubSkill !== null &&
    skillReadiness !== null &&
    skillReadiness !== "ready";

  if (shouldBlockForSkillSetup) {
    return (
      <div className="flex h-full flex-col bg-[#050816] text-white">
        <div className="border-b border-cyan-500/10 bg-[#071122] px-8 py-6">
          <div className="flex items-center gap-3 text-cyan-200">
            <Github className="h-6 w-6" />
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">
                코드 리뷰 룸
              </div>
              <div className="text-xl font-semibold">
                GitHub 스킬 설정이 필요합니다.
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-8">
          <div className="max-w-xl rounded-3xl border border-cyan-400/15 bg-[#081427] p-8 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
            <div className="mb-4 flex items-center gap-3 text-cyan-100">
              <ShieldX className="h-5 w-5 text-amber-300" />
              <span className="text-sm uppercase tracking-[0.24em] text-cyan-100/70">
                {skillMetadata?.tagline ??
                  "이 에이전트의 GitHub 접근 준비가 끝나지 않았습니다."}
              </span>
            </div>
            <div className="text-2xl font-semibold text-white">
              {skillReadiness === "disabled-globally"
                ? "이 게이트웨이에서 GitHub가 비활성화되어 있습니다."
                : skillReadiness === "unavailable"
                  ? "이 에이전트는 아직 GitHub 스킬을 사용할 수 없습니다."
                  : "GitHub 스킬 설정이 아직 필요합니다."}
            </div>
            <p className="mt-3 text-sm leading-6 text-cyan-100/72">
              스킬 패널을 열어 번들 GitHub 스킬을 설치하거나 활성화하세요.
              그러면 에이전트가 이 방에서 OpenClaw를 통해 Pull Request를
              리뷰할 수 있습니다.
            </p>
            <div className="mt-5 space-y-2">
              {skillMissingDetails.length > 0 ? (
                skillMissingDetails.map((line) => (
                  <div
                    key={line}
                    className="rounded-2xl border border-white/6 bg-black/20 px-4 py-3 text-sm text-white/72"
                  >
                    {line}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/6 bg-black/20 px-4 py-3 text-sm text-white/72">
                  선택한 에이전트에 GitHub 스킬을 활성화한 뒤 코드 리뷰 룸으로
                  돌아오세요.
                </div>
              )}
            </div>
            {onOpenSetup ? (
              <button
                type="button"
                onClick={onOpenSetup}
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-5 py-2.5 text-sm font-medium text-cyan-100 transition-colors hover:border-cyan-200/50 hover:bg-cyan-300/18"
              >
                <ShieldCheck className="h-4 w-4" />
                스킬 설정 열기
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#0f1b3d_0%,#060916_42%,#020409_100%)] text-white">
      <div className="border-b border-cyan-400/12 bg-[#06101f]/82 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/18 bg-cyan-300/8">
              <Github className="h-5 w-5 text-cyan-100" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/65">
                코드 리뷰 룸
              </div>
              <div className="text-lg font-semibold text-white">
                {agentName
                  ? `${agentName}이 GitHub를 리뷰 중입니다.`
                  : "GitHub 리뷰 스테이션입니다."}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void refreshDashboard();
                void loadDetail(selectedPr);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] text-white/72 transition-colors hover:border-white/20 hover:text-white"
            >
              {loading || detailLoading ? (
                <RunningAvatarLoader size={16} trackWidth={32} inline />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              새로고침
            </button>
            {dashboard?.viewerLogin ? (
              <div className="rounded-full border border-cyan-300/16 bg-cyan-300/8 px-3 py-1.5 text-[12px] text-cyan-100/90">
                @{maskGitHubRecordingText(dashboard.viewerLogin)}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <div className="mx-6 mt-4 rounded-2xl border border-rose-400/16 bg-rose-400/8 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}
      {reviewMessage ? (
        <div className="mx-6 mt-4 rounded-2xl border border-emerald-400/16 bg-emerald-400/8 px-4 py-3 text-sm text-emerald-100">
          {reviewMessage}
        </div>
      ) : null}
      {dashboard && !dashboard.ready && dashboard.message ? (
        <div className="mx-6 mt-4 rounded-2xl border border-amber-300/16 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          {dashboard.message}
        </div>
      ) : null}

      {isInitialLoading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-8 py-10">
          <div className="flex max-w-md flex-col items-center rounded-3xl border border-cyan-300/12 bg-[#081122]/78 px-8 py-10 text-center shadow-[0_20px_80px_rgba(0,0,0,0.38)]">
            <RunningAvatarLoader size={40} trackWidth={104} />
            <div className="mt-5 text-[11px] uppercase tracking-[0.28em] text-cyan-100/55">
              GitHub 불러오는 중
            </div>
            <div className="mt-2 text-lg font-semibold text-white">
              리뷰 큐를 가져오는 중입니다.
            </div>
            <div className="mt-2 text-sm text-white/58">
              Pull Request, 저장소 메타데이터, 리뷰 상세 정보를 불러오고 있습니다.
            </div>
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[340px_minmax(0,1fr)] gap-0">
          <div className="flex min-h-0 flex-col border-r border-white/6 bg-[#081122]/72">
            <div className="grid grid-cols-2 gap-2 p-3">
              <button
                type="button"
                onClick={() => setActiveTab("queue")}
                className={`min-w-0 rounded-2xl px-4 py-2.5 text-left transition-colors ${
                  activeTab === "queue"
                    ? "border border-cyan-300/20 bg-cyan-300/12 text-white"
                    : "border border-white/6 bg-white/4 text-white/65 hover:text-white"
                }`}
              >
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/50">
                  내 큐
                </div>
                <div className="mt-1 text-lg font-semibold leading-none">
                  {queueEntries.length}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("repo")}
                className={`min-w-0 rounded-2xl px-4 py-2.5 text-left transition-colors ${
                  activeTab === "repo"
                    ? "border border-cyan-300/20 bg-cyan-300/12 text-white"
                    : "border border-white/6 bg-white/4 text-white/65 hover:text-white"
                }`}
              >
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/50">
                  현재 저장소
                </div>
                <div className="mt-1 break-words text-sm font-medium leading-5 text-white/85">
                  {currentRepoLabel}
                </div>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              {loading ? (
                <div className="rounded-2xl border border-white/6 bg-white/4 px-4 py-4 text-sm text-white/55">
                  Pull Request를 불러오는 중입니다.
                </div>
              ) : activeList.length === 0 ? (
                <div className="rounded-2xl border border-white/6 bg-white/4 px-4 py-4 text-sm text-white/55">
                  {activeTab === "queue"
                    ? "리뷰 요청이나 내가 작성한 Pull Request가 없습니다."
                    : "이 저장소에 열린 Pull Request가 없습니다."}
                </div>
              ) : (
                <div className="space-y-3">
                  {activeList.map((entry) => {
                    const isSelected =
                      selectedPr?.repo === entry.repo &&
                      selectedPr?.number === entry.number;
                    return (
                      <button
                        key={`${entry.repo}#${entry.number}`}
                        type="button"
                        onClick={() => handleSelectPr(entry, activeTab)}
                        className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                          isSelected
                            ? "border-cyan-300/24 bg-cyan-300/10"
                            : "border-white/6 bg-white/4 hover:border-white/12 hover:bg-white/6"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                              {maskGitHubRecordingText(entry.repo)}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-white">
                              #{entry.number} {maskGitHubRecordingText(entry.title)}
                            </div>
                          </div>
                          {entry.isDraft ? (
                            <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/55">
                              초안
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/56">
                          <span>@{maskGitHubRecordingText(entry.author)}</span>
                          <span>{formatRelativeTime(entry.updatedAt)}</span>
                          {entry.statusSummary ? (
                            <span
                              className={summarizeChecksTone(
                                entry.statusSummary,
                              )}
                            >
                              {entry.statusSummary}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 overflow-hidden">
            {detailLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-white/55">
                Pull Request 상세 정보를 불러오는 중입니다.
              </div>
            ) : detail ? (
              <div className="grid h-full grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-h-0 overflow-y-auto px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.26em] text-cyan-200/55">
                        {maskGitHubRecordingText(detail.repo)}
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-white">
                        #{detail.number} {maskGitHubRecordingText(detail.title)}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/62">
                        <span>@{maskGitHubRecordingText(detail.author)}</span>
                        <span>{formatRelativeTime(detail.updatedAt)}</span>
                        {detail.reviewDecision ? (
                          <span>{detail.reviewDecision}</span>
                        ) : null}
                        {detail.mergeable ? (
                          <span>{detail.mergeable}</span>
                        ) : null}
                      </div>
                    </div>
                    <a
                      href={detail.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-w-[96px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white/75 transition-colors hover:border-white/20 hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      PR 열기
                    </a>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/6 bg-white/4 px-4 py-4">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                        검사
                      </div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {detail.statusChecks.length}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/6 bg-white/4 px-4 py-4">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                        변경 파일
                      </div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {detail.files.length}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/6 bg-white/4 px-4 py-4">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                        리뷰
                      </div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {detail.reviews.length}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-3xl border border-cyan-400/10 bg-[#071223]/88 p-5">
                    <div className="space-y-4">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/52">
                          리뷰 작업
                        </div>
                        <div className="mt-1 text-sm text-white/68">
                          서버 룸에서 바로 리뷰를 제출합니다.
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleSubmitReview("APPROVE")}
                          disabled={Boolean(reviewBusyAction)}
                          className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full border border-emerald-300/24 bg-emerald-300/10 px-4 text-sm text-emerald-100 transition-colors hover:border-emerald-200/40 hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {reviewBusyAction === "APPROVE"
                            ? "승인 중..."
                            : "승인"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleSubmitReview("REQUEST_CHANGES")
                          }
                          disabled={Boolean(reviewBusyAction)}
                          className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full border border-amber-300/24 bg-amber-300/10 px-4 text-xs text-amber-100 transition-colors hover:border-amber-200/40 hover:bg-amber-300/16 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {reviewBusyAction === "REQUEST_CHANGES"
                            ? "변경 요청 중..."
                            : "변경 요청"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSubmitReview("COMMENT")}
                          disabled={Boolean(reviewBusyAction)}
                          className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full border border-cyan-300/24 bg-cyan-300/10 px-4 text-sm text-cyan-100 transition-colors hover:border-cyan-200/40 hover:bg-cyan-300/16 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {reviewBusyAction === "COMMENT"
                            ? "전송 중..."
                            : "댓글"}
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={reviewBody}
                      onChange={(event) => setReviewBody(event.target.value)}
                      placeholder="승인 메모 또는 변경 요청 요약을 입력하세요."
                      className="mt-4 h-28 w-full resize-none rounded-2xl border border-white/8 bg-black/22 px-4 py-3 text-sm text-white outline-none placeholder:text-white/28"
                    />
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailMode("summary")}
                      className={`rounded-full px-3 py-1.5 text-[12px] transition-colors ${
                        detailMode === "summary"
                          ? "border border-white/10 bg-white/10 text-white"
                          : "border border-white/6 bg-white/4 text-white/58 hover:text-white"
                      }`}
                    >
                      요약
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailMode("browser")}
                      className={`rounded-full px-3 py-1.5 text-[12px] transition-colors ${
                        detailMode === "browser"
                          ? "border border-white/10 bg-white/10 text-white"
                          : "border border-white/6 bg-white/4 text-white/58 hover:text-white"
                      }`}
                    >
                      브라우저 미리보기
                    </button>
                  </div>

                  {detailMode === "summary" ? (
                    <>
                      <div className="mt-5 rounded-3xl border border-white/6 bg-white/4 p-5">
                        <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                          설명
                        </div>
                        <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/78">
                          {maskGitHubRecordingText(detail.body) ||
                            "Pull Request 설명이 없습니다."}
                        </div>
                      </div>

                      <div className="mt-5 rounded-3xl border border-white/6 bg-white/4 p-5">
                        <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                          Diff 미리보기
                        </div>
                        <div className="mt-1 text-sm text-white/72">
                          전체 Pull Request diff 미리보기입니다.
                        </div>
                        <pre className="mt-3 max-h-[320px] overflow-auto rounded-2xl border border-white/6 bg-black/28 p-4 text-[12px] leading-5 text-cyan-100/86">
                          {maskGitHubRecordingText(detail.diff) ||
                            "Diff 미리보기를 사용할 수 없습니다."}
                        </pre>
                        {detail.diffTruncated ? (
                          <div className="mt-2 text-[11px] text-white/45">
                            성능을 위해 Diff 미리보기가 일부 잘렸습니다.
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <div className="mt-5 rounded-3xl border border-white/6 bg-white/4 p-5">
                      <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-white/45">
                        브라우저 미리보기
                      </div>
                      {GITHUB_RECORDING_PRIVACY_MASK_ACTIVE ? (
                        <div className="rounded-2xl border border-white/6 bg-black/20 px-4 py-5 text-sm text-white/55">
                          화면 녹화에 실제 GitHub 사용자명이 드러나지 않도록
                          브라우저 미리보기를 임시로 비활성화했습니다.
                        </div>
                      ) : browserPreview.loading ? (
                        <div className="rounded-2xl border border-white/6 bg-black/20 px-4 py-5 text-sm text-white/55">
                          GitHub 미리보기를 캡처하는 중입니다.
                        </div>
                      ) : browserPreview.mediaUrl ? (
                        <Image
                          src={browserPreview.mediaUrl}
                          alt={`${detail.url} 미리보기`}
                          width={1280}
                          height={720}
                          unoptimized
                          className="h-auto w-full rounded-2xl border border-white/8 object-cover"
                        />
                      ) : (
                        <div className="rounded-2xl border border-white/6 bg-black/20 px-4 py-5 text-sm text-white/55">
                          {browserPreview.error ??
                            "이 설정에서는 브라우저 미리보기를 사용할 수 없습니다."}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="min-h-0 overflow-y-auto border-l border-white/6 bg-[#060d19]/86 px-4 py-5">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                    검사
                  </div>
                  <div className="mt-3 space-y-2">
                    {detail.statusChecks.length > 0 ? (
                      detail.statusChecks.map((check) => (
                        <div
                          key={`${check.name}-${check.detailsUrl ?? "local"}`}
                          className="rounded-2xl border border-white/6 bg-white/4 px-3 py-3"
                        >
                          <div className="text-sm font-medium text-white">
                            {check.name}
                          </div>
                          <div className="mt-1 text-[12px] text-white/55">
                            {[check.status, check.conclusion, check.workflow]
                              .filter(Boolean)
                              .join(" - ") || "상태 없음"}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-white/6 bg-white/4 px-3 py-3 text-sm text-white/55">
                        보고된 검사가 없습니다.
                      </div>
                    )}
                  </div>

                  <div className="mt-6 text-[11px] uppercase tracking-[0.24em] text-white/42">
                    파일
                  </div>
                  <div className="mt-3 space-y-2">
                    {detail.files.slice(0, 12).map((file) => (
                      <button
                        key={file.path}
                        type="button"
                        onClick={() => setSelectedFilePath(file.path)}
                        className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${
                          selectedFile?.path === file.path
                            ? "border-cyan-300/24 bg-cyan-300/10"
                            : "border-white/6 bg-white/4 hover:border-white/12 hover:bg-white/6"
                        }`}
                      >
                        <div className="truncate text-sm text-white">
                          {file.path}
                        </div>
                        <div className="mt-1 text-[12px] text-white/55">
                          +{file.additions} / -{file.deletions}
                        </div>
                        {file.status ? (
                          <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/40">
                            {file.status}
                          </div>
                        ) : null}
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 text-[11px] uppercase tracking-[0.24em] text-white/42">
                    최근 리뷰
                  </div>
                  <div className="mt-3 space-y-2">
                    {detail.reviews.slice(0, 6).length > 0 ? (
                      detail.reviews.slice(0, 6).map((review, index) => (
                        <div
                          key={`${review.author}-${review.submittedAt ?? index}`}
                          className="rounded-2xl border border-white/6 bg-white/4 px-3 py-3"
                        >
                          <div className="flex items-center gap-2 text-sm text-white">
                            <MessageSquare className="h-3.5 w-3.5 text-cyan-200/70" />
                            <span>@{maskGitHubRecordingText(review.author)}</span>
                          </div>
                          <div className="mt-1 text-[12px] text-white/55">
                            {[review.state, review.submittedAt]
                              .filter(Boolean)
                              .join(" - ")}
                          </div>
                          {review.body ? (
                            <div className="mt-2 text-[12px] leading-5 text-white/68">
                              {maskGitHubRecordingText(review.body)}
                            </div>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-white/6 bg-white/4 px-3 py-3 text-sm text-white/55">
                        아직 리뷰가 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center px-8 text-center text-sm text-white/55">
                검사, diff, 리뷰 작업을 확인할 Pull Request를 선택하세요.
              </div>
            )}
          </div>
        </div>
      )}
      {selectedFile && detail ? (
        <FileDiffModal
          key={selectedFile.path}
          file={selectedFile}
          repo={detail.repo}
          pullNumber={detail.number}
          commitId={detail.headRefOid}
          onSubmitInlineComment={handleSubmitInlineComment}
          onClose={() => setSelectedFilePath(null)}
        />
      ) : null}
    </div>
  );
}
