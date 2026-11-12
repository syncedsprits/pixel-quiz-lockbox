import { useCallback, useEffect, useRef, useState } from "react";

import { processUpload, UploadError, type UploadStage } from "./process";
import { FILES_CHANGED_EVENT, listAllFiles, listFiles, type StoredFile } from "./store";

type FilesState = { files: StoredFile[]; loading: boolean; error: string | null };

/** Files uploaded to one project in this browser. Refreshes when any upload or delete happens. */
export function useProjectFiles(projectId: string | null) {
  const [state, setState] = useState<FilesState>({ files: [], loading: true, error: null });

  const load = useCallback(async () => {
    try {
      const files = projectId ? await listFiles(projectId) : await listAllFiles();
      setState({ files, loading: false, error: null });
    } catch (e) {
      setState({ files: [], loading: false, error: e instanceof Error ? e.message : "Couldn't read browser storage." });
    }
  }, [projectId]);

  useEffect(() => {
    void load();
    const onChange = (e: Event) => {
      const changed = (e as CustomEvent<{ projectId: string }>).detail?.projectId;
      if (!projectId || changed === projectId) void load();
    };
    window.addEventListener(FILES_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(FILES_CHANGED_EVENT, onChange);
  }, [load, projectId]);

  return state;
}

export interface QueueItem {
  key: string;
  file: File;
  status: "queued" | "uploading" | "done" | "failed";
  stage?: UploadStage | undefined;
  percent: number;
  error?: string | undefined;
  result?: StoredFile | undefined;
  projectId?: string | undefined;
}

let keySeq = 0;

/** A list of selected files that can be uploaded, retried and removed individually. */
export function useUploadQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const patch = (key: string, p: Partial<QueueItem>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));

  const add = useCallback((files: FileList | File[]) => {
    const next = Array.from(files).map<QueueItem>((file) => ({ key: `q${++keySeq}`, file, status: "queued", percent: 0 }));
    setItems((list) => [...list, ...next]);
  }, []);

  const remove = useCallback((key: string) => setItems((list) => list.filter((i) => i.key !== key)), []);
  const clearFinished = useCallback(() => setItems((list) => list.filter((i) => i.status !== "done")), []);

  const runOne = useCallback(async (item: QueueItem, projectId: string) => {
    patch(item.key, { status: "uploading", percent: 0, stage: "reading", error: undefined, projectId });
    try {
      const result = await processUpload(item.file, projectId, (p) => patch(item.key, { stage: p.stage, percent: p.percent }));
      patch(item.key, { status: "done", percent: 100, result });
      return true;
    } catch (e) {
      patch(item.key, { status: "failed", error: e instanceof UploadError ? e.message : "Something went wrong while processing this file." });
      return false;
    }
  }, []);

  /** Uploads every queued item one after another. Returns how many succeeded / failed. */
  const uploadAll = useCallback(
    async (projectId: string) => {
      const queued = itemsRef.current.filter((i) => i.status === "queued");
      let ok = 0;
      for (const item of queued) if (await runOne(item, projectId)) ok++;
      return { ok, failed: queued.length - ok };
    },
    [runOne],
  );

  const retry = useCallback(
    async (key: string, projectId: string) => {
      const item = itemsRef.current.find((i) => i.key === key);
      if (item) return runOne(item, projectId);
      return false;
    },
    [runOne],
  );

  return { items, add, remove, clearFinished, uploadAll, retry };
}
