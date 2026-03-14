"use client";

import { useState } from "react";
import {
    Search,
    Plus,
    FileText,
    UserPlus,
    Calendar,
    ArrowRight
} from "lucide-react";
import Link from "next/link";
import AddCustomerModal from "./AddCustomerModal";

export default function TransactionsClient({ initialInvoices }: { initialInvoices: any[] }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

    const filteredInvoices = initialInvoices.filter((inv) => {
        const customerName = inv.customer?.name?.toLowerCase() || "guest";
        return customerName.includes(searchQuery.toLowerCase());
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by customer name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    />
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setIsAddCustomerOpen(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-xl transition-all shadow-sm"
                    >
                        <UserPlus size={18} className="text-blue-500" />
                        New Customer
                    </button>
                    <Link
                        href="/invoice/create"
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-100"
                    >
                        <Plus size={18} />
                        New Invoice
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {filteredInvoices.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Items</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredInvoices.map((inv) => (
                                    <tr key={inv._id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                                                    <Calendar size={16} className="text-gray-500 group-hover:text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">
                                                        {new Date(inv.date).toLocaleDateString(undefined, {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">
                                                        {new Date(inv.date).toLocaleTimeString(undefined, {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-gray-800">
                                                {inv.customer?.name || <span className="text-gray-400 italic font-medium">Guest</span>}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate max-w-[150px]">
                                                {inv.customer?.phoneNumber || "No contact info"}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                                                {inv.items.length}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="text-sm font-black text-gray-900">
                                                ₹{inv.totalAmount.toLocaleString()}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/public/invoice/${inv._id}`}
                                                target="_blank"
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                                            >
                                                View Online <ArrowRight size={14} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mx-auto">
                            <FileText size={32} />
                        </div>
                        <div>
                            <p className="text-gray-900 font-extrabold">No transactions found</p>
                            <p className="text-sm text-gray-500">Try searching for a different customer or create a new invoice.</p>
                        </div>
                    </div>
                )}
            </div>

            <AddCustomerModal
                isOpen={isAddCustomerOpen}
                onClose={() => setIsAddCustomerOpen(false)}
            />
        </div>
    );
}
