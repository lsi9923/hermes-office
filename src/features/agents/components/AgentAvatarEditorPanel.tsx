"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { RefreshCcw, Shuffle } from "lucide-react";
import {
  AGENT_AVATAR_BOTTOM_STYLE_OPTIONS,
  AGENT_AVATAR_CLOTHING_COLOR_OPTIONS,
  AGENT_AVATAR_HAIR_COLOR_OPTIONS,
  AGENT_AVATAR_HAIR_STYLE_OPTIONS,
  AGENT_AVATAR_HAT_STYLE_OPTIONS,
  AGENT_AVATAR_SHOE_COLOR_OPTIONS,
  AGENT_AVATAR_SKIN_TONE_OPTIONS,
  AGENT_AVATAR_TOP_STYLE_OPTIONS,
  type AgentAvatarProfile,
  createDefaultAgentAvatarProfile,
} from "@/lib/avatars/profile";
import { AgentAvatarPreview3D } from "@/features/agents/components/AgentAvatarPreview3D";
import { randomUUID } from "@/lib/uuid";

export type AgentAvatarEditorPanelProps = {
  agentId: string;
  agentName: string;
  initialProfile: AgentAvatarProfile | null | undefined;
  onSave: (profile: AgentAvatarProfile) => Promise<void> | void;
  onDraftChange?: (profile: AgentAvatarProfile) => void;
  onCancel?: () => void;
  onSaved?: () => void;
  cancelLabel?: string;
  saveLabel?: string;
  showActions?: boolean;
};

export type AgentAvatarEditorPanelHandle = {
  save: () => Promise<void>;
};

const pillClassName =
  "rounded-full border px-3 py-1.5 text-[11px] transition-colors";

const colorSwatchClassName =
  "h-7 w-7 rounded-full border-2 transition-transform hover:scale-105";

export const AgentAvatarEditorPanel = forwardRef<
  AgentAvatarEditorPanelHandle,
  AgentAvatarEditorPanelProps
