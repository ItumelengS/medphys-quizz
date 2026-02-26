import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase/server";
import { authConfig } from "@/lib/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const supabase = createServiceClient();
        const { data, error } = await supabase
          .rpc("get_user_by_email", { p_email: email })
          .single();

        const user = data as { id: string; name: string; email: string; password_hash: string } | null;
        if (error || !user?.password_hash) return null;

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async session({ session, token }) {
      const userId = token.id as string;
      const supabase = createServiceClient();

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, xp, role")
        .eq("id", userId)
        .single();

      if (!profile) {
        const displayName =
          session.user?.name || session.user?.email?.split("@")[0] || "Player";
        await supabase.from("profiles").insert({
          id: userId,
          display_name: displayName,
          xp: 0,
          role: "player",
        });
        await supabase.from("user_stats").insert({ user_id: userId });
        await supabase.from("daily_challenges").insert({ user_id: userId });

        session.user.role = "player";
        session.user.displayName = displayName;
        session.user.xp = 0;
      } else {
        session.user.role = profile.role;
        session.user.displayName = profile.display_name;
        session.user.xp = profile.xp;
      }

      session.user.id = userId;
      return session;
    },
  },
});
