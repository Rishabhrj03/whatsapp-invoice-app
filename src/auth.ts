import NextAuth, { CredentialsSignin } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

class CustomAuthError extends CredentialsSignin {
    constructor(message: string) {
        super(message);
        this.code = message;
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        CredentialsProvider({
            id: "credentials",
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new CustomAuthError("Invalid email or password");
                }
                await dbConnect();
                const normalizedEmail = (credentials.email as string).toLowerCase().trim();
                const user = await User.findOne({ email: normalizedEmail });

                if (!user || !user.password) {
                    throw new CustomAuthError("Invalid email or password");
                }

                const isPasswordMatch = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                if (!isPasswordMatch) {
                    throw new CustomAuthError("Invalid email or password");
                }

                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    businessName: user.businessName
                };
            }
        }),
        CredentialsProvider({
            id: "email-otp",
            name: "Email OTP",
            credentials: {
                email: { label: "Email", type: "email" },
                otp: { label: "OTP", type: "text" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.otp) {
                    throw new CustomAuthError("Please provide both email and verification code");
                }

                const email = (credentials.email as string).toLowerCase().trim();
                const otp = (credentials.otp as string).trim();

                if (!/^\d{6}$/.test(otp)) {
                    throw new CustomAuthError("Verification code must be exactly 6 digits");
                }

                await dbConnect();
                const user = await User.findOne({ email });

                if (!user) {
                    throw new CustomAuthError("No account found with this email");
                }

                const EmailOtp = (await import("@/models/EmailOtp")).default;
                const otpRecord = await EmailOtp.findOne({ email }).sort({ createdAt: -1 });

                if (!otpRecord) {
                    throw new CustomAuthError("No active code found. Please request a new verification code.");
                }

                if (new Date() > otpRecord.expiresAt) {
                    await EmailOtp.deleteOne({ _id: otpRecord._id });
                    throw new CustomAuthError("Verification code has expired. Please request a new one.");
                }

                if (otpRecord.attempts >= 3) {
                    await EmailOtp.deleteOne({ _id: otpRecord._id });
                    throw new CustomAuthError("Too many failed attempts. Code has been invalidated for security.");
                }

                const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
                if (!isMatch) {
                    const nextAttempts = otpRecord.attempts + 1;
                    await EmailOtp.updateOne({ _id: otpRecord._id }, { $inc: { attempts: 1 } });
                    const remaining = Math.max(0, 3 - nextAttempts);
                    if (remaining === 0) {
                        await EmailOtp.deleteOne({ _id: otpRecord._id });
                        throw new CustomAuthError("Incorrect code. Maximum attempts exceeded. Please request a new code.");
                    }
                    throw new CustomAuthError(`Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
                }

                // Single-use guarantee: consume OTP immediately upon successful verification
                await EmailOtp.deleteOne({ _id: otpRecord._id });

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
