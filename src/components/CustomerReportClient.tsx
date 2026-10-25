"use client";

import { useState } from "react";
import {
    Download, ArrowLeft, TrendingUp, FileSpreadsheet,
    Calendar, CreditCard, IndianRupee, ShoppingBag, FileText, User
} from "lucide-react";
import Link from "next/link";

interface CustomerReportClientProps {
    customer: any;
    invoices: any[];
    totalSpend: number;
}

function exportToExcel(customer: any, invoices: any[]) {
    // Dynamic import of xlsx to keep bundle lean
    import("xlsx").then(XLSX => {
        const rows: any[] = [];

        invoices.forEach((inv, idx) => {
            inv.items.forEach((item: any, itemIdx: number) => {
                rows.push({
                    "Invoice #": idx + 1,
                    "Date": new Date(inv.date).toLocaleDateString("en-IN"),
                    "Time": new Date(inv.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
                    "Item Name": item.name,
                    "Unit Price (₹)": item.price,
                    "Quantity": item.quantity,
                    "Line Total (₹)": item.price * item.quantity,
                    "Discount (₹)": itemIdx === 0 ? (inv.discountAmount || 0) : "",
                    "Invoice Total (₹)": itemIdx === 0 ? inv.totalAmount : "",
                    "Payment Type": itemIdx === 0 ? (inv.paymentType || "Cash") : "",
                    "Notes": itemIdx === 0 ? (inv.comment || "") : "",
                });
            });
        });

        // Summary rows at the bottom
        rows.push({});
        rows.push({
            "Invoice #": "SUMMARY",
            "Date": "",
            "Time": "",
            "Item Name": `Customer: ${customer.name}`,
            "Unit Price (₹)": "",
            "Quantity": "",
            "Line Total (₹)": "",
            "Discount (₹)": "",
            "Invoice Total (₹)": invoices.reduce((s: number, i: any) => s + i.totalAmount, 0),
            "Payment Type": `${invoices.length} invoices in last 90 days`,
            "Notes": `Report generated: ${new Date().toLocaleDateString("en-IN")}`,
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        // Auto-width columns
        const colWidths = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length, 14) }));
        ws["!cols"] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Customer Report");
        XLSX.writeFile(wb, `bill_report_${customer.name.replace(/\s+/g, "_")}_90days.xlsx`);
    });
}

const PAYMENT_COLORS: Record<string, string> = {
    Cash: "bg-green-50 text-green-700 border-green-100",
    Card: "bg-blue-50 text-blue-700 border-blue-100",
    UPI: "bg-purple-50 text-purple-700 border-purple-100",
};

