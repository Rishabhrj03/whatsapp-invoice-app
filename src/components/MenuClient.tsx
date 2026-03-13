"use client";

import { useState } from "react";
import { createMenuEntry, deleteMenuEntry } from "@/app/actions/menu";
import { Trash2, PlusCircle, Tag, IndianRupee, FileText, LayoutGrid, CheckCircle2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import ConfirmModal from "./ConfirmModal";

export default function MenuClient({ initialMenuItems }: { initialMenuItems: any[] }) {
    const [menuItems, setMenuItems] = useState(initialMenuItems);
    const [view, setView] = useState<"list" | "add">("list");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: "" });
    const router = useRouter();

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Only allow digits and a single decimal point
        const val = e.target.value.replace(/[^0-9.]/g, "");
        const parts = val.split(".");
        if (parts.length > 2) {
            e.target.value = parts[0] + "." + parts.slice(1).join("");
        } else {
            e.target.value = val;
        }
    };

    const handleDelete = async () => {
        const id = deleteModal.id;
        if (!id) return;

        setLoading(true);
        try {
            const res = await deleteMenuEntry(id);
            if (res.success) {
                setMenuItems(prev => prev.filter(item => item._id.toString() !== id));
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

        const res = await createMenuEntry(formData);
        if (res.success && res.menuItem) {
            setMenuItems(prev => [res.menuItem, ...prev]);
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setView("list");
                router.refresh();
            }, 1000);
        } else {
            alert(res.error || "Failed to create menu item");
        }
        setLoading(false);
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Menu Items</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage your standard inventory items and pricing.</p>
                </div>
                {view === "list" ? (
                    <button
                        onClick={() => setView("add")}
                        className="flex items-center justify-center gap-2 py-3 px-6 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold shadow-lg shadow-orange-100 transition-all active:scale-95"
                    >
                        <PlusCircle size={18} /> Add Menu Item
                    </button>
                ) : (
                    <button
                        onClick={() => setView("list")}
                        className="flex items-center justify-center gap-2 py-3 px-6 bg-white border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
                    >
                        <ArrowLeft size={18} /> Back to Catalog
                    </button>
                )}
            </div>

            {view === "add" ? (
                <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-orange-50 relative overflow-hidden">
                        {success && (
                            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
                                <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
                                    <CheckCircle2 size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Item Added!</h3>
                                <p className="text-gray-500 text-sm">Updating catalog...</p>
                            </div>
                        )}

                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                                <PlusCircle size={24} />
                            </div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Item Details</h2>
                        </div>

                        <form onSubmit={onSubmit} className="space-y-6">
                            <div className="space-y-1.5">
                                <label htmlFor="name" className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Item Name *</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    required
                                    placeholder="e.g. Chocolate Cake"
                                    className="block w-full px-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-sm text-black"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="price" className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Price (₹) *</label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        id="price"
                                        name="price"
                                        required
                                        placeholder="0.00"
                                        onChange={handlePriceChange}
                                        className="block w-full pl-12 pr-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-sm text-black font-bold"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="category" className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Category</label>
                                <div className="relative">
                                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        id="category"
                                        name="category"
                                        placeholder="e.g. Desserts"
                                        className="block w-full pl-12 pr-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-sm text-black"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="description" className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Description</label>
                                <div className="relative">
                                    <FileText className="absolute left-4 top-4 text-gray-400" size={18} />
                                    <textarea
                                        id="description"
                                        name="description"
                                        rows={3}
                                        placeholder="Ingredients or details..."
                                        className="block w-full pl-12 pr-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-sm text-black"
                                    ></textarea>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black shadow-xl shadow-orange-100 transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                            >
                                {loading ? "Saving..." : "Save Menu Item"}
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                                <LayoutGrid className="text-orange-500" size={20} />
                                Item Catalog
                            </h2>
                            <span className="bg-orange-50 text-orange-600 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">
                                {menuItems.length} Products
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Info</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Category</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Price</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right px-10">Manage</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {menuItems.map((item) => (
                                        <tr key={item._id.toString()} className="hover:bg-orange-50/20 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="min-w-[40px] h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md">
                                                        {item.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">{item.name}</p>
                                                        {item.description && (
                                                            <p className="text-[10px] text-gray-400 font-medium truncate max-w-[200px]">
                                                                {item.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                {item.category ? (
                                                    <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-orange-100 text-orange-700">
                                                        {item.category}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300 text-[10px] italic">Universal</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-right font-black text-gray-900 text-sm">
                                                ₹{parseFloat(item.price).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-5 text-right px-10">
                                                <button
                                                    onClick={() => setDeleteModal({ isOpen: true, id: item._id.toString() })}
                                                    className="p-3 text-red-100 group-hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                                                    title="Delete Item"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {menuItems.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-20 text-center">
                                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <LayoutGrid className="text-gray-200" size={40} />
                                                </div>
                                                <p className="text-sm text-gray-500 font-bold">Your menu catalog is empty</p>
                                                <p className="text-xs text-gray-400 mt-1">Add items to start building invoices.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: "" })}
                onConfirm={handleDelete}
                title="Delete Menu Item?"
                message="This item will be removed from your catalog. Existing invoices with this item will not be affected."
                confirmText="Yes, Remove Item"
                isLoading={loading}
            />
        </div>
    );
}
