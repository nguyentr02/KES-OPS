import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { users } from "@/db/schema";
import { type SessionData, sessionOptions } from "@/lib/session";

/** Read the session in a server component or server action. */
export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

/** The logged-in user, or null. */
export async function currentUser() {
  const session = await getSession();
  if (!session.userId) return null;
  return {
    id: session.userId,
    username: session.username ?? "",
    name: session.name ?? "",
  };
}

/** Guard for protected pages — redirects to /login when signed out. */
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/** Returns the user on a correct password, else null. */
export async function verifyCredentials(username: string, password: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}
