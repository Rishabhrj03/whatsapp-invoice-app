import dbConnect from "@/lib/mongoose";
import Customer from "@/models/Customer";
import Invoice from "@/models/Invoice";
import MenuEntry from "@/models/MenuEntry";
import { auth } from "@/auth";
import {
    Users,
    FileText,
    Menu,
    IndianRupee,
    Download,
    TrendingUp,
    Plus,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    await dbConnect();
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return null;

    const [customerCount, invoiceCount, menuCount, invoices] = await Promise.all([
        Customer.countDocuments({ userId }),
        Invoice.countDocuments({ userId }),
        MenuEntry.countDocuments({ userId }),
        Invoice.find({ userId }).sort({ date: -1 }).limit(10), // Get last 10
    ]);

    const allInvoices = await Invoice.find({ userId });
    const totalAmount = allInvoices.reduce((acc, curr) => acc + curr.totalAmount, 0);

    const stats = [
        {
            label: "Total Customers",
            value: customerCount,
            icon: Users,
            color: "blue",
            bg: "bg-blue-50",
            text: "text-blue-600",
        },
        {
            label: "Total Invoices",
            value: invoiceCount,
            icon: FileText,
            color: "purple",
            bg: "bg-purple-50",
            text: "text-purple-600",
        },
        {
            label: "Menu Items",
            value: menuCount,
            icon: Menu,
            color: "orange",
            bg: "bg-orange-50",
            text: "text-orange-600",
        },
        {
            label: "Total Revenue",
            value: `₹${totalAmount.toLocaleString()}`,
            icon: IndianRupee,
            color: "green",
            bg: "bg-green-50",
            text: "text-green-600",
        },
    ];

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Welcome back! Here's what's happening today.
                    </p>
                </div>
                <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-2xl flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-xs font-bold text-blue-700">Viewing your personal data</span>
                </div>
                <div className="flex items-center gap-3">
                    <a
                        href="/api/export-csv"
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-xl shadow-sm transition-all"
                    >
                        <Download size={18} />
                        Export Data
                    </a>
                    <Link
                        href="/invoice/create"
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95"
                    >
                        <Plus size={18} />
                        New Invoice
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={idx}
                            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5 hover:shadow-md transition-shadow"
                        >
                            <div className={`p-4 ${stat.bg} ${stat.text} rounded-2xl`}>
                                <Icon size={28} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    {stat.label}
                                </p>
                                <p className="text-2xl font-black text-gray-900">
                                    {stat.value}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                            <TrendingUp className="text-blue-500" size={20} />
                            Recent Activity
                        </h2>
                        <Link href="/dashboard" className="text-sm font-bold text-blue-600 hover:underline">
                            View All
                        </Link>
                    </div>
                    {invoices.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {invoices.map((inv: any) => (
                                        <tr key={inv._id.toString()} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-gray-800">
                                                    {new Date(inv.date).toLocaleDateString(undefined, {
                                                        day: 'numeric',
                                                        month: 'short',
                                                    })}
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-medium uppercase">
                                                    {new Date(inv.date).toLocaleTimeString(undefined, {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium">
                                                <span
                                                    className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${inv.status === "Paid"
                                                        ? "bg-green-100 text-green-700"
                                                        : inv.status === "Sent"
                                                            ? "bg-blue-100 text-blue-700"
                                                            : "bg-gray-100 text-gray-600"
                                                        }`}
                                                >
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-sm font-black text-gray-900">
                                                    ₹{inv.totalAmount.toFixed(2)}
                                                </p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center space-y-2">
                            <FileText className="mx-auto text-gray-200" size={48} />
                            <p className="text-sm text-gray-500 font-medium">No activity yet.</p>
                        </div>
                    )}
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-xl p-8 text-white flex flex-col justify-between h-fit lg:h-full min-h-[300px]">
                    <div className="space-y-4">
                        <div className="bg-white/20 w-fit p-3 rounded-2xl backdrop-blur-md">
                            <IndianRupee size={24} />
                        </div>
                        <h3 className="text-xl font-bold">Quick Invoice</h3>
                        <p className="text-blue-100 text-sm leading-relaxed">
                            Need to send a bill quickly? Start a new transaction now and send it via WhatsApp in seconds.
                        </p>
                    </div>

                    <Link
                        href="/invoice/create"
                        className="mt-8 bg-white text-blue-600 text-center py-4 rounded-2xl font-black shadow-lg hover:bg-gray-50 transition-colors active:scale-95"
                    >
                        Get Started Now
                    </Link>
                </div>
            </div>
        </div >
    );
}
