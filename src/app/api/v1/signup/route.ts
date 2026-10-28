/**
 * POST /api/v1/signup
 * ───────────────────
 * Versioned signup endpoint. This is the canonical v1 implementation.
 * The original /api/signup re-exports from here for backwards compatibility.
 *
 * Changes from unversioned route:
 *  - Rate limiting: 5 requests / 5 min per IP
 *  - Strict Zod validation (name ≥ 2 chars, valid email, password ≥ 6 chars)
 *  - Bcrypt work factor increased to 12
 *  - Error messages sanitized (no internal error detail leakage)
 *  - X-API-Version response header
 *
 * @version 1.0.0
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { SignupSchema } from "@/lib/schemas";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const API_VERSION = "v1";

export async function POST(req: Request) {
    try {
        // 1. Rate Limiting — Max 5 signups per 5 minutes per IP
        const clientIp = getClientIp(req);
        const rateLimitResult = checkRateLimit(`signup:${clientIp}`, {
            intervalMs: 5 * 60 * 1000,
            maxRequests: 5,
        });

        if (!rateLimitResult.success) {
            return buildResponse(
                { message: "Too many signup attempts. Please wait a few minutes before trying again." },
                429
            );
        }

        // 2. Strict Input Validation via Zod
        const rawBody = await req.json();
        const parseResult = SignupSchema.safeParse(rawBody);

        if (!parseResult.success) {
            const firstError = parseResult.error.issues[0]?.message || "Invalid input";
            return buildResponse(
                { message: firstError, errors: parseResult.error.format() },
                400
            );
        }

        const { name, email, password } = parseResult.data;

        await dbConnect();

        // 3. Unique user check (normalized email from Zod .toLowerCase())
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return buildResponse(
                { message: "An account with this email already exists" },
                409
            );
        }

        // 4. Hash password with bcrypt (work factor 12)
        const hashedPassword = await bcrypt.hash(password, 12);

        // 5. Create user with default OWNER role
        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role: "OWNER",
        });

        return buildResponse(
            {
                message: "User registered successfully",
                user: { id: newUser._id, name: newUser.name, email: newUser.email },
            },
            201
        );
    } catch (error: any) {
        console.error("[/api/v1/signup] Error:", error);
        return buildResponse(
            { message: "An error occurred during registration. Please try again." },
            500
        );
    }
}

function buildResponse(body: object, status: number): NextResponse {
    const res = NextResponse.json(body, { status });
    res.headers.set("X-API-Version", API_VERSION);
    return res;
}
