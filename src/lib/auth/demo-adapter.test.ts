import { beforeEach, describe, expect, it } from "vitest";

import { DEMO_SESSION_KEY, demoAdapter } from "./demo-adapter";
import { nameFromEmail } from "./validation";

describe("Demo Mode sign-in", () => {
  beforeEach(() => window.localStorage.clear());

  it("accepts any valid email with an 8+ character password", async () => {
    const result = await demoAdapter.signIn({ email: "priya@northwind.io", password: "12345678" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.mode).toBe("demo");
      expect(result.session.user.email).toBe("priya@northwind.io");
    }
  });

  it("rejects an invalid email address", async () => {
    const result = await demoAdapter.signIn({ email: "not-an-email", password: "12345678" });
    expect(result.ok).toBe(false);
  });

  it("rejects a password shorter than 8 characters", async () => {
    const result = await demoAdapter.signIn({ email: "priya@northwind.io", password: "1234567" });
    expect(result.ok).toBe(false);
  });

  it("never stores the password in the session", async () => {
    await demoAdapter.signIn({ email: "priya@northwind.io", password: "SecretPass99" });
    expect(window.localStorage.getItem(DEMO_SESSION_KEY)).not.toContain("SecretPass99");
  });

  it("signs out by clearing the session", async () => {
    await demoAdapter.signIn({ email: "priya@northwind.io", password: "12345678" });
    await demoAdapter.signOut();
    expect(await demoAdapter.getSession()).toBeNull();
  });

  it("derives a display name from the email", () => {
    expect(nameFromEmail("kaviya.dharshini@acme.com")).toBe("Kaviya Dharshini");
  });
});
