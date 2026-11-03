import mongoose from "mongoose";
import Customer from "@/models/Customer";
import { escapeRegex } from "@/lib/security";

export interface TransactionFilterParams {
    effectiveUserId: string;
    search?: string;
    datePreset?: string;
    startDate?: string;
    endDate?: string;
}

/**
 * Builds a standardized MongoDB query for transactions based on search and date filter parameters.
 * Shared between TransactionsPage and ExportCsvRoute for 100% filter parity.
 */
export async function buildTransactionFilterQuery(params: TransactionFilterParams) {
    const { effectiveUserId, search = "", datePreset, startDate, endDate } = params;

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

    const effectivePreset = datePreset || (startDate || endDate ? "custom" : "all");

    if (effectivePreset === 'today') {
        const ist = getIstParts(now);
        dateStart = new Date(`${ist.year}-${ist.month}-${ist.day}T00:00:00.000+05:30`);
        dateEnd = new Date(`${ist.year}-${ist.month}-${ist.day}T23:59:59.999+05:30`);
    } else if (effectivePreset === 'yesterday') {
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const ist = getIstParts(yesterday);
        dateStart = new Date(`${ist.year}-${ist.month}-${ist.day}T00:00:00.000+05:30`);
        dateEnd = new Date(`${ist.year}-${ist.month}-${ist.day}T23:59:59.999+05:30`);
    } else if (effectivePreset === 'week') {
        const weekAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        const istStart = getIstParts(weekAgo);
        const istEnd = getIstParts(now);
        dateStart = new Date(`${istStart.year}-${istStart.month}-${istStart.day}T00:00:00.000+05:30`);
        dateEnd = new Date(`${istEnd.year}-${istEnd.month}-${istEnd.day}T23:59:59.999+05:30`);
    } else if (effectivePreset === 'month') {
        const istNow = getIstParts(now);
        dateStart = new Date(`${istNow.year}-${istNow.month}-01T00:00:00.000+05:30`);
        dateEnd = new Date(`${istNow.year}-${istNow.month}-${istNow.day}T23:59:59.999+05:30`);
    } else if (startDate || endDate) {
        if (startDate) {
            dateStart = new Date(`${startDate}T00:00:00.000+05:30`);
        }
        if (endDate) {
            dateEnd = new Date(`${endDate}T23:59:59.999+05:30`);
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
    const trimmedSearch = search.trim();
    if (trimmedSearch) {
        const safeSearch = escapeRegex(trimmedSearch);
        const cleanDigits = trimmedSearch.replace(/\D/g, "");

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

        const customerIds = matchingCustomers.map((c: any) => c._id);
        const searchOrConditions: any[] = [];

        if (customerIds.length > 0) {
            searchOrConditions.push({ customer: { $in: customerIds } });
        }

        if ("guest".includes(trimmedSearch.toLowerCase())) {
            searchOrConditions.push({ customer: { $exists: false } });
            searchOrConditions.push({ customer: null });
        }

        if (mongoose.Types.ObjectId.isValid(trimmedSearch)) {
            searchOrConditions.push({ _id: new mongoose.Types.ObjectId(trimmedSearch) });
        }

        if (['cash', 'card', 'upi'].includes(trimmedSearch.toLowerCase())) {
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

    return query;
}
