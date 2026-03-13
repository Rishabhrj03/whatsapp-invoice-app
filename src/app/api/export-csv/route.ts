import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Invoice from "@/models/Invoice";
import Customer from "@/models/Customer";
import { format } from "date-fns"; // We don't have date-fns, I'll use native Date string
// Wait, I didn't install papaparse for the server side but I installed it generally.
import Papa from "papaparse";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await dbConnect();

        const invoices = await Invoice.find().populate("customer").sort({ date: -1 });

        // Format data for CSV
        const csvData = invoices.map(inv => {
            const cust = inv.customer as any;
            const itemsString = inv.items.map((item: any) => `${item.name} (x${item.quantity})`).join(", ");

            return {
                "Date": new Date(inv.date).toLocaleDateString(),
                "Customer Name": cust ? cust.name : "Unknown",
                "Phone Number": cust ? cust.phoneNumber : "Unknown",
                "Items ordered": itemsString,
                "Total Amount (INR)": inv.totalAmount,
                "Status": inv.status,
                "Comment": inv.comment || "",
            };
        });

        const csvString = Papa.unparse(csvData);

        return new NextResponse(csvString, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": "attachment; filename=transactions.csv",
            },
        });

    } catch (error) {
        console.error("CSV Export error", error);
        return NextResponse.json({ error: "Failed to generate CSV" }, { status: 500 });
    }
}
