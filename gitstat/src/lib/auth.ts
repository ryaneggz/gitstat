import { getServerSession as getNextAuthServerSession } from "next-auth";
import type { NextAuthOptions, Session } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";

const providers: NextAuthOptions["providers"] = [
  GitHubProvider({
    clientId: process.env.GITHUB_ID ?? "",
    clientSecret: process.env.GITHUB_SECRET ?? "",
    authorization: {
      params: {
        scope: "read:user repo",
      },
    },
  }),
];

if (process.env.NODE_ENV !== "production") {
  providers.push(
    CredentialsProvider({
      id: "dev-credentials",
      name: "Dev Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials?.username === "admin" &&
          credentials?.password === "test1234"
        ) {
          return {
            id: "dev-agent",
            name: "Dev Agent",
            email: "dev@localhost",
            accessToken: process.env.GITHUB_TOKEN ?? "",
          };
        }
        return null;
      },
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      if (user && "accessToken" in user) {
        token.accessToken = (user as { accessToken: string }).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
};

export async function getServerSession(): Promise<Session | null> {
  return getNextAuthServerSession(authOptions);
}
