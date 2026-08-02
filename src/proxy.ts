import { getIronSession } from "iron-session";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { type SessionData, sessionOptions } from "@/lib/session";

/**
 * Next 16's `middleware` is now `proxy`. Gate every page on a valid session
 * cookie: signed-out users go to /login, signed-in users never see /login.
 * iron-session is edge-safe (Web Crypto), so this runs without Node APIs.
 */
export async function proxy(request: NextRequest) {
  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    res,
    sessionOptions,
  );

  const isLogin = request.nextUrl.pathname === "/login";

  // Clone nextUrl so the redirect keeps the /ops basePath (a raw new URL() drops it).
  if (!session.userId && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (session.userId && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  // Run on everything except Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
