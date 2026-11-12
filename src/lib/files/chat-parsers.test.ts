import { describe, expect, it } from "vitest";

import { looksLikeWhatsApp, parseChatGpt, parseWhatsApp, rtfToText } from "./chat-parsers";
import { isUnsafeZipPath } from "./zip-safety";

describe("WhatsApp export", () => {
  const text = [
    "12/31/23, 9:41 PM - Messages and calls are end-to-end encrypted.",
    "12/31/23, 9:42 PM - Asha: Relay test is tomorrow",
    "12/31/23, 9:43 PM - Ravi: OK, bringing the multimeter",
    "and the spare fuse",
    "[01/01/2024, 10:05:11] Asha: Done",
  ].join("\n");

  it("is detected", () => expect(looksLikeWhatsApp(text)).toBe(true));

  it("keeps sender, timestamp and multi-line messages", () => {
    const { conversation } = parseWhatsApp(text);
    expect(conversation.messages).toHaveLength(4);
    expect(conversation.messages[1]).toEqual({ at: "12/31/23 9:42 PM", sender: "Asha", text: "Relay test is tomorrow" });
    expect(conversation.messages[2]?.text).toBe("OK, bringing the multimeter\nand the spare fuse");
    expect(conversation.messages[3]?.sender).toBe("Asha");
  });

  it("ordinary text is not treated as a chat", () => {
    expect(looksLikeWhatsApp("Meeting notes\nWe discussed the plan.\nNext steps below.")).toBe(false);
  });
});

describe("ChatGPT export", () => {
  const exportJson = [
    {
      title: "Relay testing",
      create_time: 1700000000,
      current_node: "c",
      mapping: {
        a: { parent: null, message: null },
        b: { parent: "a", message: { author: { role: "user" }, create_time: 1700000001, content: { parts: ["How to test?"] } } },
        c: { parent: "b", message: { author: { role: "assistant" }, create_time: 1700000002, content: { parts: ["Simulate a fault."] } } },
      },
    },
  ];

  it("keeps title, timestamps and messages in order", () => {
    const { conversations } = parseChatGpt(exportJson);
    expect(conversations[0]?.title).toBe("Relay testing");
    expect(conversations[0]?.createdAt).toBe(new Date(1700000000 * 1000).toISOString());
    expect(conversations[0]?.messages.map((m) => [m.sender, m.text])).toEqual([
      ["You", "How to test?"],
      ["ChatGPT", "Simulate a fault."],
    ]);
  });

  it("reports JSON that isn't a ChatGPT export", () => {
    expect(parseChatGpt({ hello: 1 }).conversations).toHaveLength(0);
  });
});

describe("ZIP safety", () => {
  it.each(["../evil.txt", "a/../../b", "/etc/passwd", "C:\\x.txt", "a\\..\\b"])("rejects %s", (p) => expect(isUnsafeZipPath(p)).toBe(true));
  it("allows normal nested paths", () => expect(isUnsafeZipPath("export/conversations.json")).toBe(false));
});

describe("RTF", () => {
  it("extracts readable text", () => {
    expect(rtfToText("{\\rtf1\\ansi{\\fonttbl{\\f0 Arial;}}\\f0 Hello\\par World}")).toBe("Hello\nWorld");
  });
});
