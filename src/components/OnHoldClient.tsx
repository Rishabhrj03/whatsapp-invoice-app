"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    PauseCircle,
    Play,
    Trash2,
    Search,
    Clock,
    User as UserIcon,
    Phone,
    ShoppingBag,
    CreditCard,
    DollarSign,
    Tag,
    ChevronDown,
    ChevronUp,
    Plus,
    AlertCircle
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import { deleteHeldInvoice } from "@/app/actions/onHold";
import type { OnHoldInvoiceDTO } from "@/types/domain";

interface OnHoldClientProps {
    initialHeldInvoices: OnHoldInvoiceDTO[];
}

export default function OnHoldClient({ initialHeldInvoices }: OnHoldClientProps) {
    const router = useRouter();
    const [heldInvoices, setHeldInvoices] = useState<OnHoldInvoiceDTO[]>(initialHeldInvoices);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

    // Deletion Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<OnHoldInvoiceDTO | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleConfirmDelete = async () => {
        if (!invoiceToDelete) return;

        setIsDeleting(true);
        setErrorMessage(null);

        try {
            const res = await deleteHeldInvoice(invoiceToDelete._id);
            if (res.success) {
                setHeldInvoices((prev) => prev.filter((item) => item._id !== invoiceToDelete._id));
                setDeleteModalOpen(false);
                setInvoiceToDelete(null);
                router.refresh();
            } else {
                setErrorMessage(res.error || "Failed to delete held bill");
            }
        } catch (err: any) {
            setErrorMessage(err.message || "An unexpected error occurred");
        } finally {
            setIsDeleting(false);
        }
    };

    const openDeleteModal = (invoice: OnHoldInvoiceDTO) => {
        setInvoiceToDelete(invoice);
        setDeleteModalOpen(true);
    };

    const filteredInvoices = heldInvoices.filter((inv) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;

        const refMatch = inv.holdReference?.toLowerCase().includes(query);
        const nameMatch = inv.customerName?.toLowerCase().includes(query);
        const phoneMatch = inv.customerPhone?.toLowerCase().includes(query);
        const itemMatch = inv.items?.some((it) => it.name.toLowerCase().includes(query));

        return refMatch || nameMatch || phoneMatch || itemMatch;
    });

    const formatTimestamp = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <PauseCircle size={22} className="stroke-[2.5]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                                    On-Hold Bills
                                </h1>
                                <span className="bg-amber-100 text-amber-800 text-xs font-black px-2.5 py-0.5 rounded-full">
                                    {heldInvoices.length}
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
                                Temporarily parked orders. Resume anytime to complete payment or discard if cancelled.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/invoice/create"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
                    >
                        <Plus size={18} />
                        <span>Generate Bill</span>
                    </Link>
                </div>
            </div>

            {/* Error Notification */}
            {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm flex items-center gap-3">
                    <AlertCircle size={18} className="flex-shrink-0" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {/* Search Filter Bar */}
            {heldInvoices.length > 0 && (
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by customer name, phone, reference or item name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-hidden focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all shadow-xs"
                    />
                </div>
            )}

            {/* Cards Container */}
            {heldInvoices.length === 0 ? (
                /* Empty state when zero bills held */
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-xs">
                    <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <PauseCircle size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No Bills Currently On Hold</h3>
                    <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 leading-relaxed">
                        When billing customers with multiple items during rush hours, click{" "}
                        <span className="font-semibold text-gray-700">"Hold Bill"</span> on the Generate Bill screen to park the order and serve other customers immediately.
                    </p>
                    <div className="mt-6">
                        <Link
                            href="/invoice/create"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm transition-all shadow-sm"
                        >
                            <Plus size={16} />
                            Go to Generate Bill
                        </Link>
                    </div>
                </div>
            ) : filteredInvoices.length === 0 ? (
                /* Empty state when search yields no result */
                <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center shadow-xs">
                    <Search size={28} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm font-semibold text-gray-700">No matching on-hold bills found</p>
                    <p className="text-xs text-gray-500 mt-1">Try searching with a different name, phone, or item.</p>
                </div>
            ) : (
                /* Held Invoices Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredInvoices.map((inv) => {
                        const isExpanded = !!expandedCards[inv._id];
                        const totalItemCount = inv.items?.reduce((acc, curr) => acc + (curr.quantity || 1), 0) || 0;

                        return (
                            <div
                                key={inv._id}
                                className="bg-white rounded-3xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
                            >
                                {/* Card Header */}
                                <div className="p-5 border-b border-gray-100">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200/60">
                                                    <PauseCircle size={12} />
                                                    {inv.holdReference || `Hold #${inv._id.slice(-4)}`}
                                                </span>
                                                <span className="text-[11px] font-semibold text-gray-400">
                                                    #{inv._id.slice(-6).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                                                <Clock size={12} />
                                                <span>{formatTimestamp(inv.createdAt)}</span>
                                            </div>
                                        </div>

                                        <div className="text-right flex-shrink-0">
                                            <div className="text-xl font-black text-gray-900 tracking-tight">
                                                ₹{inv.totalAmount.toFixed(2)}
                                            </div>
                                            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                                {inv.paymentType}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Customer Info */}
                                    <div className="mt-4 pt-3 border-t border-gray-100/70 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                                <UserIcon size={12} />
                                            </div>
                                            <span className="font-bold text-gray-800 truncate">
                                                {inv.customerName || "Walk-in Guest"}
                                            </span>
                                        </div>
                                        {inv.customerPhone && (
                                            <div className="flex items-center gap-1 text-gray-500 font-medium">
                                                <Phone size={11} />
                                                <span>{inv.customerPhone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Items Preview Section */}
                                <div className="p-5 flex-1 bg-gray-50/40">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                                            <ShoppingBag size={13} className="text-gray-400" />
                                            <span>{inv.items?.length || 0} unique items ({totalItemCount} total)</span>
                                        </div>
                                        {inv.items && inv.items.length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() => toggleExpand(inv._id)}
                                                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                                            >
                                                {isExpanded ? (
                                                    <>Less <ChevronUp size={12} /></>
                                                ) : (
                                                    <>+{inv.items.length - 2} more <ChevronDown size={12} /></>
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    {/* Item listing */}
                                    <div className="space-y-1.5">
                                        {(isExpanded ? inv.items : inv.items?.slice(0, 2))?.map((it, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between text-xs bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-2xs"
                                            >
                                                <div className="min-w-0 pr-2">
                                                    <span className="font-semibold text-gray-800 truncate block">
                                                        {it.name}
                                                    </span>
                                                    {it.description && (
                                                        <span className="text-[10px] text-gray-400 truncate block">
                                                            {it.description}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <span className="text-gray-500 font-medium">×{it.quantity}</span>
                                                    <span className="font-bold text-gray-800 ml-2">
                                                        ₹{(it.price * it.quantity).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Discount badge if any */}
                                    {inv.discountAmount && inv.discountAmount > 0 ? (
                                        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg font-bold border border-emerald-100">
                                            <Tag size={12} />
                                            <span>
                                                Discount applied: -₹{inv.discountAmount.toFixed(2)}
                                                {inv.couponCode ? ` (${inv.couponCode})` : ""}
                                            </span>
                                        </div>
                                    ) : null}

                                    {/* Order comment if any */}
                                    {inv.comment && (
                                        <p className="mt-2 text-[11px] text-gray-500 italic bg-gray-100/70 p-2 rounded-xl">
                                            "{inv.comment}"
                                        </p>
                                    )}
                                </div>

                                {/* Actions Footer */}
                                <div className="p-4 bg-white border-t border-gray-100 flex items-center gap-2">
                                    <Link
                                        href={`/invoice/create?holdId=${inv._id}`}
                                        className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                                    >
                                        <Play size={14} className="fill-white" />
                                        <span>Resume & Bill</span>
                                    </Link>

                                    <button
                                        type="button"
                                        onClick={() => openDeleteModal(inv)}
                                        className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100"
                                        title="Discard Held Bill"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Confirm Discard Modal */}
            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    if (!isDeleting) {
                        setDeleteModalOpen(false);
                        setInvoiceToDelete(null);
                    }
                }}
                onConfirm={handleConfirmDelete}
                title="Discard Held Bill?"
                message={`Are you sure you want to discard this held bill for ${
                    invoiceToDelete?.customerName || invoiceToDelete?.holdReference || "this customer"
                }? This will permanently remove the parked order data.`}
                confirmText="Discard Bill"
                cancelText="Keep on Hold"
                type="danger"
                isLoading={isDeleting}
            />
        </div>
    );
}
