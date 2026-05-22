"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import {
  OFFICE_FLOORS,
  getAdjacentEnabledOfficeFloorId,
  listAvailableFloorsForAdapter,
  type FloorDefinition,
  type FloorId,
  type FloorProvider,
} from "@/lib/office/floors";
import type { FloorRosterState } from "@/lib/office/floorRoster";
import { FLOOR_PROVIDER_LABELS, formatRosterStatus } from "@/features/office/i18n/koLabels";

const DIRECTORY_COLLAPSED_STORAGE_KEY = "claw3d.officeFloorNav.directoryCollapsed";

type OfficeFloorNavProps = {
  activeFloorId: FloorId;
  floorRosterCache: Record<FloorId, FloorRosterState>;
  onSelectFloor: (floorId: FloorId) => void;
  /** The currently selected adapter — controls which runtime floors are shown */
  activeAdapterType?: FloorProvider | null;
};

const renderFloorButton = (params: {
  floor: FloorDefinition;
  activeFloorId: FloorId;
  floorRosterCache: Record<FloorId, FloorRosterState>;
  onSelectFloor: (floorId: FloorId) => void;
}) => {
  const { floor, activeFloorId, floorRosterCache, onSelectFloor } = params;
  const active = floor.id === activeFloorId;
  const rosterState = floorRosterCache[floor.id];
  const rosterCount = rosterState?.entries.length ?? 0;
  const rosterStatus = rosterState?.status ?? "idle";

  return (
    <button
      key={floor.id}
      type="button"
      onClick={() => onSelectFloor(floor.id)}
      disabled={!floor.enabled}
      className={[
        "w-full rounded-xl border px-3 py-2 text-left transition-colors",
        active
          ? "border-cyan-400/45 bg-cyan-950/40 shadow-[0_0_0_1px_rgba(34,211,238,0.16)]"
          : "border-white/10 bg-black/45 hover:border-white/25 hover:bg-black/55",
        floor.enabled ? "cursor-pointer" : "cursor-not-allowed opacity-45",
      ].join(" ")}
      aria-pressed={active}
      aria-label={`${floor.label} 선택`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
            {floor.zone === "outside" ? "목적지" : "층"}
          </div>
          <div className="truncate text-sm font-semibold text-white">{floor.label}</div>
        </div>
        <span
          className={[
            "shrink-0 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em]",
            active
              ? "border-cyan-400/30 bg-cyan-950/35 text-cyan-100/85"
              : "border-white/10 bg-white/5 text-white/55",
          ].join(" ")}
        >
          {FLOOR_PROVIDER_LABELS[floor.provider]}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 font-mono text-[10px] text-white/45">
        <span>{floor.shortLabel}</span>
        {floor.enabled ? (
          <span>
            명단 {rosterCount} | {formatRosterStatus(rosterStatus)}
          </span>
        ) : (
          <span>잠김</span>
        )}
      </div>
    </button>
  );
};

export function OfficeFloorNav({
  activeFloorId,
  floorRosterCache,
  onSelectFloor,
  activeAdapterType,
}: OfficeFloorNavProps) {
  const availableFloors = listAvailableFloorsForAdapter(activeAdapterType ?? null);
  const buildingFloors = availableFloors.filter((f) => f.zone === "building");
  const outsideFloors = availableFloors.filter((f) => f.zone === "outside");

  // Active floor — fall back to lobby if current floor is no longer available
  const activeIsAvailable = availableFloors.some((f) => f.id === activeFloorId);
  const displayActiveFloorId = activeIsAvailable ? activeFloorId : "lobby";

  const activeFloor =
    OFFICE_FLOORS.find((floor) => floor.id === displayActiveFloorId) ?? OFFICE_FLOORS[0];
  const activeRoster = floorRosterCache[activeFloor.id];

  const [directoryCollapsed, setDirectoryCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(DIRECTORY_COLLAPSED_STORAGE_KEY);
      if (stored === "true") setDirectoryCollapsed(true);
    } catch {
      // localStorage may be unavailable (private mode, SSR, etc.); ignore.
    }
  }, []);

  const toggleDirectoryCollapsed = () => {
    setDirectoryCollapsed((current) => {
      const next = !current;
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(DIRECTORY_COLLAPSED_STORAGE_KEY, String(next));
        } catch {
          // Persist is best-effort; collapsed state still works for the session.
        }
      }
      return next;
    });
  };

  return (
    <aside className="pointer-events-none fixed left-4 top-24 z-40 flex w-[240px] max-w-[calc(100vw-2rem)] flex-col gap-3">
      <section className="pointer-events-auto rounded-2xl border border-amber-400/20 bg-black/78 p-3 shadow-2xl backdrop-blur">
        <button
          type="button"
          onClick={toggleDirectoryCollapsed}
          className="flex w-full items-center justify-between gap-2 rounded font-mono text-[10px] uppercase tracking-[0.18em] text-amber-200/70 transition-colors hover:text-amber-100"
          aria-expanded={!directoryCollapsed}
          aria-controls="office-floor-directory-body"
          aria-label={
            directoryCollapsed ? "건물 목록 펼치기" : "건물 목록 접기"
          }
        >
          <span>건물 목록</span>
          {directoryCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
        {!directoryCollapsed ? (
          <div id="office-floor-directory-body">
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                className="rounded border border-amber-500/20 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-amber-100/80 transition-colors hover:border-amber-400/45 hover:text-amber-50"
                onClick={() => onSelectFloor(getAdjacentEnabledOfficeFloorId(activeFloor.id, -1))}
                aria-label="이전 사용 가능 층으로 이동"
              >
                이전
              </button>
              <button
                type="button"
                className="rounded border border-amber-500/20 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-amber-100/80 transition-colors hover:border-amber-400/45 hover:text-amber-50"
                onClick={() => onSelectFloor(getAdjacentEnabledOfficeFloorId(activeFloor.id, 1))}
                aria-label="다음 사용 가능 층으로 이동"
              >
                다음
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                건물
              </div>
              {buildingFloors.map((floor) =>
                renderFloorButton({
                  floor,
                  activeFloorId: displayActiveFloorId,
                  floorRosterCache,
                  onSelectFloor,
                }),
              )}
            </div>
            {outsideFloors.length > 0 ? (
              <div className="mt-4 flex flex-col gap-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                  외부
                </div>
                {outsideFloors.map((floor) =>
                  renderFloorButton({
                    floor,
                    activeFloorId: displayActiveFloorId,
                    floorRosterCache,
                    onSelectFloor,
                  }),
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="pointer-events-auto rounded-2xl border border-white/10 bg-black/68 px-3 py-2 shadow-xl backdrop-blur">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
          현재 층
        </div>
        <div className="mt-1 text-sm font-semibold text-white">{activeFloor.label}</div>
        <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
          <span>{FLOOR_PROVIDER_LABELS[activeFloor.provider]}</span>
          <span>
            명단 {activeRoster?.entries.length ?? 0} | {formatRosterStatus(activeRoster?.status ?? "idle")}
          </span>
        </div>
      </section>
    </aside>
  );
}
