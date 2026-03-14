"use client";

import { useState, useEffect } from "react";
import { createCategory, updateCategory } from "@/app/actions/category";
import { X, Tag, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface CreateCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (category: any) => void;
    editingCategory?: any;
}

export default function CreateCategoryModal({ isOpen, onClose, onSuccess, editingCategory }: CreateCategoryModalProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // We don't need much here as the form elements will be controlled by default value or we can use a ref.
        // But for simplicity with FormData, we can just let people type.
    }, [editingCategory]);

    if (!isOpen) return null;

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;

        try {
            let res;
            if (editingCategory) {
                res = await updateCategory(editingCategory._id, { name, description });
            } else {
                res = await createCategory({ name, description });
            }

            if (res.success) {
                setSuccess(true);
                if (onSuccess) onSuccess(res.category);
                setTimeout(() => {
                    setSuccess(false);
                    onClose();
                    router.refresh();
                }, 1000);
            } else {
                alert(res.error || `Failed to ${editingCategory ? 'update' : 'create'} category`);
            }
        } catch (err) {
            console.error(err);
            alert("An error occurred");
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-indigo-50 relative overflow-hidden animate-in fade-in zoom-in duration-300">
                {success && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{editingCategory ? "Category Updated!" : "Category Added!"}</h3>
                    </div>
                )}

                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Tag size={20} />
                        </div>
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">{editingCategory ? "Edit Category" : "New Category"}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-6 space-y-5">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Category Name *</label>
                        <input
                            type="text"
                            name="name"
                            required
                            defaultValue={editingCategory?.name || ""}
                            placeholder="e.g. Desserts, Services"
                            className="block w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm text-black font-bold"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Description (Optional)</label>
                        <textarea
                            name="description"
                            rows={2}
                            defaultValue={editingCategory?.description || ""}
                            placeholder="Brief details..."
                            className="block w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm text-black"
                        ></textarea>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                        >
                            {loading ? "Saving..." : (editingCategory ? "Update Category" : "Add Category")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
