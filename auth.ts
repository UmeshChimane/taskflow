import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getSessionUser, getUserByEmail } from "@/lib/user";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        const user = await getUserByEmail(email);

        if (!user) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          password,
          user.password
        );

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user._id?.toString(),
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token }) {
      // Ignore client session updates: identity comes from the verified JWT and DB.
      if (typeof token.sub !== "string" || typeof token.email !== "string") return null;
      const user = await getSessionUser(token.sub, token.email);
      if (!user) return null;
      return { ...token, name: user.name, email: user.email, picture: user.avatarUpdatedAt ? `/api/avatar/${user._id}?v=${new Date(user.avatarUpdatedAt).getTime()}` : undefined };
    },
  },
});
