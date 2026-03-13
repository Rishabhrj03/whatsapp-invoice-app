"use server";

import dbConnect from "@/lib/mongoose";
import Invoice from "@/models/Invoice";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function createInvoice(data: any) {
    try {
        await dbConnect();
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const newInvoice = await Invoice.create({
            customer: data.customerId || undefined,
            items: data.items,
            totalAmount: data.totalAmount,
            comment: data.comment,
            date: new Date(),
            status: "Sent",
            userId: session.user.id,
        });

        revalidatePath("/dashboard");
        return { success: true, invoiceId: newInvoice._id.toString() };
    } catch (error: any) {
        console.error("Failed to create invoice:", error);
        return { success: false, error: error.message || "Failed to create invoice" };
    }
}
