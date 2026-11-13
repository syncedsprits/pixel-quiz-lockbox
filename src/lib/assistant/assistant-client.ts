import { callRemote, remoteBackendOrigin } from "@/lib/backend/remote-backend";
import { askAssistant as askAssistantFn, type AssistantReply } from "./assistant.functions";

/** Asks the project assistant on this site's server, or on the Lovable-hosted backend when configured. */
export function askAssistant({
  data,
}: {
  data: { projectId: string; question: string; history: { role: "user" | "assistant"; content: string }[] };
}): Promise<AssistantReply> {
  const origin = remoteBackendOrigin();
  return origin ? callRemote<AssistantReply>(origin, "ask-assistant", data) : askAssistantFn({ data });
}
