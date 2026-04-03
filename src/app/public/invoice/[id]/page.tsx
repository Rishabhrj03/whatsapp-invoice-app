import dbConnect from "@/lib/mongoose";
import Invoice from "@/models/Invoice";
import Customer from "@/models/Customer";
import User from "@/models/User";
import { notFound } from "next/navigation";
import { Eye, FileDown, ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import PublicInvoiceClient from "./PublicInvoiceClient";
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    await dbConnect();
    const invoice = await Invoice.findById(params.id).populate("customer").lean();

    if (!invoice) return { title: 'Invoice Not Found' };

    const customer = (invoice.customer as any);
    const user = await User.findById(invoice.userId).lean();

    return {
        title: `Invoice for ${customer?.name || 'Customer'}`,
        description: `View and download your professional digital bill for ₹${invoice.totalAmount.toLocaleString('en-IN')}.`,
        openGraph: {
            title: `Digital Invoice - ${customer?.name}`,
            description: `Total: ₹${invoice.totalAmount.toLocaleString('en-IN')} | Professional Bill from ${(user as any)?.businessName || 'WA Invoice App'}`,
            type: 'website',
            images: ["/icons/icon-512x512.png"],
        }
    };
}

export default async function PublicInvoicePage({ params }: { params: { id: string } }) {
    await dbConnect();

    // Fetch invoice and populate customer
    const invoice = await Invoice.findById(params.id).populate("customer").lean();

    if (!invoice) {
        notFound();
    }

    const user = await User.findById((invoice as any).userId).lean();

    // Serialize for Client Component
    const serializedInvoice = JSON.parse(JSON.stringify(invoice));

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <Eye size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 leading-tight">Public Invoice View</h1>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Professional Digital Bill</p>
                        </div>
                    </div>
                </div>

                <PublicInvoiceClient
                    invoice={serializedInvoice}
                    user={user ? JSON.parse(JSON.stringify(user)) : null}
                />

                <div className="mt-8 text-center">
                    <p className="text-gray-400 text-sm font-medium">
                        Powered by <span className="text-blue-600 font-bold tracking-tight">WA Invoice App</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
