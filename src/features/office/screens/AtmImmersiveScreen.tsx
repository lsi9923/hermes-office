"use client";

import { Check, Landmark, Lock, RefreshCw, Wallet } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { RunningAvatarLoader } from "@/features/agents/components/RunningAvatarLoader";
import {
  type OfficeUsageAnalyticsParams,
  useOfficeUsageAnalyticsViewModel,
} from "@/features/office/hooks/useOfficeUsageAnalyticsViewModel";
import {
  formatCurrency,
  formatNumber,
  toDateInputValue,
} from "@/lib/office/usageAnalyticsPresentation";

const PIN_STORAGE_KEY = "openclaw_atm_pin_code";

const resolveInitialPinMode = (): "setup" | "verify" => {
  if (typeof window === "undefined") {
    return "verify";
  }
  return window.localStorage.getItem(PIN_STORAGE_KEY) ? "verify" : "setup";
};

export function AtmImmersiveScreen(props: OfficeUsageAnalyticsParams) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinMode] = useState<"setup" | "verify">(resolveInitialPinMode);
  const [inputPin, setInputPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { usage, settingsLoaded, startDate, endDate, setStartDate, setEndDate } =
    useOfficeUsageAnalyticsViewModel(props);

  const handlePinSubmit = () => {
    if (inputPin.length < 4) {
      setError("PIN은 최소 4자리여야 합니다");
      return;
    }

    if (pinMode === "setup") {
      localStorage.setItem(PIN_STORAGE_KEY, inputPin);
      setIsAuthenticated(true);
      setError(null);
    } else {
      const stored = localStorage.getItem(PIN_STORAGE_KEY);
      if (inputPin === stored) {
        setIsAuthenticated(true);
        setError(null);
      } else {
        setError("PIN이 올바르지 않습니다");
        setInputPin("");
      }
    }
  };

  const handleKeyPad = (key: string) => {
    setError(null);
    if (key === "clear") {
      setInputPin("");
    } else if (key === "backspace") {
      setInputPin((prev) => prev.slice(0, -1));
    } else if (key === "submit") {
      handlePinSubmit();
    } else {
      if (inputPin.length < 6) {
        setInputPin((prev) => prev + key);
      }
    }
  };

  const recentCostDaily = useMemo(() => usage.costDaily.slice(-7), [usage.costDaily]);
  const chartMax = useMemo(
    () => recentCostDaily.reduce((max, entry) => Math.max(max, entry.totalCost), 0),
    [recentCostDaily],
  );
  const overviewCards = useMemo(
    () => [
      { label: "총 지출", value: formatCurrency(usage.totals.totalCost) },
      { label: "총 토큰", value: formatNumber(usage.totals.totalTokens) },
      { label: "세션", value: formatNumber(usage.sessions.length) },
      { label: "메시지", value: formatNumber(usage.aggregates.messages.total) },
      { label: "도구 호출", value: formatNumber(usage.aggregates.tools.totalCalls) },
      { label: "고유 도구", value: formatNumber(usage.aggregates.tools.uniqueTools) },
      { label: "오류", value: formatNumber(usage.aggregates.messages.errors) },
      {
        label: "평균 세션 비용",
        value:
          usage.sessions.length > 0
            ? formatCurrency(usage.totals.totalCost / usage.sessions.length)
            : formatCurrency(0),
      },
    ],
    [usage],
  );
  const recentSessions = useMemo(
    () =>
      [...usage.sessions]
        .sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))
        .slice(0, 18),
    [usage.sessions],
  );
  const selectedRangeLabel = useMemo(() => {
    const now = new Date();
    const end = toDateInputValue(now);
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 6);
    const lastMonth = new Date(now);
    lastMonth.setDate(lastMonth.getDate() - 29);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if (startDate === toDateInputValue(lastWeek) && endDate === end) return "7일";
    if (startDate === toDateInputValue(lastMonth) && endDate === end) return "30일";
    if (startDate === toDateInputValue(monthStart) && endDate === end) return "이번 달";
    return "사용자 지정";
  }, [endDate, startDate]);

  const setQuickRange = (days: number | "mtd") => {
    const end = new Date();
    const start = new Date(end);
    if (days === "mtd") {
      start.setDate(1);
    } else {
      start.setDate(start.getDate() - (days - 1));
    }
    setStartDate(toDateInputValue(start));
    setEndDate(toDateInputValue(end));
  };

  if (!isAuthenticated) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,#113a3d_0%,#071719_65%,#020607_100%)] text-[#d6fff7]">
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(130,255,228,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(130,255,228,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full border border-[#7dfff0]/30 bg-[#0d3034] shadow-[0_0_40px_rgba(125,255,240,0.15)]">
            <Lock className="h-8 w-8 text-[#7dfff0]" />
          </div>

          <h2 className="text-[24px] font-medium tracking-[0.1em] text-[#dbfff6]">
            {pinMode === "setup" ? "접근 PIN 만들기" : "PIN 코드 입력"}
          </h2>
          <p className="mt-2 text-[13px] uppercase tracking-[0.15em] text-[#83fff0]/60">
            {pinMode === "setup"
              ? "사용량 장부를 보호할 코드를 설정하세요"
              : "장부를 보려면 인증이 필요합니다"}
          </p>

          <div className="mb-8 mt-10 flex gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`h-4 w-4 rounded-full border border-[#7dfff0]/40 transition-all duration-200 ${
                  i < inputPin.length
                    ? "bg-[#7dfff0] shadow-[0_0_15px_rgba(125,255,240,0.6)]"
                    : "bg-transparent"
                }`}
              />
            ))}
          </div>

          {error ? (
            <div className="animate-in slide-in-from-top-2 mb-6 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-[13px] font-medium text-rose-200 fade-in">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPad(num.toString())}
                className="flex h-16 w-24 items-center justify-center rounded-xl border border-[#7dfff0]/10 bg-[#041315]/80 text-[24px] font-light text-[#d6fff7] transition-all hover:bg-[#0d3034] hover:border-[#7dfff0]/30 active:scale-95"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleKeyPad("clear")}
              className="flex h-16 w-24 items-center justify-center rounded-xl border border-rose-500/20 bg-[#1a0505]/60 text-[14px] font-medium uppercase tracking-wider text-rose-200 transition-all hover:bg-rose-900/40 active:scale-95"
            >
              지우기
            </button>
            <button
              onClick={() => handleKeyPad("0")}
              className="flex h-16 w-24 items-center justify-center rounded-xl border border-[#7dfff0]/10 bg-[#041315]/80 text-[24px] font-light text-[#d6fff7] transition-all hover:bg-[#0d3034] hover:border-[#7dfff0]/30 active:scale-95"
            >
              0
            </button>
            <button
              onClick={() => handleKeyPad("submit")}
              className="flex h-16 w-24 items-center justify-center rounded-xl border border-emerald-500/20 bg-[#051a10]/60 text-emerald-200 transition-all hover:bg-emerald-900/40 active:scale-95"
            >
              <Check className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-y-auto bg-[radial-gradient(circle_at_top,#113a3d_0%,#071719_45%,#020607_100%)] text-[#d6fff7]">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(130,255,228,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(130,255,228,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_55%,rgba(0,0,0,0.34)_100%)]" />
      <div className="relative flex min-h-full flex-col px-10 py-8 pb-14">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 text-[12px] uppercase tracking-[0.32em] text-[#83fff0]/70">
              <Landmark className="h-4 w-4" />
              OpenClaw 사용량 ATM
            </div>
            <div className="mt-3 text-[13px] uppercase tracking-[0.24em] text-[#7ddfd2]/62">
              토큰 사용량 장부
            </div>
            <div className="mt-2 text-[44px] font-semibold tracking-[0.08em] text-[#dbfff6]">
              {formatNumber(usage.totals.totalTokens)}
            </div>
            <div className="mt-2 text-[15px] uppercase tracking-[0.28em] text-[#89fff1]/72">
              사용한 총 토큰
            </div>
            <div className="mt-4 inline-flex items-center rounded-full border border-[#7cffef]/20 bg-black/20 px-4 py-2 text-[13px] uppercase tracking-[0.24em] text-[#bafff7]/85">
              USD 환산 {formatCurrency(usage.totals.totalCost)}
            </div>
          </div>
          <div className="w-[320px] rounded-[24px] border border-[#7dfff0]/18 bg-black/22 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[#88fff1]/62">
              <Wallet className="h-4 w-4" />
              계정 요약
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { label: "7일", value: 7 },
                { label: "30일", value: 30 },
                { label: "이번 달", value: "mtd" as const },
              ].map((range) => (
                <button
                  key={range.label}
                  type="button"
                  onClick={() => setQuickRange(range.value)}
                  className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] transition-colors ${
                    selectedRangeLabel === range.label
                      ? "border-[#8efff2]/40 bg-[#0d3034] text-[#dffff8]"
                      : "border-[#7dfff0]/16 bg-[#041315] text-[#8ffff3]/68 hover:border-[#7dfff0]/30 hover:text-[#dffff8]"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <SummaryCard label="입력" value={formatCurrency(usage.totals.inputCost)} />
              <SummaryCard label="출력" value={formatCurrency(usage.totals.outputCost)} />
              <SummaryCard label="캐시 읽기" value={formatCurrency(usage.totals.cacheReadCost)} />
              <SummaryCard label="캐시 쓰기" value={formatCurrency(usage.totals.cacheWriteCost)} />
            </div>
            <div className="mt-4 rounded-2xl border border-[#7dfff0]/12 bg-[#031314]/80 px-4 py-3 text-[12px] uppercase tracking-[0.18em] text-[#9ffef0]/76">
              {usage.lastRefreshedAt
                ? `마지막 새로고침 ${new Date(usage.lastRefreshedAt).toLocaleTimeString("ko-KR")}`
                : settingsLoaded
                  ? "첫 사용량 스냅샷 대기 중"
                  : "계정 환경설정 불러오는 중"}
            </div>
          </div>
        </div>

        <div className="mt-7 space-y-6">
          <SectionCard
            title="사용량 개요"
            subtitle="선택한 장부 기간의 OpenClaw 비용 데이터를 확장해 보여줍니다."
            action={
              <button
                type="button"
                onClick={() => void usage.refresh()}
                className="inline-flex items-center gap-2 rounded-full border border-[#7dfff0]/24 bg-[#072528] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#b7fff8] transition-colors hover:border-[#7dfff0]/40 hover:bg-[#0a3035]"
              >
                {usage.loading ? (
                  <RunningAvatarLoader size={16} trackWidth={32} inline />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                새로고침
              </button>
            }
          >
            {usage.error ? <EmptyPanelState message={usage.error} tone="danger" /> : null}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {overviewCards.map((card) => (
                <SummaryCard key={card.label} label={card.label} value={card.value} />
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="일별 사용 비용"
            subtitle="최근 7일 동안의 비용 흐름입니다."
          >
            {usage.loading && recentCostDaily.length === 0 ? (
              <EmptyPanelState message="ATM 장부를 불러오는 중입니다." />
            ) : recentCostDaily.length === 0 ? (
              <EmptyPanelState message="현재 장부 기간에 기록된 토큰 지출이 없습니다." />
            ) : (
              <div className="grid grid-cols-7 gap-3">
                {recentCostDaily.map((entry) => {
                  const heightPct = chartMax > 0 ? (entry.totalCost / chartMax) * 100 : 0;
                  return (
                    <div key={entry.date} className="flex min-w-0 flex-col items-center gap-3">
                      <div className="text-center text-[11px] uppercase tracking-[0.12em] text-[#9dfef0]/68">
                        {formatCurrency(entry.totalCost)}
                      </div>
                      <div className="flex h-[230px] w-full items-end rounded-[20px] border border-[#7dfff0]/10 bg-[#041315]/86 p-2">
                        <div
                          className="w-full rounded-[14px] bg-[linear-gradient(180deg,#7effef_0%,#2cd3bf_100%)] shadow-[0_0_18px_rgba(85,255,231,0.32)]"
                          style={{ height: `${Math.max(8, heightPct)}%` }}
                          title={`${entry.date} ${formatCurrency(entry.totalCost)}`}
                        />
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.16em] text-[#7bd9cd]/72">
                        {entry.date.slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SectionCard
              title="일별 활동"
              subtitle="일별 토큰, 비용, 메시지, 도구 호출, 오류입니다."
            >
              <div className="space-y-3">
                {usage.aggregates.daily.map((entry) => (
                  <ListRow
                    key={entry.date}
                    title={entry.date}
                    primary={`${formatCurrency(entry.cost)} · 토큰 ${formatNumber(entry.tokens)}개`}
                    secondary={`메시지 ${formatNumber(entry.messages)}개 · 도구 호출 ${formatNumber(entry.toolCalls)}회 · 오류 ${formatNumber(entry.errors)}개`}
                  />
                ))}
                {usage.aggregates.daily.length === 0 ? (
                  <EmptyPanelState message="아직 표시할 일별 활동 행이 없습니다." />
                ) : null}
              </div>
            </SectionCard>

            <SectionCard
              title="예산 알림"
              subtitle="일별, 월별, 에이전트별 지출 임계값 경고입니다."
            >
              <div className="space-y-3">
                {usage.budgetAlerts.map((alert) => (
                  <div
                    key={alert.key}
                    className={`rounded-2xl border px-4 py-4 text-[13px] ${
                      alert.severity === "danger"
                        ? "border-rose-400/35 bg-rose-500/12 text-rose-100"
                        : "border-amber-300/30 bg-amber-400/12 text-amber-50"
                    }`}
                  >
                    <div className="text-[11px] uppercase tracking-[0.18em] opacity-70">
                      {alert.label}
                    </div>
                    <div className="mt-2 text-[16px]">
                      {formatCurrency(alert.currentUsd)} / {formatCurrency(alert.limitUsd)}.
                    </div>
                  </div>
                ))}
                {usage.budgetAlerts.length === 0 ? (
                  <EmptyPanelState
                    message="현재 ATM 장부 기간의 예산 임계값은 정상입니다."
                    tone="success"
                  />
                ) : null}
              </div>
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SectionCard title="에이전트 비용" subtitle="총 지출 기준으로 모든 에이전트를 정렬했습니다.">
              <div className="space-y-3">
                {usage.aggregates.byAgent.map((entry, index) => (
                  <ListRow
                    key={entry.agentId}
                    title={`계정 ${String(index + 1).padStart(2, "0")} · ${entry.agentName}`}
                    primary={formatCurrency(entry.totals.totalCost)}
                    secondary={`토큰 ${formatNumber(entry.totals.totalTokens)}개`}
                  />
                ))}
                {usage.aggregates.byAgent.length === 0 ? (
                  <EmptyPanelState message="아직 에이전트 토큰 활동이 없습니다." />
                ) : null}
              </div>
            </SectionCard>

            <SectionCard
              title="모델 비용"
              subtitle="제공자와 모델별 지출 내역입니다."
            >
              <div className="space-y-3">
                {usage.aggregates.byModel.map((entry, index) => (
                  <ListRow
                    key={`${entry.provider ?? "unknown"}:${entry.model ?? "unknown"}`}
                    title={`경로 ${String(index + 1).padStart(2, "0")} · ${entry.provider ?? "알 수 없음"} / ${entry.model ?? "알 수 없음"}`}
                    primary={formatCurrency(entry.totals.totalCost)}
                    secondary={`토큰 ${formatNumber(entry.totals.totalTokens)}개`}
                  />
                ))}
                {usage.aggregates.byModel.length === 0 ? (
                  <EmptyPanelState message="아직 기록된 모델 비용 경로가 없습니다." />
                ) : null}
              </div>
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SectionCard title="도구 사용량" subtitle="선택한 세션에서 관찰된 모든 도구입니다.">
              <div className="space-y-3">
                {usage.aggregates.tools.tools.map((tool, index) => (
                  <ListRow
                    key={tool.name}
                    title={`도구 ${String(index + 1).padStart(2, "0")} · ${tool.name}`}
                    primary={formatNumber(tool.count)}
                    secondary="총 호출 횟수"
                  />
                ))}
                {usage.aggregates.tools.tools.length === 0 ? (
                  <EmptyPanelState message="아직 기록된 도구 사용량이 없습니다." />
                ) : null}
              </div>
            </SectionCard>

            <SectionCard
              title="메시지 합계"
              subtitle="선택한 모든 세션의 대화 활동입니다."
            >
              <div className="grid grid-cols-2 gap-3">
                <SummaryCard
                  label="전체 메시지"
                  value={formatNumber(usage.aggregates.messages.total)}
                />
                <SummaryCard
                  label="사용자"
                  value={formatNumber(usage.aggregates.messages.user)}
                />
                <SummaryCard
                  label="어시스턴트"
                  value={formatNumber(usage.aggregates.messages.assistant)}
                />
                <SummaryCard
                  label="도구 결과"
                  value={formatNumber(usage.aggregates.messages.toolResults)}
                />
              </div>
            </SectionCard>
          </div>

          <SectionCard
            title="최근 세션"
            subtitle="비용과 토큰 합계가 포함된 최신 세션입니다."
          >
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <ListRow
                  key={session.key}
                  title={session.label ?? session.agentName ?? session.key}
                  primary={`${formatCurrency(session.usage.totals.totalCost)} · 토큰 ${formatNumber(
                    session.usage.totals.totalTokens,
                  )}개`}
                  secondary={`${session.provider ?? "알 수 없음"} / ${session.model ?? "알 수 없음"} · ${
                    session.updatedAt
                      ? new Date(session.updatedAt).toLocaleString("ko-KR")
                      : "타임스탬프 없음"
                  }`}
                />
              ))}
              {recentSessions.length === 0 ? (
                <EmptyPanelState message="선택한 기간에 표시할 세션이 없습니다." />
              ) : null}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#7dfff0]/16 bg-black/20 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[12px] uppercase tracking-[0.24em] text-[#8cfff3]/64">
            {title}
          </div>
          <div className="mt-2 text-[14px] text-[#d8fff7]/74">{subtitle}</div>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#7dfff0]/10 bg-[#031314]/78 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[#7addcf]/58">
        {label}
      </div>
      <div className="mt-2 text-[16px] text-[#e4fff9]">{value}</div>
    </div>
  );
}

function ListRow({
  title,
  primary,
  secondary,
}: {
  title: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#7dfff0]/10 bg-[#031314]/78 px-4 py-3">
      <div className="min-w-0">
        <div className="truncate text-[13px] uppercase tracking-[0.12em] text-[#dffef8]">
          {title}
        </div>
        <div className="mt-1 text-[11px] text-[#8cdcd1]/66">{secondary}</div>
      </div>
      <div className="shrink-0 text-right text-[15px] text-[#d9fff8]">{primary}</div>
    </div>
  );
}

function EmptyPanelState({
  message,
  tone = "neutral",
}: {
  message: string;
  tone?: "neutral" | "success" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-400/30 bg-rose-500/12 text-rose-100"
      : tone === "success"
        ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
        : "border-[#7dfff0]/10 bg-[#031314]/78 text-[#b6fff7]/70";
  return (
    <div className={`rounded-2xl border px-4 py-4 text-[13px] ${toneClass}`}>
      {message}
    </div>
  );
}
