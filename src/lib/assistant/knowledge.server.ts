import type { Project, ProjectDocument } from "@/data/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { GeminiError, geminiErrorKind } from "./gemini.server";
import { chunkText } from "./policy";

const BUCKET = "project-documents";
/** Google Gemini embedding model, called directly with GEMINI_API_KEY (server only). */
const EMBED_MODEL = "gemini-embedding-2";
const DIMENSIONS = 768;

export type RetrievedChunk = { docId: string; docName: string; chunkIndex: number; content: string; similarity: number };

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");

async function docxText(bytes: Uint8Array): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("DOCX has no document body");
  const paragraphs = xml.split(/<\/w:p>/).map((p) => {
    const withBreaks = p.replace(/<w:tab\/>/g, "\t").replace(/<w:br[^>]*\/>/g, "\n");
    const texts = [...withBreaks.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|(\t|\n)/g)].map((m) => m[1] ?? m[2] ?? "");
    return decodeXml(texts.join("")).trim();
  });
  return paragraphs.filter(Boolean).join("\n\n");
}

async function pdfText(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: false });
  return (text as string[]).map((t, i) => `[Page ${i + 1}]\n${t.trim()}`).join("\n\n");
}

/** Extracts plain text from a supplied document; returns null for formats the assistant can't read. */
export async function extractDocumentText(doc: ProjectDocument, bytes: Uint8Array): Promise<string | null> {
  const name = doc.downloadName.toLowerCase();
  if (name.endsWith(".pdf")) return pdfText(bytes);
  if (name.endsWith(".docx")) return docxText(bytes);
  if (/\.(md|markdown|txt|csv|json)$/.test(name)) return new TextDecoder().decode(bytes);
  return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One Gemini batch embedding request; retries once on a free-tier rate limit before giving up. */
async function embedBatch(key: string, texts: string[]): Promise<number[][]> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: `models/${EMBED_MODEL}`,
          content: { parts: [{ text }] },
          outputDimensionality: DIMENSIONS,
        })),
      }),
    });
    if (res.ok) {
      const json = (await res.json()) as { embeddings?: { values?: number[] }[] };
      const rows = json.embeddings ?? [];
      if (rows.length !== texts.length) throw new GeminiError("unavailable", "Unexpected embedding count");
      return rows.map((r) => {
        if (!Array.isArray(r.values) || r.values.length !== DIMENSIONS) {
          throw new GeminiError("unavailable", "Unexpected embedding format");
        }
        return r.values;
      });
    }
    const body = await res.text().catch(() => "");
    console.error("[gemini-embed] HTTP", res.status, body.slice(0, 500));
    if (res.status === 429 && attempt === 0) {
      await sleep(3000);
      continue;
    }
    throw new GeminiError(geminiErrorKind(res.status), `Gemini embedding HTTP ${res.status}`);
  }
}

export async function embed(texts: string[]): Promise<number[][]> {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) throw new GeminiError("missing_key", "GEMINI_API_KEY is not set");
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 64) out.push(...(await embedBatch(key, texts.slice(i, i + 64))));
  return out;
}

const toVector = (v: number[]) => `[${v.join(",")}]`;

/**
 * Keeps this project's search index in step with its stored documents. A document is (re)indexed when
 * its storage object changes; chunks of documents no longer listed are removed. Returns the ids of
 * documents that are indexed and available.
 */
export async function ensureProjectIndex(project: Project): Promise<{ indexed: string[]; missing: string[] }> {
  if (project.documents.length === 0) return { indexed: [], missing: [] };

  const folder = project.id;
  const { data: objects, error: listErr } = await supabaseAdmin.storage.from(BUCKET).list(folder, { limit: 1000 });
  if (listErr) throw new Error(`Couldn't read the project's document storage: ${listErr.message}`);
  const byName = new Map((objects ?? []).map((o) => [`${folder}/${o.name}`, o]));

  const { data: existing, error: exErr } = await supabaseAdmin
    .from("project_knowledge_chunks")
    .select("doc_id, source_version")
    .eq("project_id", project.id);
  if (exErr) throw new Error(`Couldn't read the knowledge index: ${exErr.message}`);
  const versions = new Map((existing ?? []).map((r) => [r.doc_id, r.source_version]));

  const listedIds = new Set(project.documents.map((d) => d.id));
  const stale = [...versions.keys()].filter((id) => !listedIds.has(id));
  if (stale.length) await supabaseAdmin.from("project_knowledge_chunks").delete().eq("project_id", project.id).in("doc_id", stale);

  const indexed: string[] = [];
  const missing: string[] = [];
  for (const doc of project.documents) {
    const obj = byName.get(doc.storagePath);
    if (!obj) {
      missing.push(doc.id);
      if (versions.has(doc.id)) {
        await supabaseAdmin.from("project_knowledge_chunks").delete().eq("project_id", project.id).eq("doc_id", doc.id);
      }
      continue;
    }
    const meta = (obj.metadata ?? {}) as Record<string, unknown>;
    const version = `${String(meta["eTag"] ?? "")}|${String(meta["size"] ?? "")}|${obj.updated_at ?? ""}`;
    if (versions.get(doc.id) === version) {
      indexed.push(doc.id);
      continue;
    }

    const { data: blob, error: dlErr } = await supabaseAdmin.storage.from(BUCKET).download(doc.storagePath);
    if (dlErr || !blob) {
      console.error("[assistant] download failed", doc.storagePath, dlErr?.message);
      missing.push(doc.id);
      continue;
    }
    let text: string | null;
    try {
      text = await extractDocumentText(doc, new Uint8Array(await blob.arrayBuffer()));
    } catch (e) {
      console.error("[assistant] text extraction failed", doc.storagePath, e);
      missing.push(doc.id);
      continue;
    }
    if (!text?.trim()) {
      missing.push(doc.id);
      continue;
    }
    const chunks = chunkText(text);
    const vectors = await embed(chunks.map((c) => `${doc.name}\n\n${c}`));
    const rows = chunks.map((content, i) => ({
      project_id: project.id,
      doc_id: doc.id,
      doc_name: doc.name,
      source_version: version,
      chunk_index: i,
      content,
      embedding: toVector(vectors[i]!),
    }));
    const { error: upErr } = await supabaseAdmin
      .from("project_knowledge_chunks")
      .upsert(rows, { onConflict: "project_id,doc_id,chunk_index" });
    if (upErr) throw new Error(`Couldn't save the knowledge index: ${upErr.message}`);
    await supabaseAdmin
      .from("project_knowledge_chunks")
      .delete()
      .eq("project_id", project.id)
      .eq("doc_id", doc.id)
      .gte("chunk_index", chunks.length);
    indexed.push(doc.id);
  }
  return { indexed, missing };
}

/** Most relevant chunks for a question, only from the given documents of this one project. */
export async function retrieve(projectId: string, docIds: string[], query: string, count = 8): Promise<RetrievedChunk[]> {
  if (docIds.length === 0) return [];
  const [vector] = await embed([query]);
  const { data, error } = await supabaseAdmin.rpc("match_project_chunks", {
    _project_id: projectId,
    _doc_ids: docIds,
    _query: toVector(vector!),
    _count: count,
  });
  if (error) throw new Error(`Document search failed: ${error.message}`);
  return (data ?? []).map((r) => ({
    docId: r.doc_id,
    docName: r.doc_name,
    chunkIndex: r.chunk_index,
    content: r.content,
    similarity: r.similarity,
  }));
}
