"use client";

import { useState } from "react";
import { createCustomer, deleteCustomer } from "@/app/actions/customer";
import { Trash2, UserPlus, Phone, MapPin, Calendar, Users as UsersIcon, CheckCircle2, ArrowLeft, BarChart2, MessageCircle } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import ConfirmModal from "./ConfirmModal";
import Pagination from "./Pagination";

interface CustomerData {
    _id: string;
    name: string;
    phoneNumber: string;
    birthdayDate?: string;
    anniversaryDate?: string;
    address?: string;
}

interface CustomersClientProps {
    initialCustomers: any[];
    currentPage: number;
    totalPages: number;
}

export default function CustomersClient({ initialCustomers, currentPage, totalPages }: CustomersClientProps) {
    const [customers, setCustomers] = useState(initialCustomers);
    const [view, setView] = useState<"list" | "add">("list");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: "" });
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, ""); // Only digits
        e.target.value = val;
    };

    const handleDelete = async () => {
        const id = deleteModal.id;
        if (!id) return;

        setLoading(true);
        try {
            const res = await deleteCustomer(id);
            if (res.success) {
                setCustomers(prev => prev.filter(c => c._id.toString() !== id));
                setDeleteModal({ isOpen: false, id: "" });
                router.refresh();
            } else {
                alert(res.error || "Delete failed");
            }
        } catch (err) {
            console.error(err);
            alert("An error occurred during deletion");
        }
        setLoading(false);
    };

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        const res = await createCustomer(formData);
        if (res.success && res.customer) {
            setCustomers(prev => [res.customer, ...prev]);
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setView("list");
                router.refresh();
            }, 1000);
        } else {
            alert(res.error || "Failed to create customer");
        }
        setLoading(false);
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Customers</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage your customer database and records.</p>
                </div>
                {view === "list" ? (
                    <button
                        onClick={() => setView("add")}
                        className="flex items-center justify-center gap-2 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-95"
                    >
                        <UserPlus size={18} /> Add New Customer
                    </button>
                ) : (
                    <button
                        onClick={() => setView("list")}
                        className="flex items-center justify-center gap-2 py-3 px-6 bg-white border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
                    >
                        <ArrowLeft size={18} /> Back to List
                    </button>
                )}
            </div>

            {view === "add" ? (
                <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-blue-50 relative overflow-hidden">
                        {success && (
                            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
                                <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
                                    <CheckCircle2 size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Customer Saved!</h3>
                                <p className="text-gray-500 text-sm">Switching to list view...</p>
                            </div>
                        )}

                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                <UserPlus size={24} />
                            </div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Customer Details</h2>
                        </div>

                        <form onSubmit={onSubmit} className="space-y-6">
                            <div className="space-y-1.5">
                                <label htmlFor="name" className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Full Name *</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    required
                                    placeholder="e.g. John Doe"
                                    className="block w-full px-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-black"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="phoneNumber" className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Phone Number *</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="tel"
                                        id="phoneNumber"
                                        name="phoneNumber"
                                        required
                                        placeholder="10-digit number"
                                        onChange={handlePhoneChange}
                                        className="block w-full pl-12 pr-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-black font-medium"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label htmlFor="birthdayDate" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Birthday</label>
                                    <input
                                        type="date"
                                        id="birthdayDate"
                                        name="birthdayDate"
                                        className="block w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs text-black"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="anniversaryDate" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Anniversary</label>
                                    <input
                                        type="date"
                                        id="anniversaryDate"
                                        name="anniversaryDate"
                                        className="block w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs text-black"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="address" className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Address</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-4 text-gray-400" size={18} />
                                    <textarea
                                        id="address"
                                        name="address"
                                        rows={3}
                                        placeholder="Street, City, ZIP"
                                        className="block w-full pl-12 pr-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-black"
                                    ></textarea>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-100 transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                            >
                                {loading ? "Saving..." : "Save Customer Details"}
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                                <UsersIcon className="text-blue-500" size={20} />
                                Registered Customers
                            </h2>
                            <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">
                                {customers.length} Entries
                            </span>
                        </div>
                        {/* Mobile Cards View (< 768px) */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {customers.map((customer) => (
                                <div key={customer._id.toString()} className="p-4 space-y-3 hover:bg-slate-50/60 transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm flex-shrink-0">
                                                {customer.name ? customer.name.charAt(0).toUpperCase() : "C"}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-900 truncate">{customer.name}</p>
                                                <p className="text-xs text-slate-500 font-medium tracking-wide mt-0.5">{customer.phoneNumber}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setDeleteModal({ isOpen: true, id: customer._id.toString() })}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                            title="Delete Customer"
                                            aria-label="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {customer.address && (
                                        <p className="text-xs text-slate-500 flex items-center gap-1.5 pl-1">
                                            <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                                            <span className="truncate">{customer.address}</span>
                                        </p>
                                    )}

                                    {/* Dates Badges */}
                                    {(customer.birthdayDate || customer.anniversaryDate) && (
                                        <div className="flex flex-wrap gap-2 pt-0.5">
                                            {customer.birthdayDate && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-100">
                                                    <Calendar size={11} /> BDay: {new Date(customer.birthdayDate).toLocaleDateString()}
                                                </span>
                                            )}
                                            {customer.anniversaryDate && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                                    <Calendar size={11} /> Anniv: {new Date(customer.anniversaryDate).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Action Bar */}
                                    <div className="flex items-center gap-2 pt-1">
                                        <Link
                                            href={`/customers/${customer._id}/report`}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all min-h-[40px]"
                                            title="View 90-day bill report"
                                        >
                                            <BarChart2 size={14} />
                                            <span>90-Day Report</span>
                                        </Link>
                                        {customer.phoneNumber && (
                                            <a
                                                href={`https://wa.me/${customer.phoneNumber.replace(/\D/g, '').length === 10 ? '91' + customer.phoneNumber.replace(/\D/g, '') : customer.phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent('Hello ' + customer.name + ', ')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-1.5 py-2 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all min-h-[40px]"
                                                title="Open WhatsApp chat"
                                            >
                                                <MessageCircle size={15} />
                                                <span>WhatsApp</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {customers.length === 0 && (
                                <div className="p-12 text-center space-y-2">
                                    <UsersIcon className="text-slate-300 mx-auto" size={32} />
                                    <p className="text-sm font-bold text-slate-700">No customers registered yet</p>
                                </div>
                            )}
                        </div>

                        {/* Desktop & Tablet Table View (>= 768px) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/80 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Customer Info</th>
                                        <th className="px-6 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Special Dates</th>
                                        <th className="px-6 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right px-8">Manage</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {customers.map((customer) => (
                                        <tr key={customer._id.toString()} className="hover:bg-blue-50/20 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="min-w-[40px] h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm">
                                                        {customer.name ? customer.name.charAt(0).toUpperCase() : "C"}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{customer.name}</p>
                                                        <p className="text-xs text-slate-500 font-medium tracking-wide">{customer.phoneNumber}</p>
                                                    </div>
                                                </div>
                                                {customer.address && (
                                                    <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1.5 ml-14">
                                                        <MapPin size={11} /> {customer.address}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {customer.birthdayDate && (
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-pink-700 bg-pink-50 px-2.5 py-1 rounded-lg border border-pink-100">
                                                            <Calendar size={12} /> BDay: {new Date(customer.birthdayDate).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                    {customer.anniversaryDate && (
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                                                            <Calendar size={12} /> Anniv: {new Date(customer.anniversaryDate).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                    {!customer.birthdayDate && !customer.anniversaryDate && (
                                                        <span className="text-slate-300 text-xs italic">No dates added</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/customers/${customer._id}/report`}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all"
                                                        title="View 90-day bill report"
                                                    >
                                                        <BarChart2 size={14} /> Report
                                                    </Link>
                                                    {customer.phoneNumber && (
                                                        <a
                                                            href={`https://wa.me/${customer.phoneNumber.replace(/\D/g, '').length === 10 ? '91' + customer.phoneNumber.replace(/\D/g, '') : customer.phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent('Hello ' + customer.name + ', ')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all"
                                                            title="Open WhatsApp chat"
                                                        >
                                                            <MessageCircle size={14} /> WhatsApp
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => setDeleteModal({ isOpen: true, id: customer._id.toString() })}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                        title="Delete Customer"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {customers.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-16 text-center">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <UsersIcon className="text-slate-300" size={32} />
                                                </div>
                                                <p className="text-sm text-slate-700 font-bold">Your customer list is empty</p>
                                                <p className="text-xs text-slate-400 mt-1">Start by adding your first client using the button above.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {totalPages > 1 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    )}
                </div>
            )}

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: "" })}
                onConfirm={handleDelete}
                title="Delete Customer?"
                message="This will permanently remove this customer and all their associated history. This action cannot be undone."
                confirmText="Yes, Delete Customer"
                isLoading={loading}
            />
        </div>
    );
}
