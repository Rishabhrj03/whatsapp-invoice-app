"use client";

import { useState, useEffect } from "react";
import {
    Search,
    Plus,
    FileText,
    UserPlus,
    Calendar,
    ArrowRight,
    FileDown,
    Edit3,
    MessageCircle,
    MessageSquare,
    IndianRupee,
    CreditCard,
    ShoppingBag,
    Phone,
    Shield,
    X,
    Filter,
    CalendarDays,
    RotateCcw,
    Users,
    Ban,
    AlertOctagon,
    Loader2
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import AddCustomerModal from "./AddCustomerModal";
import EditInvoiceModal from "./EditInvoiceModal";
import Pagination from "./Pagination";
import { normalizeWhatsAppPhone } from "@/lib/phone-utils";
import { cancelInvoice } from "@/app/actions/invoice";

interface TransactionsClientProps {
    initialInvoices: any[];
    currentPage: number;
    totalPages: number;
    totalCount?: number;
    initialSearch: string;
    initialStartDate?: string;
    initialEndDate?: string;
    initialPreset?: string;
    initialStatus?: string;
    userRole?: string;
}

export default function TransactionsClient({
    initialInvoices,
    currentPage,
    totalPages,
    totalCount = 0,
    initialSearch,
    initialStartDate = "",
    initialEndDate = "",
    initialPreset = "all",
    initialStatus = "all",
    userRole,
}: TransactionsClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [datePreset, setDatePreset] = useState(initialPreset);
    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(initialEndDate);
    const [statusFilter, setStatusFilter] = useState(initialStatus);
    const [isCustomDateOpen, setIsCustomDateOpen] = useState(initialPreset === "custom" || !!(initialStartDate || initialEndDate));
    
    const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<any>(null);
    const [cancellingInvoice, setCancellingInvoice] = useState<any>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [invoices, setInvoices] = useState(initialInvoices);

    const isOwner = userRole === 'OWNER';

    // Synchronize local invoices state when server props update from navigation
    useEffect(() => {
        setInvoices(initialInvoices);
    }, [initialInvoices]);

    useEffect(() => {
        setSearchQuery(initialSearch);
    }, [initialSearch]);

    useEffect(() => {
        setStatusFilter(initialStatus || "all");
    }, [initialStatus]);

    useEffect(() => {
        setDatePreset(initialPreset || (initialStartDate || initialEndDate ? "custom" : "all"));
        if (initialStartDate) setStartDate(initialStartDate);
        if (initialEndDate) setEndDate(initialEndDate);
        if (initialPreset === "custom" || initialStartDate || initialEndDate) {
            setIsCustomDateOpen(true);
        }
    }, [initialPreset, initialStartDate, initialEndDate]);

    // Debounced search query update to URL search params
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (searchQuery === initialSearch) return;

            const params = new URLSearchParams(searchParams.toString());
            if (searchQuery.trim()) {
                params.set("search", searchQuery.trim());
            } else {
                params.delete("search");
            }
            params.set("page", "1");
            router.push(`${pathname}?${params.toString()}`);
        }, 400);

        return () => clearTimeout(timeout);
    }, [searchQuery, initialSearch, pathname, router, searchParams]);

    const handleClearSearch = () => {
        setSearchQuery("");
        const params = new URLSearchParams(searchParams.toString());
        params.delete("search");
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`);
    };

    const handlePresetChange = (preset: string) => {
        setDatePreset(preset);
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", "1");

        if (preset === "all") {
            params.delete("datePreset");
            params.delete("startDate");
            params.delete("endDate");
            setIsCustomDateOpen(false);
            setStartDate("");
            setEndDate("");
            router.push(`${pathname}?${params.toString()}`);
        } else if (preset === "custom") {
            setIsCustomDateOpen(true);
            // Don't push yet; user will select custom dates and click Apply
        } else {
            setIsCustomDateOpen(false);
            params.set("datePreset", preset);
            params.delete("startDate");
            params.delete("endDate");
            router.push(`${pathname}?${params.toString()}`);
        }
    };

    const handleApplyCustomDates = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", "1");
        params.set("datePreset", "custom");
        if (startDate) params.set("startDate", startDate);
        else params.delete("startDate");
        if (endDate) params.set("endDate", endDate);
        else params.delete("endDate");

        router.push(`${pathname}?${params.toString()}`);
    };

    const handleClearDateFilter = () => {
        setDatePreset("all");
        setStartDate("");
        setEndDate("");
        setIsCustomDateOpen(false);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("datePreset");
        params.delete("startDate");
        params.delete("endDate");
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleStatusChange = (newStatus: string) => {
        setStatusFilter(newStatus);
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", "1");
        if (newStatus === "all") {
            params.delete("status");
        } else {
            params.set("status", newStatus);
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleResetAllFilters = () => {
        setSearchQuery("");
        setDatePreset("all");
        setStartDate("");
        setEndDate("");
        setStatusFilter("all");
        setIsCustomDateOpen(false);
        router.push(pathname);
    };

    const handleConfirmCancel = async () => {
        if (!cancellingInvoice) return;
        setIsCancelling(true);
        try {
            const res = await cancelInvoice(cancellingInvoice._id);
            if (res.success && res.invoice) {
                setInvoices(prev => prev.map(inv =>
                    inv._id === cancellingInvoice._id
                        ? { ...inv, status: 'Cancelled' }
                        : inv
                ));
                setCancellingInvoice(null);
            } else {
                alert(res.error || "Failed to cancel transaction.");
            }
        } catch (err: any) {
            alert(err.message || "Failed to cancel transaction.");
        } finally {
            setIsCancelling(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    const getExportUrl = () => {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("search", searchQuery.trim());
        if (datePreset && datePreset !== "all") params.set("datePreset", datePreset);
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
        if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
        const q = params.toString();
        return `/api/v1/export-csv${q ? `?${q}` : ""}`;
    };

    const buildTransactionWhatsAppUrls = (inv: any) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const dateStr = inv.date ? new Date(inv.date).toLocaleDateString('en-IN') : '';
        const text = `*Bill from your order*\nDate: ${dateStr}\nAmount: ₹${inv.totalAmount}\nPayment: ${inv.paymentType || 'Cash'}\n\n📄 Download PDF: ${origin}/api/invoices/${inv._id}/download\n📱 View Bill: ${origin}/public/invoice/${inv._id}`;
        const encodedText = encodeURIComponent(text);
        const normalizedPhone = normalizeWhatsAppPhone(inv.customer?.phoneNumber);

        return {
            customerUrl: normalizedPhone ? `https://api.whatsapp.com/send?phone=${normalizedPhone}&text=${encodedText}` : null,
            contactPickerUrl: `https://api.whatsapp.com/send?text=${encodedText}`,
        };
    };

    const getInvoiceStatusBadge = (status?: string) => {
        const s = (status || 'Paid').toLowerCase();
        if (s === 'cancelled') {
            return {
                label: 'Cancelled',
                className: 'bg-rose-50 text-rose-700 border-rose-200/80',
                dot: 'bg-rose-500',
            };
        }
        if (s === 'unpaid') {
            return {
                label: 'Unpaid',
                className: 'bg-amber-50 text-amber-700 border-amber-200/80',
                dot: 'bg-amber-500',
            };
        }
        // Paid or legacy 'Sent'
        return {
            label: 'Paid',
            className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
            dot: 'bg-emerald-500',
        };
    };

    const getPaymentBadge = (paymentType: string) => {
        switch (paymentType) {
            case 'Cash':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'Card':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'UPI':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const isFiltered = Boolean(
        initialSearch ||
        (datePreset && datePreset !== "all") ||
        initialStartDate ||
        initialEndDate ||
        (statusFilter && statusFilter !== "all")
    );

    const getPresetLabel = (preset: string) => {
        switch (preset) {
            case 'today': return 'Today';
            case 'yesterday': return 'Yesterday';
            case 'week': return 'Last 7 Days';
            case 'month': return 'This Month';
            case 'custom': return 'Custom Range';
            default: return 'All Time';
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Toolbar: Search & Main Actions */}
            <div className="flex flex-col sm:flex-row gap-3.5 justify-between items-stretch sm:items-center">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by customer name, phone (+91), or bill ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-medium shadow-sm outline-none placeholder:text-slate-400 text-slate-900"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={handleClearSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                            title="Clear search"
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <a
                        href={getExportUrl()}
                        download
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-800 text-xs md:text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95"
                        title={isFiltered ? `Export ${totalCount} filtered bills to CSV` : "Export all bills to CSV"}
                    >
                        <FileDown size={16} className="text-emerald-600" />
                        <span>Export CSV</span>
                        {isFiltered && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-black border border-emerald-200">
                                {totalCount}
                            </span>
                        )}
                    </a>
                    <button
                        onClick={() => setIsAddCustomerOpen(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs md:text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95"
                    >
                        <UserPlus size={16} className="text-blue-500" />
                        <span>Add Customer</span>
                    </button>
                    <Link
                        href="/invoice/create"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95"
                    >
                        <Plus size={16} />
                        <span>Create Bill</span>
                    </Link>
                </div>
            </div>

            {/* Date Filters Bar */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-wider">
                        <CalendarDays size={16} className="text-blue-600" />
                        <span>Filter By Date:</span>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {[
                            { id: 'all', label: 'All Time' },
                            { id: 'today', label: 'Today' },
                            { id: 'yesterday', label: 'Yesterday' },
                            { id: 'week', label: 'Last 7 Days' },
                            { id: 'month', label: 'This Month' },
                            { id: 'custom', label: 'Custom Range' },
                        ].map((preset) => {
                            const isActive = datePreset === preset.id;
                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => handlePresetChange(preset.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        isActive
                                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 ring-2 ring-blue-600 ring-offset-1'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Status Filter Row */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-wider">
                        <Filter size={15} className="text-blue-600" />
                        <span>Filter By Status:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {[
                            { id: 'all', label: 'All Statuses' },
                            { id: 'paid', label: 'Paid' },
                            { id: 'unpaid', label: 'Unpaid' },
                            { id: 'cancelled', label: 'Cancelled' },
                        ].map((s) => {
                            const isActive = statusFilter === s.id;
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => handleStatusChange(s.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        isActive
                                            ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900 ring-offset-1'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Custom Date Range Picker Drawer */}
                {isCustomDateOpen && (
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <span>From:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <span>To:</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleApplyCustomDates}
                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-blue-500/20"
                            >
                                Apply Range
                            </button>
                            {(startDate || endDate) && (
                                <button
                                    type="button"
                                    onClick={handleClearDateFilter}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-all"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Active Filter Indicators Bar */}
                {isFiltered && (
                    <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-500">
                                Found {totalCount} {totalCount === 1 ? 'bill' : 'bills'}:
                            </span>
                            {initialSearch && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                                    <span>Search: &ldquo;{initialSearch}&rdquo;</span>
                                    <button
                                        type="button"
                                        onClick={handleClearSearch}
                                        className="hover:text-blue-900 p-0.5"
                                        title="Remove search filter"
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            )}
                            {statusFilter !== 'all' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
                                    <span>Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleStatusChange('all')}
                                        className="hover:text-purple-900 p-0.5"
                                        title="Clear status filter"
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            )}
                            {(datePreset !== 'all' || initialStartDate || initialEndDate) && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                                    <span>
                                        Date: {datePreset === 'custom' && (initialStartDate || initialEndDate) 
                                            ? `${initialStartDate || 'Any'} to ${initialEndDate || 'Now'}` 
                                            : getPresetLabel(datePreset)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleClearDateFilter}
                                        className="hover:text-emerald-900 p-0.5"
                                        title="Clear date filter"
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2.5 ml-auto">
                            <a
                                href={getExportUrl()}
                                download
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm shadow-emerald-600/20 active:scale-95"
                                title="Download these filtered transactions to CSV"
                            >
                                <FileDown size={13} />
                                <span>Export Filtered ({totalCount})</span>
                            </a>
                            <button
                                type="button"
                                onClick={handleResetAllFilters}
                                className="inline-flex items-center gap-1 text-slate-500 hover:text-red-600 font-bold text-xs transition-colors"
                            >
                                <RotateCcw size={13} />
                                <span>Reset All</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Invoices List: Responsive Card on Mobile / Full Table on Desktop & Tablet */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                {invoices.length > 0 ? (
                    <>
                        {/* 1. Mobile Cards View (< 768px) */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {invoices.map((inv) => (
                                <div key={inv._id} className="p-4 space-y-3 hover:bg-slate-50/60 transition-colors">
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm">
                                                {inv.customer?.name ? inv.customer.name.charAt(0).toUpperCase() : "G"}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-900 truncate">
                                                    {inv.customer?.name || <span className="text-slate-400 italic">Guest Customer</span>}
                                                </p>
                                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                    <Calendar size={12} className="text-slate-400" />
                                                    {new Date(inv.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className={`text-base font-black ${inv.status === 'Cancelled' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                                ₹{inv.totalAmount.toLocaleString("en-IN")}
                                            </p>
                                            <div className="flex items-center justify-end gap-1 mt-0.5 flex-wrap">
                                                {inv.isEdited && (
                                                    <span
                                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200"
                                                        title={`Edited ${inv.editCount ? `(${inv.editCount}x)` : ''}${inv.editedAt ? ` on ${new Date(inv.editedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}`}
                                                    >
                                                        <Edit3 size={9} className="text-purple-600" />
                                                        <span>Edited</span>
                                                    </span>
                                                )}
                                                {(() => {
                                                    const badge = getInvoiceStatusBadge(inv.status);
                                                    return (
                                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${badge.className}`}>
                                                            <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
                                                            <span>{badge.label}</span>
                                                        </span>
                                                    );
                                                })()}
                                                <span className={`inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${getPaymentBadge(inv.paymentType || "Cash")}`}>
                                                    {inv.paymentType || "Cash"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Line items snippet */}
                                    <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-600 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="flex items-center gap-1.5 font-medium">
                                                <ShoppingBag size={14} className="text-slate-400" />
                                                {inv.items.length} {inv.items.length === 1 ? "item" : "items"}
                                            </span>
                                            {inv.discountAmount > 0 && (
                                                <span className="text-emerald-600 font-bold">
                                                    Discount: ₹{inv.discountAmount}
                                                </span>
                                            )}
                                        </div>
                                        {inv.items?.some((it: any) => it.description) && (
                                            <p className="text-[11px] text-slate-500 font-medium italic truncate">
                                                Note: {inv.items.filter((it: any) => it.description).map((it: any) => `${it.name}: ${it.description}`).join(' • ')}
                                            </p>
                                        )}
                                    </div>

                                    {/* Touch-Friendly Action Bar */}
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                        <Link
                                            href={`/public/invoice/${inv._id}`}
                                            target="_blank"
                                            className="flex-1 min-w-[65px] flex items-center justify-center gap-1 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors min-h-[38px]"
                                            title="View Digital Invoice"
                                        >
                                            <span>View</span>
                                            <ArrowRight size={13} />
                                        </Link>

                                        <a
                                            href={`/api/invoices/${inv._id}/download`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-1 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors min-h-[38px]"
                                            title="Download PDF"
                                        >
                                            <FileDown size={14} className="text-slate-600" />
                                            <span>PDF</span>
                                        </a>

                                        {(() => {
                                            const { customerUrl, contactPickerUrl } = buildTransactionWhatsAppUrls(inv);
                                            return (
                                                <>
                                                    {customerUrl && (
                                                        <a
                                                            href={customerUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center justify-center gap-1 py-2 px-2.5 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] rounded-xl text-xs font-bold transition-colors min-h-[38px]"
                                                            title="Send directly to customer on WhatsApp"
                                                        >
                                                            <MessageCircle size={15} />
                                                            <span>WhatsApp</span>
                                                        </a>
                                                    )}
                                                    <a
                                                        href={contactPickerUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-center gap-1 py-2 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-colors min-h-[38px]"
                                                        title="Choose contact on WhatsApp"
                                                    >
                                                        <Users size={15} />
                                                        <span>Contact</span>
                                                    </a>
                                                    {inv.customer?.phoneNumber && (
                                                        <a
                                                            href={`sms:${inv.customer.phoneNumber.replace(/\D/g,'')}?body=${encodeURIComponent(`Dear ${inv.customer.name || 'Customer'}, your bill of Rs. ${inv.totalAmount} dated ${new Date(inv.date).toLocaleDateString('en-IN')} is ready.`)}`}
                                                            className="flex items-center justify-center gap-1 py-2 px-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-bold transition-colors min-h-[38px]"
                                                            title="Send over SMS"
                                                        >
                                                            <MessageSquare size={15} />
                                                            <span className="hidden xs:inline">SMS</span>
                                                        </a>
                                                    )}
                                                </>
                                            );
                                        })()}

                                        {isOwner && inv.status !== 'Cancelled' && (
                                            <>
                                                <button
                                                    onClick={() => setEditingInvoice(inv)}
                                                    className="flex items-center justify-center gap-1 py-2 px-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-xs font-bold transition-colors min-h-[38px]"
                                                    title="Edit Bill (Owner only)"
                                                >
                                                    <Edit3 size={14} />
                                                    <span className="hidden xs:inline">Edit</span>
                                                </button>
                                                <button
                                                    onClick={() => setCancellingInvoice(inv)}
                                                    className="flex items-center justify-center gap-1 py-2 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors min-h-[38px]"
                                                    title="Cancel Transaction"
                                                >
                                                    <Ban size={14} />
                                                    <span className="hidden xs:inline">Cancel</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 2. Desktop & Tablet Table View (>= 768px) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100">
                                        <th className="px-6 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Date & Time</th>
                                        <th className="px-6 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Customer</th>
                                        <th className="px-6 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider text-center">Status</th>
                                        <th className="px-6 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider text-center">Items</th>
                                        <th className="px-6 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider text-center">Payment</th>
                                        <th className="px-6 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Amount</th>
                                        <th className="px-6 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {invoices.map((inv) => (
                                        <tr key={inv._id} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-600 transition-colors">
                                                        <Calendar size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">
                                                            {new Date(inv.date).toLocaleDateString("en-IN", {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                year: 'numeric'
                                                            })}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400 font-medium">
                                                            {new Date(inv.date).toLocaleTimeString("en-IN", {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-slate-900 truncate max-w-[180px]">
                                                    {inv.customer?.name || <span className="text-slate-400 italic">Guest</span>}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate max-w-[150px]">
                                                    {inv.customer?.phoneNumber || "No phone"}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <div className="flex flex-col items-center justify-center gap-1">
                                                    {(() => {
                                                        const badge = getInvoiceStatusBadge(inv.status);
                                                        return (
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${badge.className}`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                                                <span>{badge.label}</span>
                                                            </span>
                                                        );
                                                    })()}
                                                    {inv.isEdited && (
                                                        <span
                                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs"
                                                            title={`Edited ${inv.editCount ? `(${inv.editCount}x)` : ''}${inv.editedAt ? ` on ${new Date(inv.editedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}`}
                                                        >
                                                            <Edit3 size={9} className="text-purple-600" />
                                                            <span>Edited</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span 
                                                    className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold cursor-default hover:bg-slate-200 transition-colors"
                                                    title={inv.items?.map((it: any) => `${it.name}${it.description ? ` (${it.description})` : ''} ×${it.quantity}`).join('\n')}
                                                >
                                                    {inv.items.length}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getPaymentBadge(inv.paymentType || "Cash")}`}>
                                                    {inv.paymentType || 'Cash'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {inv.status === 'Cancelled' ? (
                                                    <div>
                                                        <p className="text-sm font-black text-slate-400 line-through">
                                                            ₹{inv.totalAmount.toLocaleString("en-IN")}
                                                        </p>
                                                        <span className="text-[10px] font-bold text-rose-600 uppercase">
                                                            Cancelled
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm font-black text-slate-900">
                                                        ₹{inv.totalAmount.toLocaleString("en-IN")}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Link
                                                        href={`/public/invoice/${inv._id}`}
                                                        target="_blank"
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-bold transition-colors"
                                                        title="View Digital Invoice"
                                                    >
                                                        <span>View</span>
                                                        <ArrowRight size={13} />
                                                    </Link>

                                                    <a
                                                        href={`/api/invoices/${inv._id}/download`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                                                        title="Download Official PDF"
                                                    >
                                                        <FileDown size={14} className="text-slate-600" /> PDF
                                                    </a>

                                                    {(() => {
                                                        const { customerUrl, contactPickerUrl } = buildTransactionWhatsAppUrls(inv);
                                                        return (
                                                            <>
                                                                {customerUrl && (
                                                                    <a
                                                                        href={customerUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors"
                                                                        title={`Send WhatsApp directly to ${inv.customer.phoneNumber}`}
                                                                    >
                                                                        <MessageCircle size={14} /> WhatsApp
                                                                    </a>
                                                                )}
                                                                <a
                                                                    href={contactPickerUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg text-xs font-bold transition-colors"
                                                                    title="Choose any WhatsApp contact or group to send bill"
                                                                >
                                                                    <Users size={14} /> Choose Contact
                                                                </a>
                                                                {inv.customer?.phoneNumber && (
                                                                    <a
                                                                        href={`sms:${inv.customer.phoneNumber.replace(/\D/g,'')}?body=${encodeURIComponent(`Dear ${inv.customer.name || 'Customer'}, your bill of Rs. ${inv.totalAmount} dated ${new Date(inv.date).toLocaleDateString('en-IN')} is ready.`)}`}
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-bold transition-colors"
                                                                        title="Send Text Message"
                                                                    >
                                                                        <MessageSquare size={14} /> SMS
                                                                    </a>
                                                                )}
                                                            </>
                                                        );
                                                    })()}

                                                    {isOwner && inv.status !== 'Cancelled' && (
                                                        <>
                                                            <button
                                                                onClick={() => setEditingInvoice(inv)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-xs font-bold transition-colors"
                                                                title="Edit Bill (Owner only)"
                                                            >
                                                                <Edit3 size={14} /> Edit
                                                            </button>
                                                            <button
                                                                onClick={() => setCancellingInvoice(inv)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors"
                                                                title="Cancel Transaction (Owner only)"
                                                            >
                                                                <Ban size={14} /> Cancel
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="p-16 text-center space-y-4">
                        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <FileText size={32} />
                        </div>
                        <div className="max-w-md mx-auto space-y-1.5">
                            <p className="text-slate-900 font-extrabold text-base">
                                {isFiltered ? "No matching transactions found" : "No transactions found"}
                            </p>
                            <p className="text-sm text-slate-500">
                                {isFiltered 
                                    ? "No bills matched your active search term or date range filter." 
                                    : "You haven't generated any invoices yet. Create your first bill to see it here."}
                            </p>
                        </div>
                        {isFiltered && (
                            <div>
                                <button
                                    type="button"
                                    onClick={handleResetAllFilters}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all"
                                >
                                    <RotateCcw size={14} />
                                    <span>Clear All Filters</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            )}

            <AddCustomerModal
                isOpen={isAddCustomerOpen}
                onClose={() => setIsAddCustomerOpen(false)}
            />

            {isOwner && (
                <EditInvoiceModal
                    isOpen={!!editingInvoice}
                    invoice={editingInvoice}
                    onClose={() => setEditingInvoice(null)}
                    onSaved={(updated) => {
                        setInvoices(prev => prev.map(inv =>
                            inv._id === updated._id ? { ...inv, ...updated, customer: inv.customer } : inv
                        ));
                        setEditingInvoice(null);
                    }}
                />
            )}

            {/* Safety Confirmation Modal for Transaction Cancellation */}
            {cancellingInvoice && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" 
                        onClick={() => !isCancelling && setCancellingInvoice(null)} 
                    />
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-rose-100 relative overflow-hidden flex flex-col p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl flex-shrink-0">
                                <AlertOctagon size={28} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-black text-slate-900">
                                    Cancel Bill #{cancellingInvoice._id.slice(-6).toUpperCase()}?
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    Owner Action • This transaction will be soft-cancelled and preserved with full audit logs.
                                </p>
                            </div>
                        </div>

                        {/* Bill Details Summary Card */}
                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs">
                            <div className="flex justify-between text-slate-600">
                                <span>Customer:</span>
                                <span className="font-bold text-slate-900">{cancellingInvoice.customer?.name || "Guest Customer"}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>Date:</span>
                                <span className="font-bold text-slate-900">{new Date(cancellingInvoice.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>Payment Mode:</span>
                                <span className="font-bold text-slate-900">{cancellingInvoice.paymentType || "Cash"}</span>
                            </div>
                            <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-200 text-sm">
                                <span className="font-bold">Total Amount:</span>
                                <span className="font-black text-rose-600">₹{cancellingInvoice.totalAmount.toLocaleString("en-IN")}</span>
                            </div>
                        </div>

                        {/* Notice */}
                        <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl text-[11px] text-rose-800 space-y-1">
                            <p className="font-bold">What happens when you cancel:</p>
                            <ul className="list-disc list-inside space-y-0.5 text-rose-700">
                                <li>The pre-cancellation invoice PDF is archived to S3 (<code className="font-mono text-[10px]">invoices/cancelled/</code>).</li>
                                <li>The active bill PDF is regenerated with a bold <strong>CANCELLED</strong> watermark.</li>
                                <li>This amount (₹{cancellingInvoice.totalAmount}) is excluded from revenue calculations.</li>
                            </ul>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                disabled={isCancelling}
                                onClick={() => setCancellingInvoice(null)}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all disabled:opacity-50"
                            >
                                Keep Bill
                            </button>
                            <button
                                type="button"
                                disabled={isCancelling}
                                onClick={handleConfirmCancel}
                                className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs shadow-md shadow-rose-600/25 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isCancelling ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Cancelling Bill...</span>
                                    </>
                                ) : (
                                    <>
                                        <Ban size={14} />
                                        <span>Confirm & Cancel Bill</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
