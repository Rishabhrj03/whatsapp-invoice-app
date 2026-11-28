"use server";

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import EmailOtp from '@/models/EmailOtp';
import {
    SendOtpSchema,
    RequestPasswordResetSchema,
    ResetPasswordSchema,
} from '@/lib/schemas';
import emailService from '@/lib/services/EmailService';
import { activityLogService } from '@/lib/services/ActivityLogService';
import { checkRateLimit } from '@/lib/rateLimit';

export interface AuthActionResponse {
    success: boolean;
    message?: string;
    error?: string;
    cooldownSeconds?: number;
}

/**
 * Sends a 6-digit login OTP to the user's registered email
 */
export async function sendLoginOtp(emailInput: string): Promise<AuthActionResponse> {
    try {
        const parsed = SendOtpSchema.safeParse({ email: emailInput });
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || 'Invalid email address' };
        }

        const email = parsed.data.email;

        // Rate Limit: Max 5 OTP requests per 5 minutes per email
        const rateLimit = checkRateLimit(`otp-req:${email}`, {
            intervalMs: 5 * 60 * 1000,
            maxRequests: 5,
        });

        if (!rateLimit.success) {
            return {
                success: false,
                error: 'Too many OTP requests. Please wait a few minutes before trying again.',
            };
        }

        await dbConnect();

        // Verify that the user exists in Primebake
        const user = await User.findOne({ email });
        if (!user) {
            return {
                success: false,
                error: 'No account found with this email. Please check your email or sign up.',
            };
        }

        // Check if there is an active resend cooldown for this email
        const existingOtp = await EmailOtp.findOne({ email }).sort({ createdAt: -1 });
        if (existingOtp && existingOtp.resendCooldown > new Date()) {
            const remainingSeconds = Math.ceil((existingOtp.resendCooldown.getTime() - Date.now()) / 1000);
            return {
                success: false,
                error: `Please wait ${remainingSeconds} seconds before requesting a new code.`,
                cooldownSeconds: remainingSeconds,
            };
        }

        // Generate 6-digit cryptographically secure OTP
        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = await bcrypt.hash(otp, 10);

        const now = new Date();
        const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes validity
        const resendCooldown = new Date(now.getTime() + 60 * 1000); // 60s cooldown

        // Clean up any prior OTP records for this email
        await EmailOtp.deleteMany({ email });

        // Save new OTP record
        await EmailOtp.create({
            email,
            otpHash,
            expiresAt,
            attempts: 0,
            resendCooldown,
        });

        // Dispatch Email
        await emailService.sendOtpEmail({
            to: email,
            otp,
            name: user.name,
        });

        // Audit Trail (non-blocking)
        activityLogService.logActivity({
            tenantId: user.ownerId || user._id,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'AUTH_OTP_REQUESTED',
            entityType: 'AUTH',
            description: `Requested login OTP verification code for ${email}`,
        }).catch((err) => console.error('Failed to log OTP request:', err));

        return {
            success: true,
            message: 'A 6-digit verification code has been sent to your email.',
            cooldownSeconds: 60,
        };
    } catch (error: any) {
        console.error('[sendLoginOtp] Error:', error);
        return {
            success: false,
            error: error.message || 'Failed to dispatch verification code. Please try again.',
        };
    }
}

/**
 * Initiates a password reset workflow by sending a secure time-limited token
 */
