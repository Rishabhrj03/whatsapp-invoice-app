"use server";

import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function updateBusinessProfile(formData: FormData) {
    try {
        await dbConnect();
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const businessName = formData.get("businessName") as string;
        const logoUrl = formData.get("logoUrl") as string;
        const whatsappTemplate = formData.get("whatsappTemplate") as string;

        const bookingAlertHoursBefore = formData.get("bookingAlertHoursBefore")
            ? Number(formData.get("bookingAlertHoursBefore"))
            : undefined;
        const bookingAlertFrequencyMins = formData.get("bookingAlertFrequencyMins")
            ? Number(formData.get("bookingAlertFrequencyMins"))
            : undefined;

        console.log("Action - Extracted whatsappTemplate:", whatsappTemplate);

        const updatePayload: any = { businessName, logoUrl, whatsappTemplate };
        if (bookingAlertHoursBefore !== undefined) updatePayload.bookingAlertHoursBefore = bookingAlertHoursBefore;
        if (bookingAlertFrequencyMins !== undefined) updatePayload.bookingAlertFrequencyMins = bookingAlertFrequencyMins;

        const updatedUser = await User.findByIdAndUpdate(
            session.user.id,
            updatePayload,
            { new: true }
        );

        if (!updatedUser) {
            return { success: false, error: "User not found" };
        }

        revalidatePath("/settings");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to update business profile:", error);
        return { success: false, error: error.message || "Failed to update profile" };
    }
}
