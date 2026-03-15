"use client";

import { Eye, FileDown, Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { useState, useEffect } from "react";

export default function PublicInvoiceClient({ invoice, user }: { invoice: any; user?: any }) {
    const [logoBase64, setLogoBase64] = useState<string>("");

    useEffect(() => {
        if (user?.logoUrl) {
            fetch(user.logoUrl)
                .then(r => r.blob())
                .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => setLogoBase64(reader.result as string);
                    reader.readAsDataURL(blob);
                })
                .catch(e => console.error("Logo fetch err", e));
        }
    }, [user?.logoUrl]);
    const generatePDF = () => {
        const doc = new jsPDF();
        const customer = invoice.customer;

        // Header
        doc.setFontSize(24);
        doc.setTextColor(37, 99, 235); // Blue-600
        doc.text("INVOICE", 105, 20, { align: "center" });

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Invoice ID: ${invoice._id}`, 105, 30, { align: "center" });
        doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, 105, 35, { align: "center" });

        // Business Info
        if (logoBase64) {
            try {
                const format = user?.logoUrl?.toLowerCase().includes('png') ? 'PNG' : 'JPEG';
                doc.addImage(logoBase64, format, 160, 10, 30, 30);
            } catch (e) {
                console.error("Failed to add logo to PDF:", e);
            }
        }

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(user?.businessName || "WA Invoice App", 14, 50);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("Premium Digital Billing", 14, 55);

        // Customer Info
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Bill To:", 14, 75);
        doc.setFontSize(11);
        doc.text(customer?.name || "Customer", 14, 82);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(customer?.phoneNumber || "", 14, 88);
        doc.text(customer?.address || "", 14, 94);

        // Table
        const tableData = invoice.items.map((item: any, index: number) => [
            index + 1,
            item.name,
            `₹${item.price.toFixed(2)}`,
            item.quantity,
            `₹${(item.price * item.quantity).toFixed(2)}`,
        ]);

        autoTable(doc, {
            startY: 105,
            head: [["#", "Description", "Unit Price", "Quantity", "Total"]],
            body: tableData,
            theme: "grid",
            headStyles: { fillColor: [37, 99, 235] },
            styles: { fontSize: 9 },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 15;

        // Totals
        const rupeeSymbol = "Rs. "; // Fix glyph
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Subtotal:`, 140, finalY);
        doc.text(`${rupeeSymbol}${invoice.totalAmount.toFixed(2)}`, 180, finalY, { align: "right" });

        doc.setFontSize(16);
        doc.setTextColor(37, 99, 235);
        doc.text(`Grand Total:`, 140, finalY + 10);
        doc.text(`${rupeeSymbol}${invoice.totalAmount.toFixed(2)}`, 180, finalY + 10, { align: "right" });

        // Notes
        if (invoice.comment) {
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text("Notes:", 14, finalY);
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(invoice.comment, 14, finalY + 7);
        }

        doc.save(`Invoice_${customer?.name.replace(/\s+/g, "_")}.pdf`);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 md:p-12 rounded-[40px] shadow-2xl border border-gray-100 relative overflow-hidden">
                {/* Accent Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-[100px] pointer-events-none"></div>

                {/* HTML Header Branding */}
                <div className="flex items-center gap-4 border-b border-gray-100 pb-8 mb-8">
                    {user?.logoUrl ? (
                        <img
                            src={user.logoUrl}
                            alt="Logo"
                            className="w-16 h-16 object-contain rounded-2xl bg-gray-50 border p-2"
                        />
                    ) : (
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl border">
                            {user?.businessName?.[0] || "W"}
                        </div>
                    )}
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">{user?.businessName || "WA Invoice App"}</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Premium Digital Billing</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between gap-8 py-4 border-b border-gray-100 pb-10">
                    <div className="space-y-2">
                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Billing For</div>
                        <h3 className="text-3xl font-black text-gray-900 leading-none">{invoice.customer?.name}</h3>
                        <div className="flex flex-col text-sm text-gray-500 font-medium">
                            <span>{invoice.customer?.phoneNumber}</span>
                            <span>{invoice.customer?.address}</span>
                        </div>
                    </div>
                    <div className="md:text-right space-y-2">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date Issued</div>
                        <p className="text-xl font-black text-gray-800 tracking-tight">{new Date(invoice.date).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black rounded-full uppercase tracking-tighter">
                            Status: Paid
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto py-8">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-200">
                                <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                                <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty</th>
                                <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Price</th>
                                <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {invoice.items.map((item: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="py-5 font-bold text-gray-800">{item.name}</td>
                                    <td className="py-5 text-gray-500 text-center font-bold">{item.quantity}</td>
                                    <td className="py-5 text-gray-500 text-right font-medium">₹{item.price.toLocaleString("en-IN")}</td>
                                    <td className="py-5 font-black text-gray-900 text-right text-lg">
                                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={3} className="py-8 text-right font-bold text-gray-400 uppercase tracking-widest text-[10px]">Grand Total</td>
                                <td className="py-8 text-right text-4xl font-black text-blue-600 tracking-tighter">₹{invoice.totalAmount.toLocaleString("en-IN")}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {invoice.comment && (
                    <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Message from Merchant</div>
                        <p className="text-gray-600 font-medium italic leading-relaxed">"{invoice.comment}"</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                    onClick={generatePDF}
                    className="flex items-center justify-center gap-3 py-5 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-black shadow-xl shadow-blue-100 transition-all active:scale-95"
                >
                    <FileDown size={24} />
                    Download PDF Invoice
                </button>
                <button
                    onClick={() => window.print()}
                    className="flex items-center justify-center gap-3 py-5 px-8 bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-100 rounded-3xl font-black transition-all active:scale-95"
                >
                    <Printer size={24} />
                    Print Receipt
                </button>
            </div>
        </div>
    );
}
