"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { requestPasswordReset } from "@/app/actions/auth";

export default function ForgotPasswordClient() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail) {
            setError("Please enter your registered email address.");
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const res = await requestPasswordReset(trimmedEmail);
            if (res.success) {
                setSuccess(true);
            } else {
                setError(res.error || "Failed to process password reset. Please try again.");
            }
        } catch {
            setError("Unable to connect to the authentication server. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 sm:p-10 text-center space-y-6 border border-gray-100 animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                        <CheckCircle2 size={36} />
                    </div>
                    
                    <div className="space-y-2">
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Check your email</h1>
                        <p className="text-sm text-gray-600 font-medium leading-relaxed">
                            If an account exists for <strong className="text-gray-900 font-bold">{email}</strong>, we have sent a secure password reset link.
                        </p>
                    </div>

                    <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 text-left">
                        <p className="text-xs text-amber-800 leading-normal">
                            <strong>Note:</strong> The link will remain active for <strong>60 minutes</strong>. Be sure to check your spam or junk folder if it doesn't appear in your inbox shortly.
                        </p>
                    </div>

                    <div className="pt-2">
                        <Link 
                            href="/login" 
                            className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider transition-all"
                        >
                            <ArrowLeft size={16} />
                            Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 sm:p-10 space-y-7 border border-gray-100 animate-in fade-in duration-300">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Mail size={24} />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Forgot Password?</h1>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                        Enter your registered email address and we'll send you a secure link to reset your account password.
                    </p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-50/80 border border-red-200 rounded-xl p-3.5 flex items-start gap-3 animate-in fade-in duration-200">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <p className="text-xs font-medium text-red-800 leading-relaxed">{error}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label 
                            htmlFor="reset-email" 
                            className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                        >
                            Email Address
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                <Mail size={18} />
                            </div>
                            <input
                                id="reset-email"
                                required
                                type="email"
                                autoComplete="email"
                                placeholder="name@primebake.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white text-sm font-medium transition-all"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-md shadow-blue-500/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Sending Reset Link...</span>
                            </>
                        ) : (
                            <span>Send Reset Link</span>
                        )}
                    </button>

                    <div className="pt-2 text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
                        >
                            <ArrowLeft size={14} />
                            Back to Sign In
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
