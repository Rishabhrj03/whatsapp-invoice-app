"use client";

import { useState, useEffect, useRef } from "react";
import { createInvoice, getUploadUrl, updateInvoicePdfUrl, getLogoBase64 } from "@/app/actions/invoice";
import {
    Plus, Trash2, Send, FileDown, Eye, Edit2,
    CheckCircle, UserPlus, ShoppingBag, CreditCard,
    ChevronRight, Calendar, Info, Tag, Check, Printer, ArrowLeft
} from "lucide-react";
// jspdf and jspdf-autotable removed for dynamic import optimization
import CustomerSelector from "./CustomerSelector";
import MenuSelector from "./MenuSelector";
import AddCustomerModal from "./AddCustomerModal";
import CreateCategoryModal from "./CreateCategoryModal";
import CategorySelector from "./CategorySelector";
import { useRouter } from "next/navigation";

export default function CreateInvoiceForm({
    customers: initialCustomers,
    menuItems,
    categories: initialCategories = [],
    user: initialUser,
    coupons = [],
}: {
    customers: any[];
    menuItems: any[];
    categories?: any[];
    user?: any;
    coupons?: any[];
}) {
    const router = useRouter();
    const [customers, setCustomers] = useState(initialCustomers);
    const [categories, setCategories] = useState(initialCategories);
    const [customerId, setCustomerId] = useState("");
    const [paymentType, setPaymentType] = useState<'Cash' | 'Card' | 'UPI'>('Cash');
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [isCouponDropdownOpen, setIsCouponDropdownOpen] = useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState("");
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [items, setItems] = useState<{ categoryId: string; menuEntryId: string; name: string; price: number; quantity: number }[]>([]);
    const [comment, setComment] = useState("");
    const [loading, setLoading] = useState(false);
    const [successData, setSuccessData] = useState<any>(null);
    const [invoiceId, setInvoiceId] = useState("");
    const [isPreview, setIsPreview] = useState(false);
    const [hasDownloaded, setHasDownloaded] = useState(false);
    const [canShare, setCanShare] = useState(false);
    const [currentDate, setCurrentDate] = useState("");
    const [logoBase64, setLogoBase64] = useState<string>("");

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

    const getDiscountAmount = () => {
        if (!appliedCoupon) return 0;
        if (appliedCoupon.type === 'PERCENTAGE') {
            if (appliedCoupon.applicableTo === 'SPECIFIC_ITEMS') {
                const applicableTotal = items.reduce((sum, item) => {
                    if (appliedCoupon.itemIds.includes(item.menuEntryId)) {
                        return sum + (item.price * item.quantity);
                    }
                    return sum;
                }, 0);
                return (applicableTotal * appliedCoupon.value) / 100;
            }
            return (totalAmount * appliedCoupon.value) / 100;
        } else {
            return appliedCoupon.value; // Fixed
        }
    };

    const discountAmount = getDiscountAmount();
    const grandTotal = Math.max(0, totalAmount - discountAmount);

    const handleApplyCoupon = () => {
        if (!couponCode) return;
        const coupon = coupons.find(c => c.code === couponCode.toUpperCase() && c.isActive);
        if (!coupon) return alert("Invalid or inactive coupon code.");

        setAppliedCoupon(coupon);
    };

    const filteredCoupons = coupons.filter(c =>
        c.code.toLowerCase().includes(couponCode.toLowerCase()) && c.isActive
    );

    const selectedCustomer = customers.find((c) => c._id === customerId);

    const handleAddItem = () => {
        setItems([...items, { categoryId: "", menuEntryId: "", name: "", price: 0, quantity: 1 }]);
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

    const getInvoiceFile = async (data: any): Promise<File> => {
        const { default: jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");

        const doc = new jsPDF();
        const customer = customers.find((c) => c._id === data.customerId);

        // Fetch logo on demand if not already base64 (to avoid blocking mount)
        let currentLogoBase64 = logoBase64;
        if (!currentLogoBase64 && initialUser?.logoUrl) {
            const res = await getLogoBase64(initialUser.logoUrl);
            if (res.success && res.base64) {
                currentLogoBase64 = res.base64;
                setLogoBase64(res.base64);
            }
        }

        // Header / Branding
        let textX = 14;
        if (currentLogoBase64) {
            try {
                const format = initialUser?.logoUrl?.toLowerCase().includes('png') ? 'PNG' : 'JPEG';
                doc.addImage(currentLogoBase64, format, 14, 12, 16, 16);
                textX = 34; // Shift text right
            } catch (e) {
                console.error("Failed adding logo to PDF:", e);
            }
        }

        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.text(initialUser?.businessName || "WA Invoice App", textX, 19);

        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.text("PREMIUM DIGITAL BILLING", textX, 24);

        // Header Divider
        doc.setDrawColor(241, 245, 249); // Slate-100
        doc.setLineWidth(0.5);
        doc.line(14, 32, 196, 32);

        // Customer Info & Date Alignment
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.text("BILLING TO", 14, 42);

        doc.text("INVOICE DATE", 196, 42, { align: "right" });

        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42); // Slate-900
        doc.text(customer?.name || "Customer", 14, 49);

        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(currentDate, 196, 49, { align: "right" });

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(customer?.phoneNumber || "", 14, 55);
        doc.text(customer?.address || "", 14, 61);

        // Table
        const tableData = data.items.map((item: any, index: number) => [
            index + 1,
            item.name,
            `Rs. ${item.price.toFixed(2)}`,
            item.quantity,
            `Rs. ${(item.price * item.quantity).toFixed(2)}`,
        ]);

        autoTable(doc, {
            startY: 72,
            head: [["#", "Description", "Unit Price", "Quantity", "Total"]],
            body: tableData,
            theme: "striped",
            headStyles: { fillColor: [37, 99, 235] }, // Blue-600
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        const subtotal = data.items.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);

        // Totals
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text(`Subtotal: Rs. ${subtotal.toFixed(2)}`, 140, finalY);

        let currentY = finalY;

        if (data.discountAmount && data.discountAmount > 0) {
            currentY += 6;
            doc.setTextColor(220, 38, 38); // Red for discount
            doc.text(`Discount: -Rs. ${data.discountAmount.toFixed(2)}`, 140, currentY);
        }

        currentY += 8;
        doc.setFontSize(13);
        doc.setTextColor(0, 0, 0);
        doc.text(`Total: Rs. ${data.totalAmount.toFixed(2)}`, 140, currentY);

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

    const generatePDF = async (data: any) => {
        const file = await getInvoiceFile(data);
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        setHasDownloaded(true);
    };

    const printPDF = async (data: any) => {
        const file = await getInvoiceFile(data);
        const url = URL.createObjectURL(file);

        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = url;
        document.body.appendChild(iframe);

        iframe.onload = () => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => {
                document.body.removeChild(iframe);
                URL.revokeObjectURL(url);
            }, 2000);
        };
        setHasDownloaded(true);
    };

    const handleDirectShare = async () => {
        if (!successData) return;

        const file = await getInvoiceFile(successData);
        const customer = customers.find((c) => c._id === successData.customerId);

        const invoiceLink = pdfUrl || `${window.location.origin}/public/invoice/${invoiceId}`;
        const shareData = {
            files: [file],
            title: `Invoice for ${customer?.name}`,
            text: `Professional invoice for ${customer?.name} - View online: ${invoiceLink}`,
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

        const businessName = initialUser?.businessName || "WA Invoice";
        const customerName = customer?.name || "Customer";
        const totalAmount = `₹${successData.totalAmount.toFixed(2)}`;
        const invoiceLink = pdfUrl || `${window.location.origin}/public/invoice/${invoiceId}`;

        let itemDetailText = "";
        successData.items.forEach((item: any) => {
            itemDetailText += `- ${item.name} x${item.quantity} = ₹${(item.price * item.quantity).toFixed(2)}\n`;
        });

        let text = "";
        if (initialUser?.whatsappTemplate) {
            text = initialUser.whatsappTemplate
                .replace(/{customer_name}/g, customerName)
                .replace(/{total_amount}/g, totalAmount)
                .replace(/{invoice_url}/g, invoiceLink)
                .replace(/{business_name}/g, businessName)
                .replace(/{item_list}/g, itemDetailText.trim());
        } else {
            text = `*Invoice from ${businessName}*\n`;
            text += `Hello ${customerName},\n\n`;
            text += `*Details:*\n${itemDetailText}`;
            if (successData.comment) {
                text += `\n*Note:* ${successData.comment}\n`;
            }
            text += `\n*Total Amount:* ${totalAmount}\n`;
            text += `\n*View & Download Invoice:* ${invoiceLink}\n`;
            text += `\nThank you for your business!`;
        }

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
            totalAmount: grandTotal,
            discountAmount,
            couponCode: appliedCoupon?.code,
            comment,
            paymentType,
        };

        const res = await createInvoice(invoiceData);
        if (res.success) {
            setInvoiceId(res.invoiceId);
            setSuccessData(invoiceData);

            // Upload PDF to S3
            try {
                const file = await getInvoiceFile(invoiceData);
                const uploadRes = await getUploadUrl(`invoices/${res.invoiceId}.pdf`, "application/pdf");

                if (!uploadRes.success || !uploadRes.url) {
                    return alert(`Presign URL Error: ${uploadRes.error || "Failed to get presigned URL"}`);
                }

                const uploadFetch = await fetch(uploadRes.url, {
                    method: "PUT",
                    body: file,
                    headers: { "Content-Type": "application/pdf" }
                });

                if (!uploadFetch.ok) {
                    return alert(`S3 Upload Failed: ${uploadFetch.statusText || "Fetch error"}. Check Amazon S3 CORS settings.`);
                }

                const publicUrl = `${process.env.NEXT_PUBLIC_S3_PUBLIC_URL || ""}/${uploadRes.objectKey}`;
                await updateInvoicePdfUrl(res.invoiceId, publicUrl);
                setPdfUrl(publicUrl);
                alert("PDF backed up to S3 successfully!");
            } catch (uploadErr: any) {
                console.error("Auto S3 Upload failed:", uploadErr);
                alert(`Upload Exception: ${uploadErr.message || "Network or CORS Error"}`);
            }
        } else {
            alert(res.error);
        }
        setLoading(false);
    };

    if (successData) {
        const customer = customers.find((c) => c._id === successData.customerId);
        const isGuest = !successData.customerId || customer?.name?.toLowerCase() === "guest";

        return (
            <div className="bg-white p-6 md:p-12 rounded-3xl shadow-xl border border-green-100 text-center space-y-8 max-w-2xl mx-auto animate-in fade-in zoom-in duration-300 relative">
                <button
                    onClick={() => {
                        setSuccessData(null);
                        setIsPreview(false);
                        setItems([]);
                        setCustomerId("");
                        setComment("");
                        setHasDownloaded(false);
                    }}
                    className="absolute top-6 left-6 text-gray-400 hover:text-gray-800 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                    <ArrowLeft size={14} /> Go back
                </button>
                <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle size={40} />
                </div>

                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-gray-900">Invoice Ready!</h2>
                    <p className="text-gray-500 font-medium">Send the professional PDF bill directly to your customer.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 text-left">
                    {/* Share Directly (Preferred for Mobile) */}
                    {canShare && !isGuest && (
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

                                <div className="mt-4">
                                    {isGuest ? (
                                        <button
                                            onClick={() => printPDF(successData)}
                                            className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 transition-all active:scale-95"
                                        >
                                            <Printer size={18} /> Print Invoice
                                        </button>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                    )}
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
                        className="text-blue-600 hover:text-blue-700 text-sm font-bold flex items-center justify-center gap-2 mx-auto transition-colors"
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

                {/* Invoice Header Branding */}
                <div className="flex justify-between items-start py-6 border-b border-gray-50">
                    <div className="flex items-center gap-4">
                        {initialUser?.logoUrl ? (
                            <img
                                src={initialUser.logoUrl}
                                alt="Business Logo"
                                className="w-16 h-16 object-contain rounded-xl bg-gray-50 p-2 shadow-sm border border-gray-100"
                            />
                        ) : (
                            <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-black text-xl border border-blue-100 shadow-sm">
                                {initialUser?.businessName?.[0] || "W"}
                            </div>
                        )}
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">{initialUser?.businessName || "WA Invoice App"}</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Premium Digital Billing</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                    <div className="space-y-1">
                        <h3 className="text-xs font-bold text-gray-400 uppercase">Billing To</h3>
                        <p className="text-lg font-bold text-gray-800">{selectedCustomer?.name || "Guest"}</p>
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

            <CreateCategoryModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                onSuccess={(newCat: any) => {
                    setCategories(prev => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
                }}
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
                        <div className="flex items-end gap-3">
                            <div className="flex-1">
                                <CustomerSelector
                                    customers={customers}
                                    selectedId={customerId}
                                    onSelect={setCustomerId}
                                    onAddNew={() => setIsCustomerModalOpen(true)}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCustomerModalOpen(true)}
                                className="h-[46px] px-4 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-100 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"
                                title="Add New Customer"
                            >
                                <UserPlus size={18} />
                                <span className="hidden sm:inline text-sm">New</span>
                            </button>
                        </div>
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

                        <div className="relative">
                            <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                                <CreditCard size={14} className="text-gray-400" />
                                Payment Mode
                            </label>
                            <select
                                value={paymentType}
                                onChange={(e) => setPaymentType(e.target.value as any)}
                                className="block w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-900 shadow-sm outline-none"
                            >
                                <option value="Cash">Cash</option>
                                <option value="Card">Card</option>
                                <option value="UPI">UPI</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Items Section */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100">
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
                                        style={{ zIndex: items.length - index }}
                                    >
                                        <div className="flex-1 space-y-1.5 min-w-[150px]">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Category</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsCategoryModalOpen(true)}
                                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md transition-colors"
                                                >
                                                    <Plus size={10} /> New
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <CategorySelector
                                                    categories={categories}
                                                    selectedId={item.categoryId || ""}
                                                    onSelect={(name) => {
                                                        const newItems = [...items];
                                                        newItems[index] = { ...newItems[index], categoryId: name, menuEntryId: "", name: "", price: 0 };
                                                        setItems(newItems);
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-1.5 min-w-[200px]">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Select Menu Item</label>
                                            <MenuSelector
                                                menuItems={item.categoryId ? menuItems.filter(m => m.category?.toLowerCase().trim() === item.categoryId.toLowerCase().trim()) : menuItems}
                                                selectedId={item.menuEntryId}
                                                onSelect={(id: string, name: string, price: number) => {
                                                    const newItems = [...items];
                                                    newItems[index] = {
                                                        ...newItems[index],
                                                        menuEntryId: id,
                                                        name: name,
                                                        price: price,
                                                    };
                                                    setItems(newItems);
                                                }}
                                            />
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="w-full md:w-32 space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Unit Price</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                                                    <input
                                                        type="number"
                                                        value={item.price}
                                                        onChange={(e) =>
                                                            handleItemChange(index, "price", parseFloat(e.target.value) || 0)
                                                        }
                                                        className="block w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-black text-gray-900 bg-white"
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

                        <div className="border-t pt-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <Tag size={14} className="text-gray-400" />
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Apply Discount Coupon</h4>
                            </div>
                            <div className="flex gap-2 relative">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        placeholder="Search or Enter Code..."
                                        value={couponCode}
                                        onChange={(e) => {
                                            setCouponCode(e.target.value);
                                            setIsCouponDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsCouponDropdownOpen(true)}
                                        onBlur={() => setTimeout(() => setIsCouponDropdownOpen(false), 200)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold uppercase placeholder:text-gray-300 outline-none focus:ring-2 focus:ring-blue-100 text-gray-900"
                                    />
                                    {isCouponDropdownOpen && (
                                        <div className="absolute z-50 bottom-full mb-2 left-0 right-0 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-40 overflow-y-auto divide-y divide-gray-50 animate-in slide-in-from-bottom-2 duration-200">
                                            {filteredCoupons.length > 0 ? (
                                                filteredCoupons.map(c => (
                                                    <button
                                                        key={c._id}
                                                        type="button"
                                                        onClick={() => {
                                                            setCouponCode(c.code);
                                                            setAppliedCoupon(c);
                                                            setIsCouponDropdownOpen(false);
                                                        }}
                                                        className="w-full text-left p-3 hover:bg-gray-50 flex items-center justify-between text-sm font-bold"
                                                    >
                                                        <div>
                                                            <span className="text-blue-600 font-extrabold">{c.code}</span>
                                                            <span className="text-gray-400 text-xs ml-2">({c.type === 'PERCENTAGE' ? `${c.value}%` : `₹${c.value}`})</span>
                                                        </div>
                                                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-black">
                                                            {c.applicableTo === 'ALL' ? 'ALL ITEMS' : 'SPECIFIC'}
                                                        </span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-4 text-center text-xs font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
                                                    No coupons found
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleApplyCoupon}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all"
                                >
                                    Apply
                                </button>
                            </div>
                            {appliedCoupon && (
                                <p className="text-xs text-green-600 font-bold flex items-center gap-1">
                                    <Check size={14} className="text-green-600" /> Coupon {appliedCoupon.code} Applied! Saved {appliedCoupon.type === 'PERCENTAGE' ? `${appliedCoupon.value}%` : `₹${appliedCoupon.value}`}
                                </p>
                            )}
                        </div>
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
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-emerald-400 text-sm font-black">
                                        <span>Discount ({appliedCoupon?.code})</span>
                                        <span>- ₹{discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 relative space-y-8">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Grand Total</p>
                                    <p className="text-4xl font-black text-white tracking-tighter">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
