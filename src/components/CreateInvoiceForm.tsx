"use client";

import { useState, useEffect, useRef } from "react";
import { createInvoice } from "@/app/actions/invoice";
import {
    Plus, Trash2, Send, FileDown, Eye, Edit2,
    CheckCircle, UserPlus, ShoppingBag, CreditCard,
    ChevronRight, Calendar, Info
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import CustomerSelector from "./CustomerSelector";
import AddCustomerModal from "./AddCustomerModal";
import { useRouter } from "next/navigation";

export default function CreateInvoiceForm({
    customers: initialCustomers,
    menuItems,
}: {
    customers: any[];
    menuItems: any[];
}) {
    const router = useRouter();
    const [customers, setCustomers] = useState(initialCustomers);
    const [customerId, setCustomerId] = useState("");
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [items, setItems] = useState<{ menuEntryId: string; name: string; price: number; quantity: number }[]>([]);
    const [comment, setComment] = useState("");
    const [loading, setLoading] = useState(false);
    const [successData, setSuccessData] = useState<any>(null);
    const [invoiceId, setInvoiceId] = useState("");
    const [isPreview, setIsPreview] = useState(false);
    const [hasDownloaded, setHasDownloaded] = useState(false);
    const [canShare, setCanShare] = useState(false);
    const [currentDate, setCurrentDate] = useState("");

    // Check share compatibility on mount
    useEffect(() => {
        setCurrentDate(new Date().toLocaleDateString());
        if (typeof navigator !== "undefined" && !!navigator.share) {
            const file = new File(["test"], "test.pdf", { type: "application/pdf" });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                setCanShare(true);
            }
        }
    }, []);

    const totalAmount = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const selectedCustomer = customers.find((c) => c._id === customerId);

    const handleAddItem = () => {
        setItems([...items, { menuEntryId: "", name: "", price: 0, quantity: 1 }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        if (field === "menuEntryId") {
            const selectedMenu = menuItems.find((m) => m._id === value);
            if (selectedMenu) {
                newItems[index] = {
                    ...newItems[index],
                    menuEntryId: value,
                    name: selectedMenu.name,
                    price: selectedMenu.price,
                };
            }
        } else {
            newItems[index] = { ...newItems[index], [field]: value };
        }
        setItems(newItems);
    };

    const getInvoiceFile = (data: any): File => {
        const doc = new jsPDF();
        const customer = customers.find((c) => c._id === data.customerId);

        // Header
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text("INVOICE", 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 105, 28, { align: "center" });

        // Business Info
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("WA Invoice App", 14, 45);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("Premium Digital Billing", 14, 50);

        // Customer Info
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Bill To:", 14, 65);
        doc.setFontSize(11);
        doc.text(customer?.name || "Customer", 14, 72);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(customer?.phoneNumber || "", 14, 78);
        doc.text(customer?.address || "", 14, 84);

        // Table
        const tableData = data.items.map((item: any, index: number) => [
            index + 1,
            item.name,
            `₹${item.price.toFixed(2)}`,
            item.quantity,
            `₹${(item.price * item.quantity).toFixed(2)}`,
        ]);

        autoTable(doc, {
            startY: 95,
            head: [["#", "Description", "Unit Price", "Quantity", "Total"]],
            body: tableData,
            theme: "striped",
            headStyles: { fillColor: [37, 99, 235] }, // Blue-600
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;

        // Totals
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Subtotal: ₹${data.totalAmount.toFixed(2)}`, 140, finalY);
        doc.setFontSize(14);
        doc.text(`Total: ₹${data.totalAmount.toFixed(2)}`, 140, finalY + 8);

        // Notes
        if (data.comment) {
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text("Notes:", 14, finalY);
            doc.text(data.comment, 14, finalY + 5);
        }

        // Footer
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text("Thank you for your business!", 105, 285, { align: "center" });

        const blob = doc.output("blob");
        const filename = `invoice_${customer?.name.replace(/\s+/g, "_")}_${Date.now()}.pdf`;
        return new File([blob], filename, { type: "application/pdf" });
    };

    const generatePDF = (data: any) => {
        const file = getInvoiceFile(data);
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        setHasDownloaded(true);
    };

    const handleDirectShare = async () => {
        if (!successData) return;

        const file = getInvoiceFile(successData);
        const customer = customers.find((c) => c._id === successData.customerId);

        const shareData = {
            files: [file],
            title: `Invoice for ${customer?.name}`,
            text: `Professional invoice for ${customer?.name} - View online: ${window.location.origin}/public/invoice/${invoiceId}`,
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                setHasDownloaded(true);
            } catch (err) {
                console.error("Share failed", err);
                // Fallback to standard WhatsApp link if sharing failed
                handleWhatsAppSend();
            }
        } else {
            handleWhatsAppSend();
        }
    };

    const handleWhatsAppSend = () => {
        if (!successData) return;

        // If user hasn't downloaded, trigger it now
        if (!hasDownloaded) {
            generatePDF(successData);
        }

        const customer = customers.find((c) => c._id === successData.customerId);
        if (!customer) return;

        let text = `*Invoice from WA Invoice*\n`;
        text += `Hello ${customer.name},\n\n`;
        text += `*Details:*\n`;
        successData.items.forEach((item: any) => {
            text += `- ${item.name} x${item.quantity} = ₹${(
                item.price * item.quantity
            ).toFixed(2)}\n`;
        });
        text += `\n*Total Amount:* ₹${successData.totalAmount.toFixed(2)}\n`;
        if (successData.comment) {
            text += `\n*Note:* ${successData.comment}\n`;
        }
        text += `\n*View & Download Invoice:* ${window.location.origin}/public/invoice/${invoiceId}\n`;
        text += `\nThank you for your business!`;

        const encodedText = encodeURIComponent(text);
        let phone = customer.phoneNumber.replace(/\D/g, "");
        if (phone.length === 10) phone = `91${phone}`;

        window.open(`https://wa.me/${phone}?text=${encodedText}`, "_blank");
    };

    const handleSubmit = async () => {
        if (items.length === 0 || items.some((i) => !i.menuEntryId)) {
            alert("Please add at least one valid item.");
            return;
        }

        setLoading(true);
        const invoiceData = {
            customerId,
            items,
            totalAmount,
            comment,
        };

        const res = await createInvoice(invoiceData);
        if (res.success) {
            setInvoiceId(res.invoiceId);
            setSuccessData(invoiceData);
        } else {
            alert(res.error);
        }
        setLoading(false);
    };

    if (successData) {
        return (
            <div className="bg-white p-6 md:p-12 rounded-3xl shadow-xl border border-green-100 text-center space-y-8 max-w-2xl mx-auto animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle size={40} />
                </div>

                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-gray-900">Invoice Ready!</h2>
                    <p className="text-gray-500 font-medium">Send the professional PDF bill directly to your customer.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 text-left">
                    {/* Share Directly (Preferred for Mobile) */}
                    {canShare && (
                        <div className="p-5 rounded-2xl border-2 border-blue-600 bg-blue-50/50 relative overflow-hidden group">
                            <div className="absolute top-2 right-4 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Recommended</div>
                            <div className="flex items-start gap-4">
                                <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">1</span>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-800">Share Directly (One-Click)</h4>
                                    <p className="text-xs text-gray-500 mt-1">This will attach the PDF automatically using your device's native share menu.</p>
                                    <button
                                        onClick={handleDirectShare}
                                        className="mt-4 w-full flex items-center justify-center gap-2 py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 transition-all active:scale-95"
                                    >
                                        <Send size={18} /> Share Directly to WhatsApp
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step-by-Step (Backup/Desktop) */}
                    <div className={`p-5 rounded-2xl border ${!canShare ? 'border-2 border-green-600 bg-green-50/50' : 'border-gray-100 bg-white'} relative`}>
                        {!canShare && <div className="absolute top-2 right-4 bg-green-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Standard Method</div>}
                        <div className="flex items-start gap-4">
                            <span className={`w-8 h-8 rounded-full ${!canShare ? 'bg-green-600' : 'bg-gray-300'} text-white flex items-center justify-center font-bold text-sm`}>
                                {canShare ? '2' : '1'}
                            </span>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-800">Manual Flow (Best for Desktop)</h4>
                                <p className="text-xs text-gray-500 mt-1">WhatsApp links cannot attach local files directly. Please use this two-step process:</p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                    <button
                                        onClick={() => generatePDF(successData)}
                                        className="flex items-center justify-center gap-2 py-4 px-4 bg-white border-2 border-gray-200 hover:border-blue-500 text-gray-700 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-sm"
                                    >
                                        <FileDown size={18} className="text-blue-500" />
                                        1. Download PDF
                                    </button>
                                    <button
                                        onClick={handleWhatsAppSend}
                                        className="flex items-center justify-center gap-2 py-4 px-4 bg-[#25D366] hover:bg-[#22c35e] text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-green-100"
                                    >
                                        <Send size={18} />
                                        2. Open & Attach
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-3 text-center italic">Tip: Click 'WhatsApp' above to open the chat, then attach the downloaded file manually.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        onClick={() => {
                            setSuccessData(null);
                            setIsPreview(false);
                            setItems([]);
                            setCustomerId("");
                            setComment("");
                            setHasDownloaded(false);
                        }}
                        className="text-gray-400 hover:text-blue-600 text-sm font-bold flex items-center justify-center gap-2 mx-auto transition-colors"
                    >
                        <Plus size={16} /> Create Another Invoice
                    </button>
                </div>
            </div>
        );
    }

    if (isPreview) {
        return (
            <div className="space-y-6 bg-white p-4 md:p-8 rounded-lg shadow-sm border border-gray-100 max-w-4xl mx-auto">
                <div className="flex justify-between items-center border-b pb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Eye className="text-blue-500" /> Invoice Preview
                    </h2>
                    <button
                        onClick={() => setIsPreview(false)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
                    >
                        <Edit2 size={16} /> Edit Details
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                    <div className="space-y-1">
                        <h3 className="text-xs font-bold text-gray-400 uppercase">Billing To</h3>
                        <p className="text-lg font-bold text-gray-800">{selectedCustomer?.name || "Walk-in / Guest"}</p>
                        <p className="text-sm text-gray-600">{selectedCustomer?.phoneNumber}</p>
                        <p className="text-sm text-gray-600">{selectedCustomer?.address}</p>
                    </div>
                    <div className="md:text-right space-y-1">
                        <h3 className="text-xs font-bold text-gray-400 uppercase">Invoice Date</h3>
                        <p className="text-gray-800 font-medium">{currentDate}</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-100">
                                <th className="py-3 font-bold text-gray-600">Item Description</th>
                                <th className="py-3 font-bold text-gray-600 text-center">Qty</th>
                                <th className="py-3 font-bold text-gray-600 text-right">Price</th>
                                <th className="py-3 font-bold text-gray-600 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-50">
                                    <td className="py-4 text-gray-800 font-medium">{item.name}</td>
                                    <td className="py-4 text-gray-600 text-center">{item.quantity}</td>
                                    <td className="py-4 text-gray-600 text-right">₹{item.price.toFixed(2)}</td>
                                    <td className="py-4 text-gray-800 font-bold text-right">
                                        ₹{(item.price * item.quantity).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={3} className="py-6 text-right font-bold text-gray-500">Subtotal</td>
                                <td className="py-6 text-right font-bold text-gray-800">₹{totalAmount.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td colSpan={3} className="py-2 text-right text-xl font-bold text-gray-800">Grand Total</td>
                                <td className="py-2 text-right text-2xl font-extrabold text-blue-600">₹{totalAmount.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {comment && (
                    <div className="bg-gray-50 p-4 rounded-md">
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Notes / Comment</h4>
                        <p className="text-sm text-gray-700 italic">"{comment}"</p>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                    <button
                        onClick={() => setIsPreview(false)}
                        className="py-2 px-6 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="py-2 px-8 bg-blue-600 text-white rounded-md text-sm font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? "Saving..." : "Confirm & Save Invoice"}
                    </button>
                </div>
            </div>
        );
    }

    const handleCustomerAdded = (newCustomer: any) => {
        setCustomers(prev => [...prev, newCustomer]);
        setCustomerId(newCustomer._id);
    };

    return (
        <div className="relative">
            <AddCustomerModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSuccess={handleCustomerAdded}
            />

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    setIsPreview(true);
                }}
                className="space-y-10"
            >
                {/* Header Section */}
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

                    <div className="space-y-6">
                        <CustomerSelector
                            customers={customers}
                            selectedId={customerId}
                            onSelect={setCustomerId}
                            onAddNew={() => setIsCustomerModalOpen(true)}
                        />
                    </div>

                    <div className="space-y-6">
                        <div className="relative">
                            <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                                <Calendar size={14} className="text-gray-400" />
                                Invoice Date
                            </label>
                            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 flex items-center justify-between">
                                <span>{currentDate || "Loading..."}</span>
                                <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-tighter">Current</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items Section */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100">
                                <ShoppingBag size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900 tracking-tight">Service Items</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Pricing & Quantity</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleAddItem}
                            className="flex items-center gap-2 py-2.5 px-5 bg-white border border-gray-200 hover:border-blue-500 hover:text-blue-600 text-gray-700 rounded-xl font-black text-xs transition-all shadow-sm active:scale-95"
                        >
                            <Plus size={16} /> Add Item
                        </button>
                    </div>

                    <div className="p-6">
                        {items.length === 0 ? (
                            <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50 space-y-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={handleAddItem}>
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mx-auto">
                                    <Plus className="text-gray-300" size={32} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-400">Your invoice is empty</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Click 'Add Item' to begin billing</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="group relative flex flex-col md:flex-row gap-6 p-6 border border-gray-100 rounded-2xl bg-white hover:border-blue-200 hover:shadow-md hover:shadow-blue-50/50 transition-all animate-in fade-in slide-in-from-left-4 duration-300"
                                    >
                                        <div className="flex-1 space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Select Menu Item</label>
                                            <select
                                                value={item.menuEntryId}
                                                onChange={(e) =>
                                                    handleItemChange(index, "menuEntryId", e.target.value)
                                                }
                                                required
                                                className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-bold text-gray-900 bg-gray-50/50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%20stroke%3D%22currentColor%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat"
                                            >
                                                <option value="">-- Choose from Menu --</option>
                                                {menuItems.map((m) => (
                                                    <option key={m._id} value={m._id}>
                                                        {m.name} (₹{m.price})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="w-full md:w-32 space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Unit Price</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                                                    <input
                                                        type="number"
                                                        value={item.price}
                                                        disabled
                                                        className="block w-full pl-8 pr-4 py-3 bg-gray-100 border border-transparent rounded-xl text-sm text-gray-500 font-black cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>

                                            <div className="w-full md:w-28 space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Quantity</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) =>
                                                        handleItemChange(index, "quantity", parseInt(e.target.value) || 1)
                                                    }
                                                    required
                                                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-black text-gray-900 bg-white"
                                                />
                                            </div>
                                        </div>

                                        <div className="hidden md:flex flex-col justify-center items-end min-w-[100px] border-l border-gray-50 pl-6">
                                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-tighter">Line Total</p>
                                            <p className="text-md font-black text-blue-600 tracking-tight">₹{(item.price * item.quantity).toFixed(2)}</p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(index)}
                                            className="md:self-center p-3 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-gray-50 md:border-transparent"
                                            title="Remove Item"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer and Totals */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Info size={14} className="text-gray-400" />
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Additional Terms or Remarks</h4>
                        </div>
                        <textarea
                            rows={5}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="block w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl shadow-inner focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-gray-800 placeholder:text-gray-300 outline-none"
                            placeholder="Add thank you note, payment details, or special instructions..."
                        ></textarea>
                    </div>

                    <div className="lg:col-span-2 bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col justify-between group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-colors duration-700" />

                        <div className="space-y-6 relative">
                            <div className="flex justify-between items-center text-gray-400">
                                <span className="text-xs font-black uppercase tracking-widest">Net Summary</span>
                                <CreditCard size={18} />
                            </div>

                            <div className="space-y-3 pb-6 border-b border-white/10">
                                <div className="flex justify-between text-gray-400 text-sm font-medium">
                                    <span>Subtotal</span>
                                    <span>₹{totalAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-400 text-sm font-medium">
                                    <span>Discount / Tax</span>
                                    <span className="italic text-[10px] uppercase">Calculated in Summary</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 relative space-y-8">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Grand Total</p>
                                    <p className="text-4xl font-black text-white tracking-tighter">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                                <div className="bg-white/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                                    <span className="text-[10px] font-bold text-white uppercase tracking-tighter">INR (₹)</span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={items.length === 0}
                                className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-900/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale group"
                            >
                                <Eye size={20} className="group-hover:scale-110 transition-transform" />
                                Generate & Preview Bill
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
