import NextAuth, { CredentialsSignin } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

class InvalidLoginError extends CredentialsSignin {
    code = "Invalid email or password";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new InvalidLoginError();
                }
                await dbConnect();
                const user = await User.findOne({ email: credentials.email });

                if (!user || !user.password) {
                    throw new InvalidLoginError();
                }

                const isPasswordMatch = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                if (!isPasswordMatch) {
                    throw new InvalidLoginError();
                }

                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    businessName: user.businessName
                };
            }
        })
    ],
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
                maxAge: 30 * 24 * 60 * 60, // 30 days
            },
        },
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.businessName = (user as any).businessName;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                (session.user as any).role = token.role as string;
                (session.user as any).businessName = token.businessName as string;
            }
            return session;
        }
    }
});
