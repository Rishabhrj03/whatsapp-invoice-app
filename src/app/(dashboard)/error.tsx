"use client";

import { useEffect } from "react";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Dashboard Error:", error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-full p-8 text-center bg-white rounded-[2rem] shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Something went wrong in your dashboard</h2>
            <p className="text-gray-500 mb-8 max-w-sm font-medium">
                {error.message || "We encountered an error while loading this section. Our team has been notified."}
            </p>
            <div className="flex gap-4">
                <button
                    onClick={() => reset()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                    Try again
                </button>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-gray-100 text-gray-900 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                    Reload page
                </button>
            </div>
        </div>
    );
}
