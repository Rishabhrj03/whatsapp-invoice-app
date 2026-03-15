"use client";

import { Download, FileText, ShoppingBag, Users } from "lucide-react";
import Papa from "papaparse";

interface ExportClientProps {
    customers: any[];
    menuItems: any[];
    invoices: any[];
}

export default function ExportClient({ customers, menuItems, invoices }: ExportClientProps) {

    const downloadCSV = (data: any[], filename: string) => {
        if (data.length === 0) {
            alert("No data to export");
            return;
        }
        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${filename}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportCustomers = () => {
        const data = customers.map(c => ({
            Name: c.name,
            Phone: c.phoneNumber,
            Address: c.address || "",
            Birthday: c.birthdayDate || "",
            Anniversary: c.anniversaryDate || "",
            Created: new Date(c.createdAt).toLocaleDateString()
        }));
        downloadCSV(data, "Customers");
    };

    const exportMenu = () => {
        const data = menuItems.map(m => ({
            Name: m.name,
            Category: m.category,
            Price: m.price,
            Description: m.description || ""
        }));
        downloadCSV(data, "Menu_Items");
    };

    const exportInvoices = () => {
        const data = invoices.map(inv => ({
            Invoice_ID: inv._id,
            Date: new Date(inv.date).toLocaleDateString(),
            Customer: inv.customer?.name || "Guest",
            Customer_Phone: inv.customer?.phoneNumber || "",
            Total_Items: inv.items.length,
            Payment_Type: inv.paymentType || "Cash",
            Total_Amount: inv.totalAmount,
            Status: inv.status
        }));
        downloadCSV(data, "Invoices_Transactions");
    };

    const cards = [
        {
            title: "Customers List",
            description: "Download all save customer names, numbers, and profiles.",
            count: customers.length,
            icon: Users,
            color: "bg-blue-50 text-blue-600",
            onClick: exportCustomers
        },
        {
            title: "Menu Items & Catalog",
            description: "Export current pricing, availability and item descriptions.",
            count: menuItems.length,
            icon: ShoppingBag,
            color: "bg-purple-50 text-purple-600",
            onClick: exportMenu
        },
        {
            title: "Transactions History",
            description: "Comprehensive view of your past invoices, quantities and sums.",
            count: invoices.length,
            icon: FileText,
            color: "bg-green-50 text-green-600",
            onClick: exportInvoices
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card, i) => {
                const Icon = card.icon;
                return (
                    <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className={`p-3 rounded-2xl ${card.color}`}>
                                    <Icon size={24} />
                                </div>
                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{card.count} Entries</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900 tracking-tight">{card.title}</h3>
                                <p className="text-xs text-gray-500 mt-1">{card.description}</p>
                            </div>
                        </div>

                        <button
                            onClick={card.onClick}
                            className="mt-6 w-full py-4 bg-gray-50 group-hover:bg-blue-600 text-gray-700 group-hover:text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 border border-gray-100 group-hover:border-transparent"
                        >
                            <Download size={18} />
                            Export to CSV
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
