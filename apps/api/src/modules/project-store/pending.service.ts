import { randomBytes } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import {
  PLATFORM_ERROR_CODES,
  PLATFORM_ERROR_STATUS,
} from '@bbartolome/scriba-contracts/platform';
import {
  FILE_SIZE_CAP_BYTES,
  PROJECT_ERROR_CODES,
  proposeInputSchema,
  type PendingChange,
  type PendingOrigin,
  type ProposeInput,
} from '@bbartolome/scriba-contracts/project-store';
import { EventsPublisher, ModuleError } from '../platform/platform.module';
import {
  decodeText,
  FILE_MESSAGES,
  hashOf,
  isRootProjectYaml,
  notAFile,
  readFileAt,
  refuse,
} from './files.service';
import {
  newPendingId,
  patternToRegExp,
  pendingFolder,
  readOpenChanges,
  writeChange,
} from './pending-store';
import { ProjectStoreService } from './project-store.service';
import { requireOkProject } from './project-status';
import { readYamlState } from './project-yaml';
import { ProjectsService } from './projects.service';
import { unifiedDiff } from './unified-diff';

// A per-path check of proposed content. It returns true when the content passes (PST-15 decision 11).
export type PendingValidator = (content: string) => boolean;

interface RegisteredValidator {
  regex: RegExp;
  check: PendingValidator;
}

// The fixed messages of propose. No input value is echoed.
const PENDING_MESSAGES = {
  INVALID: 'The proposed change is not valid.',
  VALIDATION: 'The proposed content does not pass the check for that file.',
} as const;

// Two origins name the same change when they have the same kind and run; a recipe run also has the same node.
function sameOrigin(a: PendingOrigin, b: PendingOrigin): boolean {
  if (a.runId !== b.runId || a.kind !== b.kind) return false;
  if (a.kind === 'recipe-run' && b.kind === 'recipe-run') {
    return a.nodeId === b.nodeId;
  }
  return true;
}

// The in-process provider of the pending-change store. It has no route: other modules call it.
@Injectable()
export class PendingService {
  private readonly validators: RegisteredValidator[] = [];

  constructor(
    private readonly store: ProjectStoreService,
    private readonly projects: ProjectsService,
    private readonly events: EventsPublisher,
  ) {}

  // Registers a check for every project path that matches pattern (PST-15 decision 11). All matching checks run in
  // registration order; the first failure refuses the proposal.
  registerValidator(pattern: string, check: PendingValidator): void {
    this.validators.push({ regex: patternToRegExp(pattern), check });
  }

  // Proposes a full new text for one file of an ok project. Nothing at the target is changed. A change of the same
  // target from the same origin is folded into the open one (PST-15 decision 9).
  propose(input: ProposeInput): PendingChange {
    const parsed = proposeInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new ModuleError(
        PLATFORM_ERROR_CODES.VALIDATION_FAILED,
        PLATFORM_ERROR_STATUS.PLATFORM_VALIDATION_FAILED,
        PENDING_MESSAGES.INVALID,
      );
    }
    const { projectId, path, content, base, origin, provenance, grounding } =
      parsed.data;
    const project = requireOkProject(this.projects.find(projectId));
    const target = this.store.resolvePath(project.root, path);
    if (
      target.isRoot ||
      (target.exists && statSync(target.realPath).isDirectory())
    ) {
      throw notAFile();
    }
    if (Buffer.byteLength(content, 'utf8') > FILE_SIZE_CAP_BYTES) {
      throw refuse(PROJECT_ERROR_CODES.FILE_TOO_LARGE, FILE_MESSAGES.TOO_LARGE);
    }
    if (isRootProjectYaml(target.relativePath)) {
      const state = readYamlState(content);
      if (state.status !== 'ok') {
        throw refuse(
          PROJECT_ERROR_CODES.VALIDATION_FAILED,
          PENDING_MESSAGES.VALIDATION,
          state.status === 'invalid' ? state.issues : undefined,
        );
      }
    }
    for (const validator of this.validators) {
      if (!validator.regex.test(target.relativePath)) continue;
      let passed: boolean;
      try {
        passed = validator.check(content);
      } catch {
        passed = false;
      }
      if (!passed) {
        throw refuse(
          PROJECT_ERROR_CODES.VALIDATION_FAILED,
          PENDING_MESSAGES.VALIDATION,
        );
      }
    }

    const now = new Date();
    const iso = now.toISOString();
    const openFolder = pendingFolder(project, false);
    const existing = readOpenChanges(openFolder).find(
      (change) =>
        change.targetPath === target.relativePath &&
        sameOrigin(change.origin, origin),
    );
    if (existing !== undefined) {
      const updated: PendingChange = {
        id: existing.id,
        projectId: existing.projectId,
        targetPath: existing.targetPath,
        kind: existing.kind,
        diff: unifiedDiff(
          existing.targetPath,
          existing.capturedBase?.content ?? null,
          content,
        ),
        capturedBase: existing.capturedBase,
        proposed: content,
        origin,
        status: existing.status,
        conflict: null,
        createdAt: existing.createdAt,
        updatedAt: iso,
        ...(provenance !== undefined ? { provenance } : {}),
        ...(grounding !== undefined ? { grounding } : {}),
      };
      writeChange(openFolder as string, updated);
      this.events.publish({
        module: 'project-store',
        type: 'pending-updated',
        data: { projectId: project.id, pendingChange: updated },
      });
      return updated;
    }

    // The captured base: the caller's text, else the disk at this first propose, else nothing (a create).
    let kind: 'create' | 'modify';
    let capturedBase: { hash: string; content: string } | null;
    if (base !== undefined) {
      kind = 'modify';
      capturedBase = {
        hash: hashOf(Buffer.from(base.content, 'utf8')),
        content: base.content,
      };
    } else if (target.exists) {
      const { bytes } = readFileAt(target);
      const text = decodeText(bytes);
      if (text === undefined) {
        throw refuse(PROJECT_ERROR_CODES.NOT_TEXT, FILE_MESSAGES.NOT_TEXT);
      }
      kind = 'modify';
      capturedBase = { hash: hashOf(bytes), content: text };
    } else {
      kind = 'create';
      capturedBase = null;
    }

    const folder = pendingFolder(project, true) as string;
    let id = newPendingId(now);
    for (
      let attempt = 0;
      attempt < 5 && existsSync(join(folder, `${id}.json`));
      attempt++
    ) {
      id = newPendingId(now);
    }
    const change: PendingChange = {
      id,
      projectId: project.id,
      targetPath: target.relativePath,
      kind,
      diff: unifiedDiff(
        target.relativePath,
        capturedBase?.content ?? null,
        content,
      ),
      capturedBase,
      proposed: content,
      origin,
      status: 'pending',
      conflict: null,
      createdAt: iso,
      updatedAt: iso,
      ...(provenance !== undefined ? { provenance } : {}),
      ...(grounding !== undefined ? { grounding } : {}),
    };
    writeChange(folder, change);
    this.events.publish({
      module: 'project-store',
      type: 'pending-created',
      data: { projectId: project.id, pendingChange: change },
    });
    return change;
  }
}
