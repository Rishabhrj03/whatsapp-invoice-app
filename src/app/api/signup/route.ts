import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { SignupSchema } from "@/lib/schemas";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: Request) {
    try {
        // 1. Rate Limiting — Max 5 signups per 5 minutes per IP
        const clientIp = getClientIp(req);
        const rateLimitResult = checkRateLimit(`signup:${clientIp}`, {
            intervalMs: 5 * 60 * 1000,
            maxRequests: 5,
        });

        if (!rateLimitResult.success) {
            return NextResponse.json(
                { message: "Too many signup attempts. Please wait a few minutes before trying again." },
                { status: 429 }
            );
        }

        // 2. Strict Input Validation via Zod
        const rawBody = await req.json();
        const parseResult = SignupSchema.safeParse(rawBody);

        if (!parseResult.success) {
            const firstError = parseResult.error.issues[0]?.message || "Invalid input";
            return NextResponse.json(
                { message: firstError, errors: parseResult.error.format() },
                { status: 400 }
            );
        }

        const { name, email, password } = parseResult.data;

        await dbConnect();

        // 3. Unique user check (case-insensitive normalized email)
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json(
                { message: "An account with this email already exists" },
                { status: 409 }
            );
        }

        // 4. Hash password with bcrypt
        const hashedPassword = await bcrypt.hash(password, 12);

        // 5. Create user with default OWNER role
        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role: "OWNER",
        });

        return NextResponse.json(
            {
                message: "User registered successfully",
                user: { id: newUser._id, name: newUser.name, email: newUser.email },
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Signup error:", error);
        return NextResponse.json(
            { message: "An error occurred during registration. Please try again." },
            { status: 500 }
        );
    }
}
