"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    LayoutDashboard,
    Users,
    MessageSquareShare,
    FileText,
    Menu as MenuIcon,
    LogOut,
    X,
    Menu,
    Tag,
    Download
} from "lucide-react";

interface DashboardLayoutClientProps {
    children: React.ReactNode;
    user: {
        id?: string | null;
        name?: string | null;
        email?: string | null;
        role?: string | null;
        businessName?: string | null;
        logoUrl?: string | null;
    };
}

export default function DashboardLayoutClient({
    children,
    user,
}: DashboardLayoutClientProps) {
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const navLinks = [
        { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { href: "/customers", icon: Users, label: "Customers" },
        { href: "/menu", icon: MenuIcon, label: "Menu Items" },
        { href: "/coupons", icon: Tag, label: "Coupons" },
        { href: "/transactions", icon: MessageSquareShare, label: "Transactions" },
        { href: "/invoice/create", icon: FileText, label: "Create Invoice" },
        { href: "/export", icon: Download, label: "Export" },
        { href: "/settings", icon: MenuIcon, label: "Settings" },
        ...(user.role === 'OWNER' ? [{ href: "/team", icon: Users, label: "Team" }] : []),
    ];

    const SidebarContent = () => (
        <>
            <div className="p-4 border-b flex items-center justify-between lg:block">
                <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <img src={user.logoUrl || "/icons/icon-192x192.png"} alt="Logo" className="w-8 h-8 object-contain" />
                    <h1 className="text-xl font-bold text-gray-800">{user.businessName || "WA Invoice"}</h1>
                </Link>
                <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded"
                >
                    <X size={24} />
                </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                {navLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setIsSidebarOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${isActive
                                ? "bg-blue-50 text-blue-600"
                                : "text-gray-700 hover:bg-gray-100"
                                }`}
                        >
                            <Icon size={20} />
                            {link.label}
                        </Link>
                    );
                })}
            </nav>
            <div className="p-4 border-t">
                <div className="mb-4 px-3">
                    <p className="text-sm font-medium text-gray-900 truncate">
                        {user.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                        {user.email}
                    </p>
                </div>
                <button
                    onClick={() => signOut()}
                    className="flex w-full items-center gap-3 px-3 py-2 text-red-600 rounded hover:bg-red-50 transition-colors"
                >
                    <LogOut size={20} />
                    Sign Out
                </button>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* Sidebar for desktop */}
            <aside className="hidden lg:flex w-64 bg-white shadow-md flex-col">
                <SidebarContent />
            </aside>

            {/* Sidebar for mobile */}
            <div
                className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    }`}
            >
                <div
                    className="absolute inset-0 bg-black/50"
                    onClick={() => setIsSidebarOpen(false)}
                />
                <aside
                    className={`absolute inset-y-0 left-0 w-64 bg-white shadow-xl flex flex-col transition-transform duration-300 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                        }`}
                >
                    <SidebarContent />
                </aside>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <header className="lg:hidden bg-white border-b p-4 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <img src={user.logoUrl || "/icons/icon-192x192.png"} alt="Logo" className="w-8 h-8 object-contain" />
                        <h1 className="text-lg font-bold text-gray-800">{user.businessName || "WA Invoice"}</h1>
                    </Link>
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                    >
                        <Menu size={24} />
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
