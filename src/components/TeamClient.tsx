"use client";

import { useState } from "react";
import { addStaffMember, removeStaffMember } from "@/app/actions/team";
import { Users, UserPlus, Trash2, Mail, Shield, Plus, X, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Pagination from "./Pagination";

interface TeamClientProps {
    staff: any[];
    owner: any;
    currentPage: number;
    totalPages: number;
}

export default function TeamClient({ staff: initialStaff, owner, currentPage, totalPages }: TeamClientProps) {
    const [staff, setStaff] = useState(initialStaff);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleAddStaff = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const res = await addStaffMember(formData);
        if (res.success && res.staff) {
            setStaff((prev: any) => [res.staff, ...prev]);
            setIsModalOpen(false);
            router.refresh();
        } else {
            alert(res.error || "Failed to add staff member.");
        }
        setLoading(false);
    };

    const handleRemoveStaff = async (id: string) => {
        if (!confirm("Are you sure you want to remove this staff member? They will lose access immediately.")) return;
        setRemovingId(id);
        const res = await removeStaffMember(id);
        if (!res.success) alert(res.error || "Failed to remove staff.");
        else {
            setStaff((prev) => prev.filter((m) => m._id !== id));
            router.refresh();
        }
        setRemovingId(null);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <Users className="text-blue-600" size={32} />
                        Team Management
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 font-bold italic">Manage staff access and track team performance.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 bg-black text-white px-6 py-4 rounded-2xl font-black hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-gray-200 text-sm"
                >
                    <UserPlus size={18} />
                    Add Staff Member
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Owner Card (Permanent) */}
                <div className="bg-blue-600 rounded-3xl p-6 shadow-xl shadow-blue-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Shield size={120} />
                    </div>
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-blue-500/50 rounded-2xl flex items-center justify-center border border-white/20">
                                <Shield className="text-white" size={24} />
                            </div>
                            <div>
                                <h3 className="text-white font-black tracking-tight">{owner.name} (You)</h3>
                                <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">Business Owner</p>
                            </div>
                        </div>
                        <div className="mt-auto pt-8 flex items-center gap-2 text-blue-100">
                            <Mail size={14} />
                            <span className="text-xs font-bold truncate">{owner.email}</span>
                        </div>
                    </div>
                </div>

                {/* Staff Cards */}
                {staff.map((member: any) => (
                    <div key={member._id} className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 hover:border-blue-200 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                    <Users className="text-gray-400 group-hover:text-blue-500 transition-colors" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-gray-900 font-black tracking-tight">{member.name}</h3>
                                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Staff Account</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleRemoveStaff(member._id)}
                                disabled={removingId === member._id}
                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                                {removingId === member._id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                            </button>
                        </div>
                        <div className="pt-8 flex items-center gap-2 text-gray-500">
                            <Mail size={14} />
                            <span className="text-xs font-bold truncate">{member.email}</span>
                        </div>
                    </div>
                ))}

                {staff.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <UserPlus size={48} className="text-gray-200 mb-4" />
                        <p className="text-gray-400 font-black tracking-tight">No staff members added yet.</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="text-blue-600 font-black text-sm hover:underline mt-2">
                            Add your first team member
                        </button>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            )}

            {/* Add Staff Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Add New Staff</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-2xl transition-all"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddStaff} className="p-8 space-y-6">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Full Name</label>
                                <input name="name" required placeholder="John Doe" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Email Address</label>
                                <input name="email" type="email" required placeholder="john@example.com" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Password</label>
                                <input name="password" type="password" required placeholder="••••••••" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm" />
                            </div>
                            <button
                                disabled={loading}
                                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                                {loading ? "Creating..." : "Create Staff Account"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
