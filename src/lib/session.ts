import type { SessionOptions } from "iron-session";

/** Shape stored in the encrypted session cookie. */
export interface SessionData {
  userId?: number;
  username?: string;
  name?: string;
}

/**
 * iron-session config. Edge-safe (no next/headers, no Node crypto) so the
 * middleware can read the session too. SESSION_SECRET must be ≥ 32 chars.
 */
export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "",
  cookieName: "kes_ops_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  },
};
