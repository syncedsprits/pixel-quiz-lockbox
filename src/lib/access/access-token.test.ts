import { beforeEach, describe, expect, it } from "vitest";

import { accessHeaders, clearAllAccessTokens, parseAccessTokens, readAccessTokens, storeAccessToken } from "./access-token";

const token = "a".repeat(64);

describe("project access tokens", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("are kept for the browser session only (sessionStorage, not localStorage)", () => {
    storeAccessToken("trans-shield", token);
    expect(readAccessTokens()).toEqual({ "trans-shield": token });
    expect(window.localStorage.length).toBe(0);
  });

  it("are dropped on log out", () => {
    storeAccessToken("trans-shield", token);
    clearAllAccessTokens();
    expect(accessHeaders()).toEqual({});
  });

  it("ignore malformed values sent to the server", () => {
    expect(parseAccessTokens('{"trans-shield":"short","x":"' + token + '"}')).toEqual({ x: token });
    expect(parseAccessTokens("not json")).toEqual({});
  });
});
