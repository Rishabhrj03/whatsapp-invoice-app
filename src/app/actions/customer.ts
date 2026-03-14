"use server";

import dbConnect from "@/lib/mongoose";
import Customer from "@/models/Customer";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getEffectiveUserId } from "@/lib/auth-utils";

export async function createCustomer(formData: FormData) {
    try {
        await dbConnect();
        const session = await auth();
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId || !session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const name = formData.get("name") as string;
        // ... (rest of form data extraction)
        const phoneNumber = formData.get("phoneNumber") as string;
        const anniversaryDate = formData.get("anniversaryDate") as string;
        const birthdayDate = formData.get("birthdayDate") as string;
        const address = formData.get("address") as string;

        if (!name || !phoneNumber) {
            return { success: false, error: "Name and Phone Number are required." };
        }

        const newCustomer = await Customer.create({
            name,
            phoneNumber,
            ...(anniversaryDate && { anniversaryDate }),
            ...(birthdayDate && { birthdayDate }),
            ...(address && { address }),
            userId: effectiveUserId,
            createdBy: session.user.id,
        });

        revalidatePath("/customers");
        return {
            success: true,
            customer: JSON.parse(JSON.stringify(newCustomer))
        };
    } catch (error: any) {
        console.error("Failed to create customer:", error);
        return { success: false, error: error.message || "Failed to create customer" };
    }
}

export async function deleteCustomer(id: string) {
    try {
        await dbConnect();
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId) {
            return { success: false, error: "Unauthorized" };
        }
        await Customer.findOneAndDelete({ _id: id, userId: effectiveUserId });
        revalidatePath("/customers");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to delete customer" };
    }
}
