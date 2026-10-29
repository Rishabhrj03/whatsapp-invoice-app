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
    RotateCcw
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import AddCustomerModal from "./AddCustomerModal";
import EditInvoiceModal from "./EditInvoiceModal";
import Pagination from "./Pagination";

interface TransactionsClientProps {
    initialInvoices: any[];
    currentPage: number;
    totalPages: number;
    totalCount?: number;
    initialSearch: string;
    initialStartDate?: string;
    initialEndDate?: string;
    initialPreset?: string;
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
    userRole,
}: TransactionsClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [datePreset, setDatePreset] = useState(initialPreset);
    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(initialEndDate);
    const [isCustomDateOpen, setIsCustomDateOpen] = useState(initialPreset === "custom" || !!(initialStartDate || initialEndDate));
    
    const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<any>(null);
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

    const handleResetAllFilters = () => {
        setSearchQuery("");
        setDatePreset("all");
        setStartDate("");
        setEndDate("");
        setIsCustomDateOpen(false);
        router.push(pathname);
    };

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
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

    const isFiltered = Boolean(initialSearch || (datePreset && datePreset !== "all") || initialStartDate || initialEndDate);

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
                <div className="flex items-center gap-2.5">
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

                        <button
                            type="button"
                            onClick={handleResetAllFilters}
                            className="inline-flex items-center gap-1 text-slate-500 hover:text-red-600 font-bold text-xs transition-colors ml-auto"
                        >
                            <RotateCcw size={13} />
                            <span>Reset All Filters</span>
                        </button>
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
                                            <p className="text-base font-black text-slate-900">
                                                ₹{inv.totalAmount.toLocaleString("en-IN")}
                                            </p>
                                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border mt-0.5 ${getPaymentBadge(inv.paymentType || "Cash")}`}>
                                                {inv.paymentType || "Cash"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Line items snippet */}
                                    <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-600 flex items-center justify-between">
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

                                    {/* Touch-Friendly Action Bar */}
                                    <div className="flex items-center gap-2 pt-1">
                                        <Link
                                            href={`/public/invoice/${inv._id}`}
                                            target="_blank"
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors min-h-[40px]"
                                        >
                                            <span>View Bill</span>
                                            <ArrowRight size={14} />
                                        </Link>

                                        {inv.customer?.phoneNumber && (
                                            <>
                                                <a
                                                    href={`https://wa.me/${inv.customer.phoneNumber.replace(/\D/g,'').length === 10 ? '91' + inv.customer.phoneNumber.replace(/\D/g,'') : inv.customer.phoneNumber.replace(/\D/g,'')}?text=${encodeURIComponent(`*Bill from your order*\nDate: ${new Date(inv.date).toLocaleDateString('en-IN')}\nAmount: ₹${inv.totalAmount}\nPayment: ${inv.paymentType || 'Cash'}${inv.pdfUrl ? '\nView PDF: ' + inv.pdfUrl : ''}`)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] rounded-xl text-xs font-bold transition-colors min-h-[40px]"
                                                    title="Send over WhatsApp"
                                                >
                                                    <MessageCircle size={16} />
                                                    <span className="hidden xs:inline">WhatsApp</span>
                                                </a>
                                                <a
                                                    href={`sms:${inv.customer.phoneNumber.replace(/\D/g,'')}?body=${encodeURIComponent(`Dear ${inv.customer.name || 'Customer'}, your bill of Rs. ${inv.totalAmount} dated ${new Date(inv.date).toLocaleDateString('en-IN')} is ready.`)}`}
                                                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-bold transition-colors min-h-[40px]"
                                                    title="Send over SMS"
                                                >
                                                    <MessageSquare size={16} />
                                                    <span className="hidden xs:inline">SMS</span>
                                                </a>
                                            </>
                                        )}

                                        {isOwner && (
                                            <button
                                                onClick={() => setEditingInvoice(inv)}
                                                className="flex items-center justify-center gap-1 py-2 px-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-xs font-bold transition-colors min-h-[40px]"
                                                title="Edit Bill (Owner only)"
                                            >
                                                <Edit3 size={15} />
                                                <span className="hidden xs:inline">Edit</span>
                                            </button>
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
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                                                    {inv.items.length}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getPaymentBadge(inv.paymentType || "Cash")}`}>
                                                    {inv.paymentType || 'Cash'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-sm font-black text-slate-900">
                                                    ₹{inv.totalAmount.toLocaleString("en-IN")}
                                                </p>
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

                                                    {inv.customer?.phoneNumber && (
                                                        <>
                                                            <a
                                                                href={`https://wa.me/${inv.customer.phoneNumber.replace(/\D/g,'').length === 10 ? '91' + inv.customer.phoneNumber.replace(/\D/g,'') : inv.customer.phoneNumber.replace(/\D/g,'')}?text=${encodeURIComponent(`*Bill from your order*\nDate: ${new Date(inv.date).toLocaleDateString('en-IN')}\nAmount: ₹${inv.totalAmount}\nPayment: ${inv.paymentType || 'Cash'}${inv.pdfUrl ? '\nView PDF: ' + inv.pdfUrl : ''}`)}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors"
                                                                title="Send WhatsApp"
                                                            >
                                                                <MessageCircle size={14} /> WhatsApp
                                                            </a>
                                                            <a
                                                                href={`sms:${inv.customer.phoneNumber.replace(/\D/g,'')}?body=${encodeURIComponent(`Dear ${inv.customer.name || 'Customer'}, your bill of Rs. ${inv.totalAmount} dated ${new Date(inv.date).toLocaleDateString('en-IN')} is ready.`)}`}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-bold transition-colors"
                                                                title="Send Text Message"
                                                            >
                                                                <MessageSquare size={14} /> SMS
                                                            </a>
                                                        </>
                                                    )}

                                                    {isOwner && (
                                                        <button
                                                            onClick={() => setEditingInvoice(inv)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-xs font-bold transition-colors"
                                                            title="Edit Bill (Owner only)"
                                                        >
                                                            <Edit3 size={14} /> Edit
                                                        </button>
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
        </div>
    );
}
