import dbConnect from "@/lib/mongoose";
import Invoice from "@/models/Invoice";
import TransactionsClient from "@/components/TransactionsClient";
import { auth } from "@/auth";
import { getEffectiveUserId } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
    await dbConnect();
    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) return null;

    const invoices = await Invoice.find({ userId: effectiveUserId })
        .populate("customer")
        .sort({ createdAt: -1 })
        .lean();

    const serializedInvoices = invoices.map((inv: any) => ({
        ...inv,
        _id: inv._id.toString(),
        customer: inv.customer ? {
            ...inv.customer,
            _id: inv.customer._id.toString()
        } : null,
        date: inv.date.toISOString(),
        createdAt: inv.createdAt.toISOString(),
    }));

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    Transactions
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                    Manage and search all your generated invoices.
                </p>
            </div>
            <TransactionsClient initialInvoices={serializedInvoices} />
        </div>
    );
}
