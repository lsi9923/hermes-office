import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { resolveUserPath } from "@/lib/clawdbot/paths";
import type { RemovableSkillSource, SkillRemoveRequest, SkillRemoveResult } from "@/lib/skills/types";

const resolveComparablePath = (input: string): string => {
  const resolved = path.resolve(input);
  if (!fs.existsSync(resolved)) {
    return resolved;
  }
  try {
    return fs.realpathSync(resolved);
  } catch {
    return resolved;
  }
};

const isPathInside = (root: string, candidate: string): boolean => {
  const resolvedRoot = resolveComparablePath(root);
  const resolvedCandidate = resolveComparablePath(candidate);
  if (resolvedCandidate === resolvedRoot) {
    return true;
  }
  const rootPrefix = resolvedRoot.endsWith(path.sep) ? resolvedRoot : `${resolvedRoot}${path.sep}`;
  return resolvedCandidate.startsWith(rootPrefix);
};

const normalizeRequiredPath = (value: string, field: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} 값이 필요합니다.`);
  }
  return resolveUserPath(trimmed, os.homedir);
};

const resolveAllowedRoot = (params: {
  source: RemovableSkillSource;
  workspaceDir: string;
  managedSkillsDir: string;
}): string => {
  if (params.source === "openclaw-managed") {
    return params.managedSkillsDir;
  }
  return path.join(params.workspaceDir, "skills");
};

export const removeSkillLocally = (params: SkillRemoveRequest): SkillRemoveResult => {
  const skillKey = params.skillKey.trim();
  if (!skillKey) {
    throw new Error("skillKey 값이 필요합니다.");
  }

  const source = params.source;
  const baseDir = normalizeRequiredPath(params.baseDir, "baseDir");
  const workspaceDir = normalizeRequiredPath(params.workspaceDir, "workspaceDir");
  const managedSkillsDir = normalizeRequiredPath(params.managedSkillsDir, "managedSkillsDir");

  const allowedRoot = resolveAllowedRoot({
    source,
    workspaceDir,
    managedSkillsDir,
  });

  if (!isPathInside(allowedRoot, baseDir)) {
    throw new Error(`허용된 루트 밖의 스킬은 제거할 수 없습니다: ${baseDir}`);
  }
  if (resolveComparablePath(allowedRoot) === resolveComparablePath(baseDir)) {
    throw new Error(`스킬 루트 디렉터리 자체는 제거할 수 없습니다: ${baseDir}`);
  }

  const exists = fs.existsSync(baseDir);
  if (exists) {
    const stats = fs.statSync(baseDir);
    if (!stats.isDirectory()) {
      throw new Error(`스킬 경로가 디렉터리가 아닙니다: ${baseDir}`);
    }
    const skillDocPath = path.join(baseDir, "SKILL.md");
    if (!fs.existsSync(skillDocPath) || !fs.statSync(skillDocPath).isFile()) {
      throw new Error(`스킬 디렉터리가 아닌 경로는 제거할 수 없습니다: ${baseDir}`);
    }
    fs.rmSync(baseDir, { recursive: true, force: false });
  }

  return {
    removed: exists,
    removedPath: baseDir,
    source,
  };
};
