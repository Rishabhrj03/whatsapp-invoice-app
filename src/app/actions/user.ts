"use server";

import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { auth } from "@/auth";
import { getEffectiveUserId, getCurrentUser } from "@/lib/auth-utils";
import { activityLogService } from "@/lib/services/ActivityLogService";
import { revalidatePath } from "next/cache";

export async function updateBusinessProfile(formData: FormData) {
    try {
        await dbConnect();
        const session = await auth();
        const effectiveUserId = await getEffectiveUserId();
        const user = await getCurrentUser();
        
        if (!effectiveUserId || !user) {
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
        const dispatchAlertHoursBefore = formData.get("dispatchAlertHoursBefore")
            ? Number(formData.get("dispatchAlertHoursBefore"))
            : undefined;

        console.log("Action - Extracted whatsappTemplate:", whatsappTemplate);

        const updatePayload: any = { businessName, logoUrl, whatsappTemplate };
        if (bookingAlertHoursBefore !== undefined) updatePayload.bookingAlertHoursBefore = bookingAlertHoursBefore;
        if (bookingAlertFrequencyMins !== undefined) updatePayload.bookingAlertFrequencyMins = bookingAlertFrequencyMins;
        if (dispatchAlertHoursBefore !== undefined) updatePayload.dispatchAlertHoursBefore = dispatchAlertHoursBefore;

        const updatedUser = await User.findByIdAndUpdate(
            effectiveUserId,
            updatePayload,
            { new: true }
        );

        if (!updatedUser) {
            return { success: false, error: "User not found" };
        }

        // Audit Trail: Record business profile & settings update
        await activityLogService.logActivity({
            tenantId: effectiveUserId,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'BUSINESS_PROFILE_UPDATED',
            entityType: 'SETTINGS',
            description: `Updated business profile "${businessName || user.businessName || 'Store'}" & alert preferences`,
            metadata: {
                businessName,
                bookingAlertHoursBefore,
                bookingAlertFrequencyMins,
                dispatchAlertHoursBefore,
            },
        });

        revalidatePath("/settings");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to update business profile:", error);
        return { success: false, error: error.message || "Failed to update profile" };
    }
}
