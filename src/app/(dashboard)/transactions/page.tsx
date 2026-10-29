import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import Invoice from "@/models/Invoice";
import TransactionsClient from "@/components/TransactionsClient";
import Customer from "@/models/Customer";
import { auth } from "@/auth";
import { getEffectiveUserId } from "@/lib/auth-utils";
import { escapeRegex } from "@/lib/security";
import { redirect } from "next/navigation";

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

    // Base query: strict tenant isolation
    const query: any = { userId: effectiveUserId };
    const andConditions: any[] = [];

    // 1. DATE FILTER LOGIC
    let dateStart: Date | null = null;
    let dateEnd: Date | null = null;

    const now = new Date();
    // Helper to get local date parts in Indian Standard Time (Asia/Kolkata)
    const getIstParts = (d: Date) => {
        const parts = new Intl.DateTimeFormat('en-CA', { 
            timeZone: 'Asia/Kolkata', 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        }).format(d).split('-');
        return { year: parts[0], month: parts[1], day: parts[2] };
    };

    if (datePreset === 'today') {
        const ist = getIstParts(now);
        dateStart = new Date(`${ist.year}-${ist.month}-${ist.day}T00:00:00.000+05:30`);
        dateEnd = new Date(`${ist.year}-${ist.month}-${ist.day}T23:59:59.999+05:30`);
    } else if (datePreset === 'yesterday') {
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const ist = getIstParts(yesterday);
        dateStart = new Date(`${ist.year}-${ist.month}-${ist.day}T00:00:00.000+05:30`);
        dateEnd = new Date(`${ist.year}-${ist.month}-${ist.day}T23:59:59.999+05:30`);
    } else if (datePreset === 'week') {
        const weekAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        const istStart = getIstParts(weekAgo);
        const istEnd = getIstParts(now);
        dateStart = new Date(`${istStart.year}-${istStart.month}-${istStart.day}T00:00:00.000+05:30`);
        dateEnd = new Date(`${istEnd.year}-${istEnd.month}-${istEnd.day}T23:59:59.999+05:30`);
    } else if (datePreset === 'month') {
        const istNow = getIstParts(now);
        dateStart = new Date(`${istNow.year}-${istNow.month}-01T00:00:00.000+05:30`);
        dateEnd = new Date(`${istNow.year}-${istNow.month}-${istNow.day}T23:59:59.999+05:30`);
    } else if (startDateParam || endDateParam) {
        if (startDateParam) {
            dateStart = new Date(`${startDateParam}T00:00:00.000+05:30`);
        }
        if (endDateParam) {
            dateEnd = new Date(`${endDateParam}T23:59:59.999+05:30`);
        }
    }

    if (dateStart || dateEnd) {
        const dateRange: any = {};
        if (dateStart) dateRange.$gte = dateStart;
        if (dateEnd) dateRange.$lte = dateEnd;

        andConditions.push({
            $or: [
                { date: dateRange },
                { createdAt: dateRange }
            ]
        });
    }

    // 2. SEARCH FILTER LOGIC (Customer Name, Phone, Guest, Bill ID, Payment Mode)
    if (search) {
        const safeSearch = escapeRegex(search);
        const cleanDigits = search.replace(/\D/g, "");

        // Build customer query matching Name or Phone (substring match, case-insensitive)
        const customerOr: any[] = [
            { name: { $regex: safeSearch, $options: "i" } },
            { phoneNumber: { $regex: safeSearch, $options: "i" } }
        ];

        if (cleanDigits && cleanDigits.length >= 3) {
            customerOr.push({ phoneNumber: { $regex: escapeRegex(cleanDigits), $options: "i" } });
            if (cleanDigits.length === 10) {
                customerOr.push({ phoneNumber: { $regex: `91${cleanDigits}`, $options: "i" } });
            } else if (cleanDigits.length === 12 && cleanDigits.startsWith("91")) {
                customerOr.push({ phoneNumber: { $regex: cleanDigits.slice(2), $options: "i" } });
            }
        }

        const matchingCustomers = await Customer.find({
            userId: effectiveUserId,
            $or: customerOr
        }).select("_id").lean();

        const customerIds = matchingCustomers.map(c => c._id);
        const searchOrConditions: any[] = [];

        if (customerIds.length > 0) {
            searchOrConditions.push({ customer: { $in: customerIds } });
        }

        if ("guest".includes(search.toLowerCase())) {
            searchOrConditions.push({ customer: { $exists: false } });
            searchOrConditions.push({ customer: null });
        }

        if (mongoose.Types.ObjectId.isValid(search)) {
            searchOrConditions.push({ _id: new mongoose.Types.ObjectId(search) });
        }

        if (['cash', 'card', 'upi'].includes(search.toLowerCase())) {
            searchOrConditions.push({ paymentType: { $regex: `^${safeSearch}$`, $options: "i" } });
        }

        if (searchOrConditions.length > 0) {
            andConditions.push({ $or: searchOrConditions });
        } else {
            // No matching customer, guest, or ID found -> 0 results
            andConditions.push({ customer: { $in: [] } });
        }
    }

    if (andConditions.length > 0) {
        query.$and = andConditions;
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
