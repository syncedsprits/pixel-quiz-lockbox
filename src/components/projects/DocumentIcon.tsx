import { FileArchive, FileCode2, FileImage, FileSpreadsheet, FileText, MessagesSquare, Network, Presentation } from "lucide-react";

import type { DocumentKind } from "@/data/types";

const icons = {
  doc: FileText,
  pdf: FileText,
  text: FileText,
  sheet: FileSpreadsheet,
  diagram: Network,
  code: FileCode2,
  slides: Presentation,
  image: FileImage,
  archive: FileArchive,
  chat: MessagesSquare,
} satisfies Record<DocumentKind, unknown>;

export function DocumentIcon({ kind }: { kind: DocumentKind }) {
  const Icon = icons[kind] ?? FileText;
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
      <Icon className="size-4" />
    </span>
  );
}