>(function AgentAvatarEditorPanel(
  {
    agentId,
    agentName,
    initialProfile,
    onSave,
    onDraftChange,
    onCancel,
    onSaved,
    cancelLabel = "취소",
    saveLabel = "아바타 저장",
    showActions = true,
  }: AgentAvatarEditorPanelProps,
  ref
) {
  const fallbackProfile = useMemo(
    () => createDefaultAgentAvatarProfile(agentId),
    [agentId]
  );
  const resolvedInitialProfile = initialProfile ?? fallbackProfile;
  const [draft, setDraft] = useState<AgentAvatarProfile>(resolvedInitialProfile);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(resolvedInitialProfile);
  }, [resolvedInitialProfile]);

  useEffect(() => {
    onDraftChange?.(draft);
  }, [draft, onDraftChange]);

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(draft);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }, [draft, onSave, onSaved, saving]);

  useImperativeHandle(
    ref,
    () => ({
      save,
    }),
    [save]
  );

  return (
    <div className="grid h-full min-h-0 gap-0 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="border-b border-border/45 p-5 xl:border-b-0 xl:border-r">
        <div className="font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground">
          아바타 생성기
        </div>
        <div className="mt-1 text-lg font-semibold text-foreground">{agentName}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          이 컴퓨터에서 오피스 아바타를 개인화합니다.
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-border/45 bg-[#070b16]">
          <AgentAvatarPreview3D profile={draft} className="h-[360px] w-full" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="ui-btn-secondary inline-flex items-center gap-2 px-3 py-2 text-xs"
            onClick={() => setDraft(createDefaultAgentAvatarProfile(agentId))}
            disabled={saving}
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            초기화
          </button>
          <button
            type="button"
            className="ui-btn-secondary inline-flex items-center gap-2 px-3 py-2 text-xs"
            onClick={() => setDraft(createDefaultAgentAvatarProfile(randomUUID()))}
            disabled={saving}
          >
            <Shuffle className="h-3.5 w-3.5" />
            랜덤
          </button>
        </div>
      </div>

      <div className="min-h-0 overflow-y-auto p-5">
        {showActions ? (
          <div className="mb-6 flex items-center justify-end gap-2 border-b border-border/40 pb-4">
            <button
              type="button"
              className="ui-btn-ghost px-3 py-2 text-xs"
              onClick={onCancel}
              disabled={saving}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className="ui-btn-primary px-3 py-2 text-xs"
              onClick={() => {
                void save();
              }}
              disabled={saving}
            >
              {saving ? "저장 중..." : saveLabel}
            </button>
          </div>
        ) : null}
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="space-y-3">
            <h3 className="font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground">
              피부 톤
            </h3>
            <div className="flex flex-wrap gap-2">
              {AGENT_AVATAR_SKIN_TONE_OPTIONS.map((option) => {
                const selected = draft.body.skinTone === option.color;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-label={option.label}
                    className={`${colorSwatchClassName} ${selected ? "border-white" : "border-white/15"}`}
                    style={{ backgroundColor: option.color }}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        body: { ...current.body, skinTone: option.color },
                      }))
                    }
                  />
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground">
              헤어 스타일
            </h3>
            <div className="flex flex-wrap gap-2">
              {AGENT_AVATAR_HAIR_STYLE_OPTIONS.map((option) => {
                const selected = draft.hair.style === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`${pillClassName} ${
                      selected
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border/50 bg-muted/30 text-muted-foreground"
                    }`}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        hair: { ...current.hair, style: option.id },
                      }))
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground">
              머리색
            </h3>
            <div className="flex flex-wrap gap-2">
              {AGENT_AVATAR_HAIR_COLOR_OPTIONS.map((option) => {
                const selected = draft.hair.color === option.color;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-label={option.label}
                    className={`${colorSwatchClassName} ${selected ? "border-white" : "border-white/15"}`}
                    style={{ backgroundColor: option.color }}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        hair: { ...current.hair, color: option.color },
                      }))
                    }
                  />
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground">
              상의 스타일
            </h3>
            <div className="flex flex-wrap gap-2">
              {AGENT_AVATAR_TOP_STYLE_OPTIONS.map((option) => {
                const selected = draft.clothing.topStyle === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`${pillClassName} ${
                      selected
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border/50 bg-muted/30 text-muted-foreground"
                    }`}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        clothing: { ...current.clothing, topStyle: option.id },
                      }))
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground">
              상의 색
            </h3>
            <div className="flex flex-wrap gap-2">
              {AGENT_AVATAR_CLOTHING_COLOR_OPTIONS.map((option) => {
                const selected = draft.clothing.topColor === option.color;
                return (
                  <button
                    key={`top-${option.id}`}
                    type="button"
                    aria-label={option.label}
                    className={`${colorSwatchClassName} ${selected ? "border-white" : "border-white/15"}`}
                    style={{ backgroundColor: option.color }}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        clothing: { ...current.clothing, topColor: option.color },
                      }))
                    }
                  />
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground">
              하의 스타일
            </h3>
            <div className="flex flex-wrap gap-2">
              {AGENT_AVATAR_BOTTOM_STYLE_OPTIONS.map((option) => {
                const selected = draft.clothing.bottomStyle === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`${pillClassName} ${
                      selected
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border/50 bg-muted/30 text-muted-foreground"
                    }`}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        clothing: { ...current.clothing, bottomStyle: option.id },
                      }))
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground">
              하의 색
            </h3>
            <div className="flex flex-wrap gap-2">
              {AGENT_AVATAR_CLOTHING_COLOR_OPTIONS.map((option) => {
                const selected = draft.clothing.bottomColor === option.color;
                return (
                  <button
                    key={`bottom-${option.id}`}
                    type="button"
                    aria-label={option.label}
                    className={`${colorSwatchClassName} ${selected ? "border-white" : "border-white/15"}`}
                    style={{ backgroundColor: option.color }}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        clothing: { ...current.clothing, bottomColor: option.color },
                      }))
                    }
                  />
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground">
              신발 색
            </h3>
            <div className="flex flex-wrap gap-2">
              {AGENT_AVATAR_SHOE_COLOR_OPTIONS.map((option) => {
                const selected = draft.clothing.shoesColor === option.color;
                return (
                  <button
                    key={`shoes-${option.id}`}
                    type="button"
                    aria-label={option.label}
                    className={`${colorSwatchClassName} ${selected ? "border-white" : "border-white/15"}`}
                    style={{ backgroundColor: option.color }}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        clothing: { ...current.clothing, shoesColor: option.color },
                      }))
                    }
                  />
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground">
              모자
            </h3>
            <div className="flex flex-wrap gap-2">
              {AGENT_AVATAR_HAT_STYLE_OPTIONS.map((option) => {
                const selected = draft.accessories.hatStyle === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`${pillClassName} ${
                      selected
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border/50 bg-muted/30 text-muted-foreground"
                    }`}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        accessories: { ...current.accessories, hatStyle: option.id },
                      }))
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3 xl:col-span-2">
            <h3 className="font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground">
              액세서리
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                {
                  key: "glasses" as const,
                  label: "안경",
                  enabled: draft.accessories.glasses,
                },
                {
                  key: "headset" as const,
                  label: "헤드셋",
                  enabled: draft.accessories.headset,
                },
                {
                  key: "backpack" as const,
                  label: "백팩",
                  enabled: draft.accessories.backpack,
                },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`${pillClassName} ${
                    option.enabled
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border/50 bg-muted/30 text-muted-foreground"
                  }`}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      accessories: {
                        ...current.accessories,
                        [option.key]: !current.accessories[option.key],
                      },
                    }))
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>
        </div>

      </div>
    </div>
  );
});
