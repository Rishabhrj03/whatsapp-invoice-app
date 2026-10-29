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
    Download,
    Calendar,
    Shield,
    Sparkles,
    Settings,
    ChevronRight,
    Plus,
    GitBranch,
    Info,
    History
} from "lucide-react";
import AppVersion from "@/components/AppVersion";

// ── App version — injected at build time from package.json via next.config.mjs
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";

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

    const isOwner = user.role === 'OWNER';

    const navLinks = [
        { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { href: "/invoice/create", icon: FileText, label: "Generate Bill", badge: "POS" },
        { href: "/transactions", icon: MessageSquareShare, label: "Transactions" },
        { href: "/customers", icon: Users, label: "Customers" },
        { href: "/menu", icon: MenuIcon, label: "Menu Catalog" },
        { href: "/coupons", icon: Tag, label: "Discount Coupons" },
        { href: "/bookings", icon: Calendar, label: "Advance Bookings" },
        { href: "/activity", icon: History, label: "Activity Log", badge: "Audit" },
        { href: "/export", icon: Download, label: "Data Export" },
        { href: "/settings", icon: Settings, label: "Settings" },
        ...(isOwner ? [{ href: "/team", icon: Users, label: "Team Members", badge: "Owner" }] : []),
    ];

    // Mobile bottom navigation items (Top 5 primary actions)
    const mobileBottomLinks = [
        { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
        { href: "/customers", icon: Users, label: "Customers" },
        { href: "/invoice/create", icon: Plus, label: "New Bill", primary: true },
        { href: "/transactions", icon: MessageSquareShare, label: "Bills" },
        { href: "/menu", icon: MenuIcon, label: "Menu" },
    ];

    const currentTitle = navLinks.find(l => pathname.startsWith(l.href))?.label || "Workspace";

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-slate-900 text-slate-200">
            {/* Brand Header */}
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
                <Link href="/dashboard" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform flex items-center justify-center overflow-hidden">
                        {user.logoUrl ? (
                            <img src={user.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-[14px]" />
                        ) : (
                            <Sparkles className="w-5 h-5 text-white" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base font-black text-white tracking-tight truncate group-hover:text-blue-400 transition-colors">
                            {user.businessName || "Invoice Pro"}
                        </h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                isOwner ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            }`}>
                                <Shield size={10} />
                                {user.role || "STAFF"}
                            </span>
                        </div>
                    </div>
                </Link>
                <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                    aria-label="Close menu"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
                <div className="px-3 pb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Point of Sale & Management
                </div>
                {navLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setIsSidebarOpen(false)}
                            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                                isActive
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold"
                                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                            }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <Icon size={18} className={`${isActive ? "text-white" : "text-slate-400 group-hover:text-blue-400"} transition-colors flex-shrink-0`} />
                                <span className="truncate">{link.label}</span>
                            </div>
                            {link.badge && (
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                                    isActive
                                        ? "bg-white/20 text-white"
                                        : "bg-slate-800 text-slate-400 group-hover:text-slate-200"
                                }`}>
                                    {link.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Interactive Version Badge with Changelog Popover */}
            <div className="px-4 py-2.5 border-t border-slate-800/80">
                <AppVersion className="w-full" />
            </div>

            {/* User Profile Card & Sign Out */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-900/50">
                <div className="flex items-center gap-3 px-2 mb-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-black text-blue-400 flex-shrink-0">
                        {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-100 truncate">{user.name || "Authenticated User"}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                </div>
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex w-full items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all"
                >
                    <LogOut size={14} />
                    Sign Out Session
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans antialiased text-slate-900">
            {/* Desktop / Large Screen Sidebar */}
            <aside className="hidden lg:flex w-72 flex-col flex-shrink-0 z-30 shadow-2xl shadow-slate-900/10">
                <SidebarContent />
            </aside>

            {/* Mobile / Tablet Drawer Sidebar */}
            <div
                className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
                    isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
            >
                <div
                    className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
                <aside
                    className={`absolute inset-y-0 left-0 w-80 max-w-[85vw] shadow-2xl flex flex-col transition-transform duration-300 ease-out transform ${
                        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                >
                    <SidebarContent />
                </aside>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Modern Responsive Top Header Bar */}
                <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors active:scale-95"
                            aria-label="Open navigation menu"
                        >
                            <Menu size={22} />
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="hidden sm:inline-block text-xs font-semibold text-slate-400">App</span>
                            <span className="hidden sm:inline-block text-slate-300">/</span>
                            <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                {currentTitle}
                            </h2>
                            {/* Version pill — visible on desktop only */}
                            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-400 tracking-wider">
                                <GitBranch size={10} />
                                v{APP_VERSION}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/invoice/create"
                            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 transition-all active:scale-95"
                        >
                            <Plus size={16} />
                            <span>Quick Bill</span>
                        </Link>
                        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
                                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <span className="hidden md:inline-block text-xs font-bold text-slate-700 max-w-[120px] truncate">
                                {user.name}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Primary Page Viewport */}
                <main className="flex-1 overflow-y-auto px-4 py-6 md:p-8 pb-24 md:pb-12 bg-slate-50/60">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>

                {/* Mobile Thumb-Friendly Bottom Navigation Bar (< 768px) */}
                <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
                    {mobileBottomLinks.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        if (item.primary) {
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="flex flex-col items-center justify-center -mt-6 group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 group-active:scale-95 transition-transform border-4 border-white">
                                        <Icon size={24} />
                                    </div>
                                    <span className="text-[10px] font-bold text-blue-600 mt-1">
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors min-w-[56px] ${
                                    isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
                                }`}
                            >
                                <Icon size={20} className={isActive ? "text-blue-600" : "text-slate-400"} />
                                <span className={`text-[10px] font-semibold mt-0.5 ${isActive ? "font-black" : ""}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