export default function CustomerReportClient({ customer, invoices, totalSpend }: CustomerReportClientProps) {
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

    const avgBill = invoices.length > 0 ? totalSpend / invoices.length : 0;
    const paymentBreakdown = invoices.reduce((acc: Record<string, number>, inv) => {
        const pt = inv.paymentType || "Cash";
        acc[pt] = (acc[pt] || 0) + inv.totalAmount;
        return acc;
    }, {});

    return (
        <div className="space-y-8 pb-16">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex items-start gap-4">
                    <Link
                        href="/customers"
                        className="mt-1 p-2.5 bg-white border border-gray-200 text-gray-500 hover:text-gray-900 rounded-xl transition-all shadow-sm"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-100">
                                {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{customer.name}</h1>
                                <p className="text-gray-500 text-sm flex items-center gap-1.5 mt-0.5">
                                    <span>📞</span> {customer.phoneNumber}
                                    {customer.address && <span className="ml-2">📍 {customer.address}</span>}
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-3 ml-15">
                            Bill Report — Last 90 Days
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => exportToExcel(customer, invoices)}
                    disabled={invoices.length === 0}
                    className="flex items-center gap-2.5 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:grayscale text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-100 transition-all active:scale-95"
                >
                    <FileSpreadsheet size={18} /> Export to Excel
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    {
                        icon: FileText, label: "Total Bills", value: invoices.length.toString(),
                        color: "text-blue-600", bg: "bg-blue-50"
                    },
                    {
                        icon: IndianRupee, label: "Total Spend", value: `₹${totalSpend.toLocaleString("en-IN")}`,
                        color: "text-green-600", bg: "bg-green-50"
                    },
                    {
                        icon: TrendingUp, label: "Avg Bill", value: `₹${avgBill.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
                        color: "text-purple-600", bg: "bg-purple-50"
                    },
                    {
                        icon: ShoppingBag, label: "Items Ordered",
                        value: invoices.reduce((s, inv) => s + inv.items.reduce((si: number, it: any) => si + it.quantity, 0), 0).toString(),
                        color: "text-orange-600", bg: "bg-orange-50"
                    },
                ].map(card => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                            <div className={`w-10 h-10 ${card.bg} ${card.color} rounded-xl flex items-center justify-center mb-3`}>
                                <Icon size={20} />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{card.label}</p>
                            <p className="text-xl font-black text-gray-900 mt-0.5">{card.value}</p>
                        </div>
                    );
                })}
            </div>

            {/* Payment Breakdown */}
            {Object.keys(paymentBreakdown).length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Payment Breakdown</h2>
                    <div className="flex flex-wrap gap-3">
                        {Object.entries(paymentBreakdown).map(([type, amount]) => (
                            <div key={type} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-bold ${PAYMENT_COLORS[type] || "bg-gray-50 text-gray-700 border-gray-100"}`}>
                                <CreditCard size={14} />
                                {type}: ₹{(amount as number).toLocaleString("en-IN")}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Invoice Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                    <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                        <Calendar className="text-blue-500" size={20} /> Invoice History
                    </h2>
                    <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">
                        {invoices.length} records
                    </span>
                </div>

                {invoices.length === 0 ? (
                    <div className="p-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                            <FileText size={32} className="text-gray-200" />
                        </div>
                        <div>
                            <p className="font-extrabold text-gray-800">No bills in last 90 days</p>
                            <p className="text-sm text-gray-400 mt-1">This customer has no invoices in the selected period.</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">#</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Items</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Payment</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {invoices.map((inv, idx) => (
                                    <>
                                        <tr
                                            key={inv._id}
                                            className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                                            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                                        >
                                            <td className="px-6 py-4">
                                                <span className="w-7 h-7 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center text-xs font-black text-gray-600 group-hover:text-blue-700 transition-colors">
                                                    {invoices.length - idx}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-gray-800">
                                                    {new Date(inv.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-medium">
                                                    {new Date(inv.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                                                    {inv.items.length}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${PAYMENT_COLORS[inv.paymentType || "Cash"]}`}>
                                                    {inv.paymentType || "Cash"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-sm font-black text-gray-900">₹{inv.totalAmount.toLocaleString("en-IN")}</p>
                                                {inv.discountAmount > 0 && (
                                                    <p className="text-[10px] text-red-400 font-bold">−₹{inv.discountAmount} disc.</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <Link
                                                        href={`/public/invoice/${inv._id}`}
                                                        target="_blank"
                                                        onClick={e => e.stopPropagation()}
                                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                                                    >
                                                        View →
                                                    </Link>
                                                    {inv.pdfUrl && (
                                                        <a
                                                            href={inv.pdfUrl}
                                                            target="_blank"
                                                            onClick={e => e.stopPropagation()}
                                                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                                                        >
                                                            <Download size={10} /> PDF
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Expanded row */}
                                        {expandedIdx === idx && (
                                            <tr key={`${inv._id}-expanded`}>
                                                <td colSpan={6} className="px-6 pb-5 bg-blue-50/40">
                                                    <div className="mt-2 rounded-xl border border-blue-100 overflow-hidden">
                                                        <table className="w-full text-left text-xs">
                                                            <thead className="bg-blue-100/60">
                                                                <tr>
                                                                    <th className="px-4 py-2.5 font-black text-blue-700 uppercase tracking-wider">Item</th>
                                                                    <th className="px-4 py-2.5 font-black text-blue-700 uppercase tracking-wider text-right">Price</th>
                                                                    <th className="px-4 py-2.5 font-black text-blue-700 uppercase tracking-wider text-right">Qty</th>
                                                                    <th className="px-4 py-2.5 font-black text-blue-700 uppercase tracking-wider text-right">Total</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-blue-100/50">
                                                                {inv.items.map((item: any, i: number) => (
                                                                    <tr key={i} className="bg-white/60">
                                                                        <td className="px-4 py-2.5 font-semibold text-gray-800">{item.name}</td>
                                                                        <td className="px-4 py-2.5 text-gray-600 text-right">₹{item.price}</td>
                                                                        <td className="px-4 py-2.5 text-gray-600 text-right">×{item.quantity}</td>
                                                                        <td className="px-4 py-2.5 font-bold text-gray-900 text-right">₹{(item.price * item.quantity).toLocaleString("en-IN")}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    {inv.comment && (
                                                        <p className="mt-2 text-xs text-gray-500 italic px-1">📝 {inv.comment}</p>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
