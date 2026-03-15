"use client";

import { useState } from "react";
import { Plus, Tag, Trash2, Percent, DollarSign, Check } from "lucide-react";
import { createCoupon, deleteCoupon } from "@/app/actions/coupon";

interface CouponsClientProps {
    initialCoupons: any[];
    menuItems: any[];
}

export default function CouponsClient({ initialCoupons, menuItems }: CouponsClientProps) {
    const [coupons, setCoupons] = useState(initialCoupons);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [code, setCode] = useState("");
    const [type, setType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
    const [value, setValue] = useState<number>(0);
    const [applicableTo, setApplicableTo] = useState<'ALL' | 'SPECIFIC_ITEMS'>('ALL');
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code || value <= 0) return alert("Please fill standard fields.");

        setLoading(true);
        const res = await createCoupon({
            code: code.toUpperCase(),
            type,
            value,
            applicableTo,
            itemIds: applicableTo === 'SPECIFIC_ITEMS' ? selectedItems : []
        });

        if (res.success) {
            setCoupons([{ _id: res.couponId, code: code.toUpperCase(), type, value, applicableTo, itemIds: selectedItems, isActive: true }, ...coupons]);
            setIsAdding(false);
            resetForm();
        } else {
            alert(res.error);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete coupon?")) return;
        const res = await deleteCoupon(id);
        if (res.success) {
            setCoupons(coupons.filter(c => c._id !== id));
        }
    };

    const resetForm = () => {
        setCode("");
        setType("PERCENTAGE");
        setValue(0);
        setApplicableTo("ALL");
        setSelectedItems([]);
    };

    const toggleItem = (itemId: string) => {
        setSelectedItems(prev =>
            prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-xl transition-all shadow-lg"
                >
                    <Plus size={18} />
                    {isAdding ? "Cancel" : "Create Coupon"}
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-lg font-black text-gray-900 border-b pb-2">New Coupon</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">Coupon Code</label>
                            <input
                                type="text"
                                placeholder="SAVE10"
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 font-bold uppercase text-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">Discount Type</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setType('PERCENTAGE')} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${type === 'PERCENTAGE' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700'}`}>
                                    <Percent size={16} /> Percentage
                                </button>
                                <button type="button" onClick={() => setType('FIXED')} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${type === 'FIXED' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700'}`}>
                                    <DollarSign size={16} /> Fixed
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">Discount Value</label>
                            <input
                                type="number"
                                value={value}
                                onChange={e => setValue(parseFloat(e.target.value) || 0)}
                                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">Applicable To</label>
                            <select
                                value={applicableTo}
                                onChange={e => setApplicableTo(e.target.value as any)}
                                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-gray-900"
                            >
                                <option value="ALL">All Items</option>
                                <option value="SPECIFIC_ITEMS">Specific Products</option>
                            </select>
                        </div>
                    </div>

                    {applicableTo === 'SPECIFIC_ITEMS' && (
                        <div className="border-t pt-2 space-y-2">
                            <label className="block text-xs font-bold text-gray-400">Select Items</label>
                            <div className="max-h-40 overflow-y-auto border rounded-xl p-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                {menuItems.map(item => (
                                    <button
                                        type="button"
                                        key={item._id}
                                        onClick={() => toggleItem(item._id)}
                                        className={`p-2 rounded-lg text-left text-sm font-bold flex items-center justify-between ${selectedItems.includes(item._id) ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-700'}`}
                                    >
                                        <span>{item.name}</span>
                                        {selectedItems.includes(item._id) && <Check size={16} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold"
                    >
                        {loading ? "Saving..." : "Save Coupon"}
                    </button>
                </form>
            )}

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {coupons.length > 0 ? (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">Code</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">Type</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">Value</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">Applicability</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {coupons.map(c => (
                                <tr key={c._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-black text-blue-600">{c.code}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-700">{c.type}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{c.type === 'PERCENTAGE' ? `${c.value}%` : `₹${c.value}`}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-gray-500">
                                        {c.applicableTo === 'ALL' ? 'All Items' : `${c.itemIds?.length || 0} Items`}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleDelete(c._id)} className="text-red-500 hover:text-red-700 p-2">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-10 text-center text-gray-400 font-bold">No coupons found. Create one.</div>
                )}
            </div>
        </div>
    );
}
