"use client";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
    Mail, 
    Lock, 
    Eye, 
    EyeOff, 
    KeyRound, 
    ArrowRight, 
    Loader2, 
    AlertCircle, 
    CheckCircle2, 
    RotateCcw,
    ShieldCheck
} from "lucide-react";
import { sendLoginOtp } from "@/app/actions/auth";

type LoginMethod = "password" | "otp";
type OtpStep = "request" | "verify";

export default function LoginPage() {
    const router = useRouter();

    // Active method tab
    const [method, setMethod] = useState<LoginMethod>("password");

    // Form states
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    
    // OTP states
    const [otpStep, setOtpStep] = useState<OtpStep>("request");
    const [otp, setOtp] = useState("");
    const [cooldown, setCooldown] = useState(0);

    // UX states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);

    const otpInputRef = useRef<HTMLInputElement>(null);

    // Cooldown countdown timer
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown((prev) => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    // Auto-focus OTP input when switching to verify step
    useEffect(() => {
        if (otpStep === "verify") {
            setTimeout(() => {
                otpInputRef.current?.focus();
            }, 100);
        }
    }, [otpStep]);

    // Handle Password Login
    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setInfoMessage(null);
        setLoading(true);

        try {
            const res = await signIn("credentials", {
                redirect: false,
                email: email.trim().toLowerCase(),
                password,
            });

            if (res?.error) {
                if (res.error === "CredentialsSignin") {
                    setError("Invalid email or password. Please try again or use Email OTP.");
                } else {
                    setError(res.error);
                }
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        } catch {
            setError("An unexpected error occurred during sign in. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Handle Request OTP
    const handleSendOtp = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail) {
            setError("Please enter your registered email address.");
            return;
        }

        setError(null);
        setInfoMessage(null);
        setLoading(true);

        try {
            const res = await sendLoginOtp(trimmedEmail);
            if (res.success) {
                setOtpStep("verify");
                setCooldown(res.cooldownSeconds || 60);
                setInfoMessage(res.message || "A 6-digit code has been sent to your email.");
            } else {
                setError(res.error || "Failed to send verification code.");
                if (res.cooldownSeconds) {
                    setCooldown(res.cooldownSeconds);
                }
            }
        } catch {
            setError("Unable to connect to the authentication server. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Handle Verify OTP Login
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanedOtp = otp.trim();
        if (cleanedOtp.length !== 6) {
            setError("Please enter the complete 6-digit code.");
            return;
        }

        setError(null);
        setInfoMessage(null);
        setLoading(true);

        try {
            const res = await signIn("email-otp", {
                redirect: false,
                email: email.trim().toLowerCase(),
                otp: cleanedOtp,
            });

            if (res?.error) {
                if (res.error === "CredentialsSignin") {
                    setError("Invalid or expired verification code. Please try again.");
                } else {
                    setError(res.error);
                }
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        } catch {
            setError("Failed to verify code. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Allow user to reset and edit their email in OTP mode
    const handleEditEmail = () => {
        setOtpStep("request");
        setOtp("");
        setError(null);
        setInfoMessage(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/30 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                {/* Brand Header */}
                <div className="flex justify-center">
                    <div className="w-20 h-20 bg-white rounded-2xl p-2.5 shadow-lg shadow-gray-200/50 border border-gray-100 flex items-center justify-center transform hover:scale-105 transition-transform duration-200">
                        <img 
                            src="/primebake-logo.png" 
                            alt="Primebake Logo" 
                            className="w-full h-full object-contain" 
                        />
                    </div>
                </div>
                <h1 className="mt-5 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
                    Sign in to Primebake
                </h1>
                <p className="mt-1 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Billing, Inventory & Bakery Management
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-5 sm:px-10 shadow-xl shadow-gray-200/50 rounded-2xl sm:rounded-3xl border border-gray-100">
                    
                    {/* Mode Switcher Tabs */}
                    <div className="flex p-1 mb-6 bg-gray-100/80 rounded-xl">
                        <button
                            type="button"
                            onClick={() => {
                                setMethod("password");
                                setError(null);
                                setInfoMessage(null);
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 ${
                                method === "password"
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-900"
                            }`}
                        >
                            <KeyRound size={15} />
                            <span>Password</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setMethod("otp");
                                setError(null);
                                setInfoMessage(null);
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 ${
                                method === "otp"
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-gray-500 hover:text-gray-900"
                            }`}
                        >
                            <Mail size={15} />
                            <span>Email OTP</span>
                            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 rounded">
                                New
                            </span>
                        </button>
                    </div>

                    {/* Feedback Messages */}
                    {error && (
                        <div className="mb-5 bg-red-50/80 border border-red-200 rounded-xl p-3.5 flex items-start gap-3 animate-in fade-in duration-200">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <p className="text-xs font-medium text-red-800 leading-relaxed">{error}</p>
                        </div>
                    )}

                    {infoMessage && (
                        <div className="mb-5 bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3 animate-in fade-in duration-200">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <p className="text-xs font-medium text-emerald-800 leading-relaxed">{infoMessage}</p>
                        </div>
                    )}

                    {/* METHOD 1: STANDARD PASSWORD LOGIN */}
                    {method === "password" && (
                        <form className="space-y-5" onSubmit={handlePasswordSubmit}>
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                                >
                                    Email address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="admin@primebake.com"
                                        className="appearance-none block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white text-sm font-medium transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label
                                        htmlFor="password"
                                        className="block text-xs font-bold text-gray-700 uppercase tracking-wider"
                                    >
                                        Password
                                    </label>
                                    <Link
                                        href="/forgot-password"
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
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
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-md shadow-blue-500/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Signing in...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Sign In</span>
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* METHOD 2: PASSWORDLESS EMAIL OTP */}
                    {method === "otp" && (
                        <div className="space-y-5">
                            {otpStep === "request" ? (
                                <form className="space-y-5" onSubmit={handleSendOtp}>
                                    <div>
                                        <label
                                            htmlFor="otp-email"
                                            className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                                        >
                                            Registered Email Address
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                                <Mail size={18} />
                                            </div>
                                            <input
                                                id="otp-email"
                                                name="email"
                                                type="email"
                                                autoComplete="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="you@primebake.com"
                                                className="appearance-none block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white text-sm font-medium transition-all"
                                            />
                                        </div>
                                        <p className="mt-2 text-[11px] text-gray-500 leading-normal">
                                            We'll send a 6-digit one-time passcode to your email. No password needed.
                                        </p>
                                    </div>

                                    <div>
                                        <button
                                            type="submit"
                                            disabled={loading || cooldown > 0}
                                            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-md shadow-blue-500/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Sending code...</span>
                                                </>
                                            ) : cooldown > 0 ? (
                                                <span>Resend code in {cooldown}s</span>
                                            ) : (
                                                <>
                                                    <span>Send 6-Digit Code</span>
                                                    <ArrowRight size={16} />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <form className="space-y-5" onSubmit={handleVerifyOtp}>
                                    {/* Email summary badge */}
                                    <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-xl flex items-center justify-between">
                                        <div className="truncate mr-2">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                                Code sent to
                                            </span>
                                            <span className="text-xs font-semibold text-gray-900 truncate block">
                                                {email}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleEditEmail}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-700 shrink-0"
                                        >
                                            Change
                                        </button>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="otp-code"
                                            className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
                                        >
                                            Enter 6-Digit Passcode
                                        </label>
                                        <div className="relative">
                                            <input
                                                ref={otpInputRef}
                                                id="otp-code"
                                                name="otp"
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                maxLength={6}
                                                required
                                                value={otp}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, "");
                                                    setOtp(val);
                                                }}
                                                placeholder="••••••"
                                                className="appearance-none block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-center text-2xl font-mono font-bold tracking-[0.4em] text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <button
                                            type="submit"
                                            disabled={loading || otp.length !== 6}
                                            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-md shadow-blue-500/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Verifying...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldCheck size={18} />
                                                    <span>Verify & Sign In</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Resend Action */}
                                    <div className="text-center pt-1">
                                        {cooldown > 0 ? (
                                            <span className="text-xs text-gray-400 font-medium">
                                                Resend code in <strong className="text-gray-600 font-bold">{cooldown}s</strong>
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={loading}
                                                onClick={() => handleSendOtp()}
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 disabled:opacity-50"
                                            >
                                                <RotateCcw size={13} />
                                                <span>Resend code now</span>
                                            </button>
                                        )}
                                    </div>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Bottom Registration Link */}
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <div className="text-center text-xs text-gray-500">
                            <span>Don't have an account? </span>
                            <Link
                                href="/signup"
                                className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                Create an account
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Version and Status Footer */}
            <div className="mt-6 text-center">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-gray-200/80 text-xs font-semibold text-gray-600 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"} &bull; Enterprise Secure Auth
                </span>
            </div>
        </div>
    );
}
