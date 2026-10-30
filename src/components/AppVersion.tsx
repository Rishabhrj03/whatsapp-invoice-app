"use client";

import { useState } from "react";
import { GitBranch, CheckCircle, Clock, ChevronUp } from "lucide-react";

interface AppVersionProps {
    /** Visual style variant */
    variant?: "badge" | "pill" | "full";
    /** Extra class names */
    className?: string;
}

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.3.0";

const CHANGELOG_SUMMARY = [
    { version: "1.3.0", date: "Oct 2026", label: "Current", notes: "Direct Server-Side S3 uploads (Zero-CORS), negative line item & total pricing, portaled item selector, and transaction date range presets" },
    { version: "1.2.0", date: "Oct 2026", label: "Stable", notes: "Real-time item descriptions, custom cake customization popup, and invoice item notes" },
    { version: "1.1.0", date: "Oct 2026", label: "Stable", notes: "Activity Log / Audit Trail system, multi-tenant booking isolation, production DB config" },
    { version: "1.0.0", date: "Oct 2026", label: "Stable", notes: "SOLID architecture, RBAC, rate limiting, API v1, responsive UI" },
    { version: "0.1.0", date: "May 2026", label: "Initial", notes: "Core invoicing, WhatsApp sharing, customer CRM, bookings" },
];

/**
 * AppVersion — displays the current app version with an optional changelog popover.
 *
 * Usage:
 *   <AppVersion />                     → compact pill
 *   <AppVersion variant="full" />      → card with changelog history
 *   <AppVersion variant="badge" />     → inline badge only
 */
export default function AppVersion({ variant = "pill", className = "" }: AppVersionProps) {
    const [showChangelog, setShowChangelog] = useState(false);

    if (variant === "badge") {
        return (
            <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-500 tracking-wider ${className}`}
            >
                <GitBranch size={10} />
                v{APP_VERSION}
            </span>
        );
    }

    if (variant === "full") {
        return (
            <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                            <GitBranch size={16} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">App Version</p>
                            <p className="text-xl font-black text-gray-900 tracking-tight">v{APP_VERSION}</p>
                        </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-[10px] font-black text-emerald-600 uppercase tracking-wider">
                        <CheckCircle size={10} /> Stable
                    </span>
                </div>

                {/* Changelog Timeline */}
                <div className="p-5 space-y-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Release History</p>
                    <div className="space-y-3">
                        {CHANGELOG_SUMMARY.map((entry, i) => (
                            <div key={entry.version} className="flex items-start gap-3">
                                <div className="flex flex-col items-center">
                                    <div className={`w-3 h-3 rounded-full border-2 mt-0.5 flex-shrink-0 ${i === 0 ? "bg-blue-500 border-blue-500" : "bg-gray-200 border-gray-300"}`} />
                                    {i < CHANGELOG_SUMMARY.length - 1 && (
                                        <div className="w-px flex-1 bg-gray-100 mt-1 min-h-[20px]" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 pb-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-xs font-black ${i === 0 ? "text-blue-600" : "text-gray-500"}`}>
                                            v{entry.version}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                            <Clock size={9} /> {entry.date}
                                        </span>
                                        {i === 0 && (
                                            <span className="text-[9px] font-black px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full uppercase tracking-wider">
                                                {entry.label}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{entry.notes}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Default: pill with popover on click
    return (
        <div className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setShowChangelog(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-[10px] font-black text-blue-400 tracking-wider hover:bg-slate-700/60 transition-colors group"
                title="Click to see version history"
            >
                <div className="flex items-center gap-2">
                    <GitBranch size={12} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Version</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-blue-400 font-mono font-black text-[11px]">v{APP_VERSION}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                        stable
                    </span>
                    <ChevronUp
                        size={12}
                        className={`text-slate-500 transition-transform duration-200 ${showChangelog ? "rotate-180" : ""}`}
                    />
                </div>
            </button>

            {/* Changelog Popover */}
            {showChangelog && (
                <div className="absolute bottom-full mb-2 left-0 right-0 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-slate-950/60 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200 z-50 min-w-[240px]">
                    <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Release History</span>
                        <button
                            type="button"
                            onClick={() => setShowChangelog(false)}
                            className="text-slate-500 hover:text-slate-300 transition-colors text-xs"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="p-2 space-y-1">
                        {CHANGELOG_SUMMARY.map((entry, i) => (
                            <div
                                key={entry.version}
                                className={`px-3 py-2 rounded-xl ${i === 0 ? "bg-blue-600/10 border border-blue-500/20" : "hover:bg-slate-800/40"} transition-colors`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className={`text-xs font-black ${i === 0 ? "text-blue-400" : "text-slate-400"}`}>
                                        v{entry.version}
                                    </span>
                                    <span className="text-[9px] text-slate-500 flex items-center gap-1">
                                        <Clock size={9} /> {entry.date}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{entry.notes}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
