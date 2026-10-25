"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getEffectiveUserId } from "@/lib/auth-utils";
import { customerService } from "@/lib/services/CustomerService";

export type CreateCustomerResponse =
    | { success: true; customer: any; error?: undefined }
    | { success: false; error: string; customer?: undefined };

export async function createCustomer(formData: FormData): Promise<CreateCustomerResponse> {
    try {
        const session = await auth();
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId || !session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const rawData = {
            name: formData.get("name") as string,
            phoneNumber: formData.get("phoneNumber") as string,
            anniversaryDate: (formData.get("anniversaryDate") as string) || undefined,
            birthdayDate: (formData.get("birthdayDate") as string) || undefined,
            address: (formData.get("address") as string) || undefined,
        };

        const result = await customerService.createCustomer(rawData, effectiveUserId, session.user.id);
        if (!result.success || !result.customer) {
            return { success: false, error: result.error || "Failed to create customer" };
        }

        revalidatePath("/customers");
        return { success: true, customer: result.customer };
    } catch (error: any) {
        console.error("Failed to create customer:", error);
        return { success: false, error: error.message || "Failed to create customer" };
    }
}

export async function deleteCustomer(id: string) {
    try {
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId) {
            return { success: false, error: "Unauthorized" };
        }

        const success = await customerService.deleteCustomer(id, effectiveUserId);
        if (!success) {
            return { success: false, error: "Customer not found or unauthorized" };
        }

        revalidatePath("/customers");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to delete customer" };
    }
}
