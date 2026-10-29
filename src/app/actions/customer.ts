"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getEffectiveUserId, getCurrentUser } from "@/lib/auth-utils";
import { customerService } from "@/lib/services/CustomerService";
import { activityLogService } from "@/lib/services/ActivityLogService";

export type CreateCustomerResponse =
    | { success: true; customer: any; error?: undefined }
    | { success: false; error: string; customer?: undefined };

export async function createCustomer(formData: FormData): Promise<CreateCustomerResponse> {
    try {
        const session = await auth();
        const effectiveUserId = await getEffectiveUserId();
        const user = await getCurrentUser();
        if (!effectiveUserId || !session?.user?.id || !user) {
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

        // Audit Trail: Record customer creation
        await activityLogService.logActivity({
            tenantId: effectiveUserId,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'CUSTOMER_CREATED',
            entityType: 'CUSTOMER',
            entityId: result.customer._id.toString(),
            description: `Created customer profile for "${result.customer.name}" (${result.customer.phoneNumber})`,
            metadata: {
                name: result.customer.name,
                phoneNumber: result.customer.phoneNumber,
                address: result.customer.address,
            },
        });

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
        const user = await getCurrentUser();
        if (!effectiveUserId || !user) {
            return { success: false, error: "Unauthorized" };
        }

        const success = await customerService.deleteCustomer(id, effectiveUserId);
        if (!success) {
            return { success: false, error: "Customer not found or unauthorized" };
        }

        // Audit Trail: Record customer deletion
        await activityLogService.logActivity({
            tenantId: effectiveUserId,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'CUSTOMER_DELETED',
            entityType: 'CUSTOMER',
            entityId: id,
            description: `Deleted customer record (#${id.slice(-6).toUpperCase()})`,
        });

        revalidatePath("/customers");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to delete customer" };
    }
}
