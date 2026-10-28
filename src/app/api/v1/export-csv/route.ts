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

export const dynamic = "force-dynamic";

const API_VERSION = "v1";

export async function GET() {
    try {
        // Require authentication — CSV export must be tenant-scoped
        const session = await auth();
        const effectiveUserId = await getEffectiveUserId();
        if (!session?.user?.id || !effectiveUserId) {
            return buildResponse(
                NextResponse.json({ error: "Unauthorized" }, { status: 401 })
            );
        }

        await dbConnect();

        // Scope to authenticated business owner's tenant
        const invoices = await Invoice.find({ userId: effectiveUserId })
            .populate("customer")
            .sort({ date: -1 })
            .lean();

        const csvData = invoices.map((inv: any) => {
            const cust = inv.customer as any;
            const itemsString = inv.items
                .map((item: any) => `${item.name} (x${item.quantity})`)
                .join(", ");

            return {
                Date: new Date(inv.date).toLocaleDateString("en-IN"),
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
        const filename = `transactions_${new Date().toISOString().split("T")[0]}.csv`;

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
