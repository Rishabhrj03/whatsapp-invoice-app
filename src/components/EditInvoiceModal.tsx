"use client";

import { useState, useEffect } from "react";
import { updateInvoice } from "@/app/actions/invoice";
import { X, Plus, Trash2, CheckCircle2, Loader2, AlertTriangle, IndianRupee, Edit3 } from "lucide-react";

interface InvoiceItem {
    menuEntryId?: string;
    name: string;
    price: number;
    quantity: number;
}

interface EditInvoiceModalProps {
    isOpen: boolean;
    invoice: any;
    onClose: () => void;
    onSaved: (updated: any) => void;
}

export default function EditInvoiceModal({ isOpen, invoice, onClose, onSaved }: EditInvoiceModalProps) {
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [paymentType, setPaymentType] = useState<'Cash' | 'Card' | 'UPI'>('Cash');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (invoice && isOpen) {
            setItems(invoice.items?.map((it: any) => ({
                menuEntryId: it.menuEntryId,
                name: it.name,
                price: it.price,
                quantity: it.quantity,
            })) || []);
            setPaymentType(invoice.paymentType || 'Cash');
            setDiscountAmount(invoice.discountAmount || 0);
            setComment(invoice.comment || '');
            setSuccess(false);
        }
    }, [invoice, isOpen]);

    if (!isOpen || !invoice) return null;

    const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const total = Math.max(0, subtotal - discountAmount);

    const handleItemChange = (idx: number, field: keyof InvoiceItem, value: any) => {
        const next = [...items];
        (next[idx] as any)[field] = field === 'name' ? value : parseFloat(value) || 0;
        setItems(next);
    };

    const handleAddItem = () => {
        setItems([...items, { name: '', price: 0, quantity: 1 }]);
    };

    const handleRemoveItem = (idx: number) => {
        setItems(items.filter((_, i) => i !== idx));
    };

    const handleSave = async () => {
        if (items.length === 0 || items.some(it => !it.name || it.price <= 0)) {
            alert("All items must have a name and a price greater than 0.");
            return;
        }
        setLoading(true);
        const res = await updateInvoice(invoice._id, {
            items,
            paymentType,
            totalAmount: total,
            discountAmount,
            comment,
        });
        setLoading(false);
        if (res.success) {
            setSuccess(true);
            setTimeout(() => {
                onSaved(res.invoice);
                onClose();
            }, 1000);
        } else {
            alert(res.error || "Failed to save changes.");
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl border border-gray-100 relative overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50 to-red-50 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-200">
                            <Edit3 size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Edit Invoice</h2>
                            <p className="text-xs text-orange-600 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <AlertTriangle size={10} /> Owner access only — changes are permanent
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-8 space-y-6">
                    {/* Items */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Items</h3>
                            <button
                                onClick={handleAddItem}
                                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                            >
                                <Plus size={14} /> Add Item
                            </button>
                        </div>
                        <div className="space-y-3">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={e => handleItemChange(idx, 'name', e.target.value)}
                                            placeholder="Item name"
                                            className="w-full text-sm font-bold text-gray-800 bg-transparent border-b border-gray-200 focus:border-blue-400 outline-none pb-1"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-white rounded-xl border border-gray-200 px-3 py-2 w-28">
                                        <IndianRupee size={12} className="text-gray-400" />
                                        <input
                                            type="number"
                                            value={item.price}
                                            onChange={e => handleItemChange(idx, 'price', e.target.value)}
                                            placeholder="Price"
                                            min="0"
                                            className="w-full text-sm font-bold text-gray-800 bg-transparent outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-white rounded-xl border border-gray-200 px-3 py-2 w-20">
                                        <span className="text-xs text-gray-400 font-bold">×</span>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                                            min="1"
                                            className="w-full text-sm font-bold text-gray-800 bg-transparent outline-none"
                                        />
                                    </div>
                                    <span className="text-sm font-black text-gray-900 w-20 text-right">
                                        ₹{(item.price * item.quantity).toLocaleString()}
                                    </span>
                                    <button
                                        onClick={() => handleRemoveItem(idx)}
                                        disabled={items.length === 1}
                                        className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Payment Type */}
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Payment Type</label>
                        <div className="flex gap-3">
                            {(['Cash', 'Card', 'UPI'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setPaymentType(type)}
                                    className={`flex-1 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${paymentType === type
                                        ? type === 'Cash' ? 'border-green-500 bg-green-50 text-green-700'
                                            : type === 'Card' ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-purple-500 bg-purple-50 text-purple-700'
                                        : 'border-gray-200 text-gray-400 hover:border-gray-300'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Discount & Notes */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Discount (₹)</label>
                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                                <IndianRupee size={14} className="text-gray-400" />
                                <input
                                    type="number"
                                    value={discountAmount}
                                    onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                                    min="0"
                                    className="flex-1 text-sm font-bold text-gray-800 bg-transparent outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Notes</label>
                            <input
                                type="text"
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                placeholder="Optional note..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium text-gray-800 focus:ring-2 focus:ring-orange-400 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-2">
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>Subtotal</span>
                            <span className="font-bold">₹{subtotal.toLocaleString()}</span>
                        </div>
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-red-500">
                                <span>Discount</span>
                                <span className="font-bold">−₹{discountAmount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-black text-gray-900 pt-2 border-t border-gray-200">
                            <span>Total</span>
                            <span>₹{total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading || success}
                        className="flex items-center gap-2.5 px-8 py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-2xl font-black text-sm shadow-lg shadow-orange-100 transition-all active:scale-95"
                    >
                        {success ? (
                            <><CheckCircle2 size={16} /> Saved!</>
                        ) : loading ? (
                            <><Loader2 size={16} className="animate-spin" /> Saving...</>
                        ) : (
                            <><Edit3 size={16} /> Save Changes</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
