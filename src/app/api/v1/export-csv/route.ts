/**
 * GET /api/v1/export-csv
 * ──────────────────────
 * Versioned CSV export endpoint. Canonical v1 implementation.
 * The original /api/export-csv re-exports from here for backwards compatibility.
 *
 * @version 1.0.0
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getEffectiveUserId } from "@/lib/auth-utils";
import dbConnect from "@/lib/mongoose";
import Invoice from "@/models/Invoice";
import Papa from "papaparse";
import { buildTransactionFilterQuery } from "@/lib/transaction-query";

export const dynamic = "force-dynamic";

const API_VERSION = "v1";

export async function GET(request: Request) {
    try {
        // Require authentication — CSV export must be tenant-scoped
        const session = await auth();
        const effectiveUserId = await getEffectiveUserId();
        if (!session?.user?.id || !effectiveUserId) {
            return buildResponse(
                NextResponse.json({ error: "Unauthorized" }, { status: 401 })
            );
        }

        const { searchParams } = new URL(request.url);
        const search = (searchParams.get("search") || "").trim();
        const datePreset = searchParams.get("datePreset") || undefined;
        const startDate = searchParams.get("startDate") || undefined;
        const endDate = searchParams.get("endDate") || undefined;

        await dbConnect();

        // Scope query to authenticated business owner's tenant with applied filters
        const query = await buildTransactionFilterQuery({
            effectiveUserId,
            search,
            datePreset,
            startDate,
            endDate,
        });

        const invoices = await Invoice.find(query)
            .populate("customer")
            .sort({ createdAt: -1 })
            .lean();

        const csvData = invoices.map((inv: any) => {
            const cust = inv.customer as any;
            const itemsString = (inv.items || [])
                .map((item: any) => `${item.name}${item.description ? ` [${item.description}]` : ''} (x${item.quantity})`)
                .join(", ");

            const recordDate = inv.date || inv.createdAt;

            return {
                "Invoice ID": inv._id.toString().slice(-6).toUpperCase(),
                "Full ID": inv._id.toString(),
                Date: recordDate ? new Date(recordDate).toLocaleDateString("en-IN") : "",
                Time: recordDate ? new Date(recordDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "",
                "Customer Name": cust ? cust.name : "Guest",
                "Phone Number": cust ? cust.phoneNumber : "",
                "Items Ordered": itemsString,
                "Total Amount (₹)": inv.totalAmount,
                "Discount (₹)": inv.discountAmount || 0,
                "Payment Type": inv.paymentType || "Cash",
                Comment: inv.comment || "",
            };
        });

        const csvString = Papa.unparse(csvData);

        // Generate descriptive filename based on active filters
        let filterSuffix = "";
        if (datePreset && datePreset !== "all") {
            filterSuffix += `_${datePreset}`;
        } else if (startDate || endDate) {
            filterSuffix += `_${startDate || "start"}_to_${endDate || "end"}`;
        }
        if (search) {
            const safeSearchTag = search.slice(0, 15).replace(/[^a-zA-Z0-9]/g, "_");
            filterSuffix += `_search-${safeSearchTag}`;
        }

        const filename = `transactions${filterSuffix}_${new Date().toISOString().split("T")[0]}.csv`;

        const res = new NextResponse(csvString, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "X-API-Version": API_VERSION,
                "X-Record-Count": String(invoices.length),
            },
        });

        return res;
    } catch (error) {
        console.error("[/api/v1/export-csv] Error:", error);
        return buildResponse(
            NextResponse.json({ error: "Failed to generate CSV" }, { status: 500 })
        );
    }
}

function buildResponse(res: NextResponse): NextResponse {
    res.headers.set("X-API-Version", API_VERSION);
    return res;
}
