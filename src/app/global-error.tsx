"use client";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">A critical error occurred</h2>
                    <p className="text-gray-600 mb-8">
                        {error.message}
                    </p>
                    <button
                        onClick={() => reset()}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
