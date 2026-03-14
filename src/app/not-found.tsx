import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
            <h2 className="text-4xl font-black text-gray-900 mb-4">404</h2>
            <p className="text-gray-500 mb-8 font-medium">We couldn't find the page you're looking for.</p>
            <Link
                href="/dashboard"
                className="px-8 py-4 bg-black text-white rounded-2xl font-black hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-gray-200"
            >
                Go back home
            </Link>
        </div>
    );
}
