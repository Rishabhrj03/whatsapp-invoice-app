"use server";

import dbConnect from "@/lib/mongoose";
import Invoice from "@/models/Invoice";
import { revalidatePath } from "next/cache";

export async function createInvoice(data: any) {
    try {
        await dbConnect();

        const newInvoice = await Invoice.create({
            customer: data.customerId,
            items: data.items,
            totalAmount: data.totalAmount,
            comment: data.comment,
            date: new Date(),
            status: "Sent",
        });

        revalidatePath("/dashboard");
        return { success: true, invoiceId: newInvoice._id.toString() };
    } catch (error: any) {
        console.error("Failed to create invoice:", error);
        return { success: false, error: error.message || "Failed to create invoice" };
    }
}
