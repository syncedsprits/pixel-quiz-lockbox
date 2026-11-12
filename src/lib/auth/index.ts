import { demoAdapter } from "./demo-adapter";
import type { AuthAdapter } from "./types";

/** Single swap point: replace with a production adapter when real authentication is enabled. */
export const authAdapter: AuthAdapter = demoAdapter;

export * from "./types";
