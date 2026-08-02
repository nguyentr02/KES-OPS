"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getSession, verifyCredentials } from "@/lib/auth";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = schema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Vui lòng nhập tên đăng nhập và mật khẩu." };
  }

  const user = await verifyCredentials(parsed.data.username, parsed.data.password);
  if (!user) {
    return { error: "Sai tên đăng nhập hoặc mật khẩu." };
  }

  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  session.name = user.name;
  await session.save();

  redirect("/");
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
