import { cloudAdapter } from "./cloud-adapter";
import type { AuthAdapter } from "./types";

/** Single swap point for the app's sign-in provider. */
export const authAdapter: AuthAdapter = cloudAdapter;

export * from "./types";
