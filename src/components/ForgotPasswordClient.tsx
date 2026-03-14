"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordClient() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        // We'll implement the actual reset token logic later
        // For now, let's mock the success state
        setTimeout(() => {
            setSuccess(true);
            setLoading(false);
        }, 1500);
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4 font-sans">
                <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl p-12 text-center space-y-6 animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-green-50 text-green-500 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                        <CheckCircle2 size={40} />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Check your email</h1>
                    <p className="text-gray-500 font-medium">We've sent a password reset link to your email address.</p>
                    <Link href="/login" className="flex items-center justify-center gap-2 text-blue-600 font-black hover:underline uppercase tracking-widest text-xs">
                        <ArrowLeft size={16} />
                        Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4 font-sans uppercase tracking-tight">
            <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl p-12 space-y-10 border border-gray-100 animate-in slide-in-from-bottom-8 duration-700">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Forgot Password?</h1>
                    <p className="text-gray-400 text-xs font-black tracking-widest leading-relaxed">Enter your email and we'll send you a link to reset your password.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 lowercase">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Email Address</label>
                        <div className="relative group">
                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                            <input
                                required
                                type="email"
                                placeholder="name@company.com"
                                className="w-full pl-14 pr-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-bold text-black border-none shadow-inner"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-black shadow-2xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : "Send Reset Link"}
                    </button>

                    <Link
                        href="/login"
                        className="flex items-center justify-center gap-2 text-gray-400 font-black hover:text-black transition-all uppercase tracking-widest text-[10px]"
                    >
                        <ArrowLeft size={14} />
                        Back to Login
                    </Link>
                </form>
            </div>
        </div>
    );
}
