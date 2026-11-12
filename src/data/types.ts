/** Project statuses shown in the Projects section. The completed status was removed by request. */
export type ProjectStatus = "in-progress" | "handover" | "on-hold";

export interface Person {
  name: string;
  role: string;
}

export interface Milestone {
  title: string;
  due: string;
  done: boolean;
}

export type DocumentKind = "doc" | "pdf" | "sheet" | "diagram" | "code" | "slides" | "text" | "image" | "archive" | "chat";

/** A reference document supplied with the project (bundled with the app, not user-uploaded). */
export interface ProjectDocument {
  id: string;
  /** Original file name exactly as supplied. */
  name: string;
  /** File name used when downloading (adds an extension if the original had none). */
  downloadName: string;
  kind: DocumentKind;
  typeLabel: string;
  mimeType: string;
  sizeBytes: number;
  /** Same-origin URL served by the access-checked file route. */
  url: string;
  /** Object path in the private "project-documents" storage bucket. */
  storagePath: string;
  /** Date the file was supplied (ISO date). */
  addedAt: string;
  description: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

/** Text that came from a supplied document, with the document it came from. */
export interface Sourced<T> {
  value: T;
  source: string;
}

export interface ArchitectureLayer {
  name: string;
  detail: string;
}

export interface Project {
  id: string;
  /** Short name used in compact places (breadcrumbs, selects). */
  shortName: string;
  /** Full project name shown on cards and headers. */
  name: string;
  description: string;
  status: ProjectStatus;
  website: string;
  repository: string;
  lead?: Person;
  team: Person[];
  teamSource?: string;
  /** Percentage only when documented; undefined shows "Not provided yet". */
  progress?: number;
  /** ISO timestamp of the last documented update, when known. */
  lastUpdated?: string;
  handoverDate?: Sourced<string>;
  lifecycle?: Sourced<string>;
  overview: Sourced<string[]> | null;
  /** True when the Project Overview section was removed from this project's page by request. */
  overviewRemoved?: boolean;
  stack: string[];
  stackSource?: string;
  architecture: {
    flow: Sourced<string[]>;
    layers: Sourced<ArchitectureLayer[]>;
    hardware?: Sourced<{ component: string; pin: string; logic: string }[]>;
    security?: Sourced<string[]>;
    access?: Sourced<{ headers: string[]; rows: string[][] }>;
    ai?: Sourced<string[]>;
    frontend?: Sourced<string[]>;
  } | null;
  decisions: Sourced<string>[];
  developmentStatus: { done: Sourced<string[]>; inProgress: Sourced<string[]> } | null;
  pendingTasks: Sourced<string>[];
  blockers: Sourced<string>[];
  /** Observations made while reading the documents that the team should confirm. Not verified facts. */
  toConfirm: string[];
  milestones: Milestone[];
  documents: ProjectDocument[];
  quiz: QuizQuestion[];
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  at: string;
  projectId?: string;
}
