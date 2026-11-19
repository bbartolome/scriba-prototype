import { Injectable } from '@nestjs/common';
import {
  COMPILE_ERROR_CODES,
  COMPILE_ERROR_STATUS,
  MANUSCRIPT_STATUS_DEFAULT,
  type CompileErrorCode,
  type ManuscriptPartRequest,
  type ManuscriptReorderRequest,
  type ManuscriptStatus,
  type ManuscriptStatusRequest,
  type ManuscriptView,
  type OrderEntry,
} from '@bbartolome/scriba-contracts/compile-export';
import { PROJECT_ERROR_CODES, PROJECT_ERROR_STATUS } from '@bbartolome/scriba-contracts/project-store';
import { EventsPublisher, ModuleError } from '../platform/platform.module';
import {
  FilesService,
  ProjectStoreService,
} from '../project-store/project-store.module';
import { ManuscriptService } from './manuscript.service';
import {
  blockOf,
  extrasOf,
  materialise,
  movePart,
  partsOf,
  rowsFromLists,
  rowsOf,
  samePerPart,
  sameOrder,
  type PartLists,
} from './order-write';

// Fixed messages of the writes. No input value is echoed (P12).
const NO_ACTIVE_MESSAGE = 'No project is active. Activate a project first.';
const CONFLICT_MESSAGE =
  'The manuscript changed since it was read. Reload it and try again.';
const INVALID_REORDER_MESSAGE =
  'A reorder must list every manuscript file once, in its own part.';
const GRAPH_MOVE_MESSAGE =
  'Graph-ordered files keep their place and part. Change them in the story graph.';
const NOT_FOUND_MESSAGE =
  'The file is not a manuscript file of the active project.';

// The state that every write starts from: the project, the current view, and the current order field's entries.
interface Start {
  projectId: string;
  current: ManuscriptView;
  extras: Map<string, OrderEntry>;
}

// The manuscript writes (P1, P3 to P4, P6, P9 to P13). Each write refuses before it writes, and publishes
// manuscript-updated only after its one updateProjectYaml call.
@Injectable()
export class ManuscriptWriteService {
  constructor(
    private readonly manuscript: ManuscriptService,
    private readonly store: ProjectStoreService,
    private readonly files: FilesService,
    private readonly events: EventsPublisher,
  ) {}

  // POST reorder: the three lists become the order (P5, P13).
  reorder(request: ManuscriptReorderRequest): ManuscriptView {
    const start = this.begin(request.revision);
    const lists: PartLists = {
      front: request.front,
      body: request.body,
      back: request.back,
    };
    if (!samePerPart(partsOf(start.current.entries), lists)) {
      throw refuse(COMPILE_ERROR_CODES.INVALID_REORDER, INVALID_REORDER_MESSAGE);
    }
    // A reorder changes neither parts nor graphs, so the candidate keeps the block where it is and the requested
    // body must start with it. Any other order would not be the effective order that the next view shows.
    const candidate = this.manuscript.preview(
      materialise(rowsFromLists(lists, this.statusOf(start)), start.extras),
    );
    const requested = [...request.front, ...request.body, ...request.back];
    if (!sameOrder(candidate.entries.map((entry) => entry.path), requested)) {
      throw refuse(COMPILE_ERROR_CODES.GRAPH_ORDERED_MOVE, GRAPH_MOVE_MESSAGE);
    }
    return this.commit(start, candidate);
  }

  // POST status: one entry's status. Positions and parts are kept, so graphs do not matter (P9).
  setStatus(request: ManuscriptStatusRequest): ManuscriptView {
    const start = this.begin(request.revision);
    this.requireMember(start, request.path);
    const rows = rowsOf(start.current.entries).map((row) =>
      row.path === request.path ? { ...row, status: request.status } : row,
    );
    const candidate = this.manuscript.preview(
      materialise(rows, start.extras),
    );
    return this.commit(start, candidate);
  }

  // POST part: one entry's part. The file goes to the end of its new part (P8). The graph-ordered block must not
  // change (P13).
  setPart(request: ManuscriptPartRequest): ManuscriptView {
    const start = this.begin(request.revision);
    this.requireMember(start, request.path);
    const lists = movePart(
      partsOf(start.current.entries),
      request.path,
      request.part,
    );
    const candidate = this.manuscript.preview(
      materialise(rowsFromLists(lists, this.statusOf(start)), start.extras),
    );
    if (!sameOrder(blockOf(candidate), blockOf(start.current))) {
      throw refuse(COMPILE_ERROR_CODES.GRAPH_ORDERED_MOVE, GRAPH_MOVE_MESSAGE);
    }
    return this.commit(start, candidate);
  }

  // The active project and the current state. A stale revision is refused whatever the request holds (P4).
  private begin(revision: string): Start {
    const projectId = this.activeProjectId();
    const current = this.manuscript.view();
    if (current.revision !== revision) {
      throw refuse(COMPILE_ERROR_CODES.ORDER_CONFLICT, CONFLICT_MESSAGE);
    }
    return {
      projectId,
      current,
      extras: extrasOf(this.manuscript.orderField()),
    };
  }

  // The current status of each path (P8). Every path given to it is a current member.
  private statusOf(start: Start): (path: string) => ManuscriptStatus {
    const statuses = new Map(
      start.current.entries.map((entry) => [entry.path, entry.status]),
    );
    return (path) => statuses.get(path) ?? MANUSCRIPT_STATUS_DEFAULT;
  }

  // P6: a path that is not a current manuscript file is refused with the Project store's not-found code.
  private requireMember(start: Start, path: string): void {
    if (!start.current.entries.some((entry) => entry.path === path)) {
      throw new ModuleError(
        PROJECT_ERROR_CODES.NOT_FOUND,
        PROJECT_ERROR_STATUS.PROJECT_NOT_FOUND,
        NOT_FOUND_MESSAGE,
      );
    }
  }

  // The one write of a passed check (P11): every file gets an entry in the candidate's effective order, then
  // manuscript-updated carries the revision of the fresh view, which is the response.
  private commit(start: Start, candidate: ManuscriptView): ManuscriptView {
    const field = materialise(rowsOf(candidate.entries), start.extras);
    this.files.updateProjectYaml(start.projectId, { order: field });
    const written = this.manuscript.view();
    this.events.publish({
      module: 'compile-export',
      type: 'manuscript-updated',
      data: { projectId: start.projectId, revision: written.revision },
    });
    return written;
  }

  // The active project's id (P3). A null id is refused as in the view (P6 of CEX-02).
  private activeProjectId(): string {
    const projectId = this.store.activeId();
    if (projectId === null) {
      throw new ModuleError(
        PROJECT_ERROR_CODES.NO_ACTIVE,
        PROJECT_ERROR_STATUS.PROJECT_NO_ACTIVE,
        NO_ACTIVE_MESSAGE,
      );
    }
    return projectId;
  }
}

// A refusal of a compile-export code, with the status the contract gives it.
function refuse(code: CompileErrorCode, message: string): ModuleError {
  return new ModuleError(code, COMPILE_ERROR_STATUS[code], message);
}
