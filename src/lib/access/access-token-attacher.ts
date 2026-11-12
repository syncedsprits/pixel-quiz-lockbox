import { createMiddleware } from "@tanstack/react-start";

import { accessHeaders } from "./access-token";

/** Sends this browser session's project access tokens with every server function call. */
export const attachAccessTokens = createMiddleware({ type: "function" }).client(async ({ next }) =>
  next({ headers: accessHeaders() }),
);
