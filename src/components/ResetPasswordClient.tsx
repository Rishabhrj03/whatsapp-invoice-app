"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
    Lock, 
    Eye, 
    EyeOff, 
    CheckCircle2, 
    AlertCircle, 
    ArrowRight, 
    Loader2, 
    ShieldAlert, 
    KeyRound, 
    Check, 
    X 
} from "lucide-react";
import { resetPassword } from "@/app/actions/auth";

interface ResetPasswordClientProps {
    initialEmail: string;
    initialToken: string;
    isTokenValid: boolean;
    tokenError?: string;
}

export default function ResetPasswordClient({
    initialEmail,
    initialToken,
    isTokenValid,
    tokenError,
}: ResetPasswordClientProps) {
    const router = useRouter();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Dynamic password validations
    const hasMinLength = password.length >= 6;
    const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const isMatching = password.length > 0 && password === confirmPassword;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!hasMinLength) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const res = await resetPassword({
                email: initialEmail,
                token: initialToken,
                newPassword: password,
                confirmPassword: confirmPassword,
            });

            if (res.success) {
                setSuccess(true);
            } else {
                setError(res.error || "Failed to reset password. Please try again.");
            }
        } catch {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // INVALID OR EXPIRED TOKEN STATE
    if (!isTokenValid) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 sm:p-10 text-center space-y-6 border border-gray-100 animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                        <ShieldAlert size={36} />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                            Link Invalid or Expired
                        </h1>
                        <p className="text-sm text-gray-600 font-medium leading-relaxed">
                            {tokenError || "This password reset link is invalid or has already expired for security."}
                        </p>
                    </div>

                    <div className="pt-2 space-y-3">
                        <Link
                            href="/forgot-password"
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-md shadow-blue-500/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all"
                        >
                            <span>Request New Reset Link</span>
                            <ArrowRight size={16} />
                        </Link>

                        <div>
                            <Link
                                href="/login"
                                className="inline-block text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
                            >
                                Back to Sign In
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // SUCCESS STATE
    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 sm:p-10 text-center space-y-6 border border-gray-100 animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                        <CheckCircle2 size={36} />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                            Password Reset Complete!
                        </h1>
                        <p className="text-sm text-gray-600 font-medium leading-relaxed">
                            Your Primebake account password has been updated securely. You can now log in with your new credentials.
                        </p>
                    </div>

                    <div className="pt-2">
                        <Link
                            href="/login"
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-md shadow-blue-500/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all"
                        >
                            <span>Sign In to Primebake</span>
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ACTIVE RESET FORM
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 sm:p-10 space-y-7 border border-gray-100 animate-in fade-in duration-300">
                
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <KeyRound size={24} />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Create New Password</h1>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                        Resetting password for <strong className="text-gray-900 font-bold">{initialEmail}</strong>
                    </p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-50/80 border border-red-200 rounded-xl p-3.5 flex items-start gap-3 animate-in fade-in duration-200">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <p className="text-xs font-medium text-red-800 leading-relaxed">{error}</p>
                    </div>
                )}

                {/* Reset Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label 
                            htmlFor="new-password"
                            className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                        >
                            New Password
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                <Lock size={18} />
                            </div>
                            <input
                                id="new-password"
                                required
                                type={showPassword ? "text" : "password"}
                                autoComplete="new-password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none block w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white text-sm font-medium transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                tabIndex={-1}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label 
                            htmlFor="confirm-password"
                            className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                        >
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                <Lock size={18} />
                            </div>
                            <input
                                id="confirm-password"
                                required
                                type={showConfirmPassword ? "text" : "password"}
                                autoComplete="new-password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="appearance-none block w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white text-sm font-medium transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                tabIndex={-1}
                                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Password Requirements Checklist */}
                    <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 border border-gray-100 text-xs">
                        <div className="flex items-center gap-2">
                            {hasMinLength ? (
                                <Check size={14} className="text-emerald-600 shrink-0" />
                            ) : (
                                <X size={14} className="text-gray-300 shrink-0" />
                            )}
                            <span className={hasMinLength ? "text-emerald-800 font-semibold" : "text-gray-500"}>
                                At least 6 characters
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {hasNumberOrSymbol ? (
                                <Check size={14} className="text-emerald-600 shrink-0" />
                            ) : (
                                <X size={14} className="text-gray-300 shrink-0" />
                            )}
                            <span className={hasNumberOrSymbol ? "text-emerald-800 font-semibold" : "text-gray-500"}>
                                Contains a number or symbol
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {isMatching ? (
                                <Check size={14} className="text-emerald-600 shrink-0" />
                            ) : (
                                <X size={14} className="text-gray-300 shrink-0" />
                            )}
                            <span className={isMatching ? "text-emerald-800 font-semibold" : "text-gray-500"}>
                                Passwords match
                            </span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !hasMinLength || !isMatching}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-md shadow-blue-500/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Updating Password...</span>
                            </>
                        ) : (
                            <>
                                <span>Update Password</span>
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>

                    <div className="pt-2 text-center">
                        <Link
                            href="/login"
                            className="inline-block text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
                        >
                            Cancel and Return to Sign In
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
