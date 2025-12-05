// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Force Google to show the account chooser so users can pick a different email
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // Expose the Prisma user id on the client session object as `session.user.id`
    async session({ session, user }: { session: any; user: any }) {
      if (session?.user) {
        // attach id for client-side code
        (session.user as any).id = user.id;
      }
      return session;
    },
    // Log provider/profile/account info during sign-in for debugging account linking issues
    async signIn(params: any) {
      const { user, account, profile } = params;
      try {
        console.log("NextAuth signIn callback", {
          userId: user?.id,
          provider: account?.provider,
          providerAccountId: account?.providerAccountId,
          profileEmail: profile?.email,
        });
      } catch (e) {
        console.warn("Error logging signIn callback", e);
      }
      return true;
    },
  },
  events: {
    async signIn(message: any) {
      console.log("NextAuth signIn event:", message);
    },
    async signOut(message: any) {
      console.log("NextAuth signOut event:", message);
    },
    async createUser(message: any) {
      console.log("NextAuth createUser event:", message);
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