export async function requestPasswordReset(emailInput: string): Promise<AuthActionResponse> {
    try {
        const parsed = RequestPasswordResetSchema.safeParse({ email: emailInput });
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || 'Invalid email address' };
        }

        const email = parsed.data.email;

        // Rate Limit: Max 3 requests per 10 minutes
        const rateLimit = checkRateLimit(`pwd-reset:${email}`, {
            intervalMs: 10 * 60 * 1000,
            maxRequests: 3,
        });

        if (!rateLimit.success) {
            return {
                success: false,
                error: 'Too many password reset requests. Please check your inbox or wait 10 minutes.',
            };
        }

        await dbConnect();
        const user = await User.findOne({ email });

        // Defense-in-depth: If user does not exist, return generic success to prevent email enumeration
        if (!user) {
            return {
                success: true,
                message: 'If an account exists for this email, a password reset link has been dispatched.',
            };
        }

        // Generate high-entropy 32-byte hex token (256-bit)
        const rawToken = crypto.randomBytes(32).toString('hex');
        // Store SHA-256 hash in database
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

        user.resetToken = hashedToken;
        user.resetTokenExpiry = tokenExpiry;
        await user.save();

        const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const resetUrl = `${baseUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

        await emailService.sendPasswordResetEmail({
            to: email,
            resetUrl,
            name: user.name,
        });

        // Audit Trail
        activityLogService.logActivity({
            tenantId: user.ownerId || user._id,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'AUTH_PASSWORD_RESET_REQUESTED',
            entityType: 'AUTH',
            description: `Password reset link requested for ${email}`,
        }).catch((err) => console.error('Failed to log password reset request:', err));

        return {
            success: true,
            message: 'If an account exists for this email, a password reset link has been dispatched.',
        };
    } catch (error: any) {
        console.error('[requestPasswordReset] Error:', error);
        return {
            success: false,
            error: error.message || 'Failed to initiate password recovery. Please try again.',
        };
    }
}

/**
 * Verifies if a password reset token is valid before rendering the reset form
 */
export async function verifyResetToken(email: string, token: string): Promise<{ valid: boolean; error?: string }> {
    try {
        if (!email || !token) {
            return { valid: false, error: 'Missing reset parameters' };
        }

        await dbConnect();
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user || !user.resetToken || !user.resetTokenExpiry) {
            return { valid: false, error: 'Invalid or expired password reset link' };
        }

        if (new Date() > user.resetTokenExpiry) {
            return { valid: false, error: 'This password reset link has expired. Please request a new one.' };
        }

        const candidateHash = crypto.createHash('sha256').update(token).digest('hex');
        const storedHashBuf = Buffer.from(user.resetToken, 'hex');
        const candidateHashBuf = Buffer.from(candidateHash, 'hex');

        if (storedHashBuf.length !== candidateHashBuf.length || !crypto.timingSafeEqual(storedHashBuf, candidateHashBuf)) {
            return { valid: false, error: 'Invalid password reset token' };
        }

        return { valid: true };
    } catch (error: any) {
        console.error('[verifyResetToken] Error:', error);
        return { valid: false, error: 'Failed to verify reset link' };
    }
}

/**
 * Completes the password reset workflow by securely hashing the new password
 */
export async function resetPassword(data: unknown): Promise<AuthActionResponse> {
    try {
        const parsed = ResetPasswordSchema.safeParse(data);
        if (!parsed.success) {
            return {
                success: false,
                error: parsed.error.issues[0]?.message || 'Invalid password reset details',
            };
        }

        const { email, token, newPassword } = parsed.data;

        await dbConnect();
        const user = await User.findOne({ email });

        if (!user || !user.resetToken || !user.resetTokenExpiry) {
            return { success: false, error: 'Invalid or expired password reset link' };
        }

        if (new Date() > user.resetTokenExpiry) {
            return { success: false, error: 'This password reset link has expired. Please request a new one.' };
        }

        const candidateHash = crypto.createHash('sha256').update(token).digest('hex');
        const storedHashBuf = Buffer.from(user.resetToken, 'hex');
        const candidateHashBuf = Buffer.from(candidateHash, 'hex');

        if (storedHashBuf.length !== candidateHashBuf.length || !crypto.timingSafeEqual(storedHashBuf, candidateHashBuf)) {
            return { success: false, error: 'Invalid password reset token' };
        }

        // Hash new password with bcrypt work factor 12
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedPassword;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        // Audit Trail
        activityLogService.logActivity({
            tenantId: user.ownerId || user._id,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'AUTH_PASSWORD_RESET_COMPLETED',
            entityType: 'AUTH',
            description: `Password successfully updated for ${email}`,
        }).catch((err) => console.error('Failed to log password reset completion:', err));

        return {
            success: true,
            message: 'Your password has been successfully reset! You can now log in with your new password.',
        };
    } catch (error: any) {
        console.error('[resetPassword] Error:', error);
        return {
            success: false,
            error: error.message || 'Failed to update password. Please try again.',
        };
    }
}
