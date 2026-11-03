import dbConnect from "@/lib/mongoose";
import Invoice from "@/models/Invoice";
import TransactionsClient from "@/components/TransactionsClient";
import { auth } from "@/auth";
import { getEffectiveUserId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { buildTransactionFilterQuery } from "@/lib/transaction-query";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({ 
    searchParams 
}: { 
    searchParams: Promise<{ 
        page?: string; 
        search?: string;
        datePreset?: string;
        startDate?: string;
        endDate?: string;
    }> 
}) {
    await dbConnect();
    const session = await auth();
    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) {
        redirect("/login");
    }

    const resolvedSearchParams = await searchParams;
    const userRole = (session?.user as any)?.role ?? 'STAFF';

    const page = parseInt(resolvedSearchParams.page || "1", 10);
    const limit = 10;
    const search = (resolvedSearchParams.search || "").trim();
    const startDateParam = resolvedSearchParams.startDate || "";
    const endDateParam = resolvedSearchParams.endDate || "";
    const datePreset = resolvedSearchParams.datePreset || (startDateParam || endDateParam ? "custom" : "all");

    // Standardized filter query
    const query = await buildTransactionFilterQuery({
        effectiveUserId,
        search,
        datePreset,
        startDate: startDateParam,
        endDate: endDateParam,
    });

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

    const serializedInvoices = JSON.parse(JSON.stringify(invoices));

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
                totalCount={total}
                initialSearch={search}
                initialStartDate={startDateParam}
                initialEndDate={endDateParam}
                initialPreset={datePreset}
                userRole={userRole}
            />
        </div>
    );
}
