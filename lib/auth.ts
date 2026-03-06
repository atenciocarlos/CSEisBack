import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Fail loudly at module load time if NEXTAUTH_SECRET is missing
if (!process.env.NEXTAUTH_SECRET) {
    throw new Error(
        "FATAL: NEXTAUTH_SECRET environment variable is not set. " +
        "Generate one with: openssl rand -base64 32"
    );
}

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/", // The root page serves as our login/register page
    },
    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: "strict",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
    },
    providers: [
        CredentialsProvider({
            name: "Alias",
            credentials: {
                alias: { label: "Tech Alias", type: "text", placeholder: "e.g. jaredc" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.alias || !credentials?.password) {
                    throw new Error("Missing alias or password");
                }

                const user = await prisma.user.findUnique({
                    where: { alias: credentials.alias },
                });

                if (!user) {
                    throw new Error("Invalid alias or password");
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

                if (!isPasswordValid) {
                    throw new Error("Invalid alias or password");
                }

                return {
                    id: user.id,
                    name: user.alias, // Store alias in the standard 'name' field for easy access
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.alias = user.name;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.name = token.alias as string;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};
