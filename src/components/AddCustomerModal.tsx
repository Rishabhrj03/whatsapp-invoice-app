"use client";

import { useState } from "react";
import { createCustomer } from "@/app/actions/customer";
import { X, UserPlus, Phone, MapPin, Calendar, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface AddCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (customer: any) => void;
}

export default function AddCustomerModal({ isOpen, onClose, onSuccess }: AddCustomerModalProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    if (!isOpen) return null;

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, ""); // Only digits
        e.target.value = val;
    };

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        const res = await createCustomer(formData);
        if (res.success) {
            setSuccess(true);
            if (onSuccess) onSuccess(res.customer);
            setTimeout(() => {
                setSuccess(false);
                onClose();
                router.refresh();
            }, 1000);
        } else {
            alert(res.error || "Failed to create customer");
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-blue-50 relative overflow-hidden animate-in fade-in zoom-in duration-300">
                {success && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Customer Added!</h3>
                        <p className="text-gray-500 text-sm">Reviewing your updated list...</p>
                    </div>
                )}

                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                            <UserPlus size={20} />
                        </div>
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">New Customer</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-6 space-y-5">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Full Name *</label>
                        <input
                            type="text"
                            name="name"
                            required
                            placeholder="e.g. John Doe"
                            className="block w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-black"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Phone Number *</label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="tel"
                                name="phoneNumber"
                                required
                                placeholder="10-digit number"
                                onChange={handlePhoneChange}
                                className="block w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-black"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Birthday</label>
                            <input
                                type="date"
                                name="birthdayDate"
                                className="block w-full px-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs text-black"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Anniversary</label>
                            <input
                                type="date"
                                name="anniversaryDate"
                                className="block w-full px-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs text-black"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Address</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-3 text-gray-400" size={16} />
                            <textarea
                                name="address"
                                rows={2}
                                placeholder="Street, City, ZIP"
                                className="block w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-black"
                            ></textarea>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-100 transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                        >
                            {loading ? "Adding..." : "Add Customer"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
