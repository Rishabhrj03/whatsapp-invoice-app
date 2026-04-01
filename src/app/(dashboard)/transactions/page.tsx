import dbConnect from "@/lib/mongoose";
import Invoice from "@/models/Invoice";
import TransactionsClient from "@/components/TransactionsClient";
import Customer from "@/models/Customer";
import { auth } from "@/auth";
import { getEffectiveUserId } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({ searchParams }: { searchParams: { page?: string, search?: string } }) {
    await dbConnect();
    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) return null;

    const page = parseInt(searchParams.page || "1", 10);
    const limit = 10;
    const search = searchParams.search || "";

    const query: any = { userId: effectiveUserId };

    if (search) {
        const matchingCustomers = await Customer.find({
            userId: effectiveUserId,
            name: { $regex: search, $options: "i" }
        }).select("_id").lean();
        const customerIds = matchingCustomers.map(c => c._id);

        if ("guest".includes(search.toLowerCase())) {
            query.$or = [
                { customer: { $in: customerIds } },
                { customer: { $exists: false } },
                { customer: null }
            ];
        } else {
            query.customer = { $in: customerIds };
        }
    }

    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
        Invoice.find(query)
            .populate("customer")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Invoice.countDocuments(query)
    ]);

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
            <TransactionsClient
                initialInvoices={serializedInvoices}
                currentPage={page}
                totalPages={Math.ceil(total / limit) || 1}
                initialSearch={search}
            />
        </div>
    );
}
