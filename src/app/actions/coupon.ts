"use server";

import dbConnect from "@/lib/mongoose";
import Coupon from "@/models/Coupon";
import { auth } from "@/auth";
import { getEffectiveUserId, getCurrentUser } from "@/lib/auth-utils";
import { activityLogService } from "@/lib/services/ActivityLogService";
import { revalidatePath } from "next/cache";

export async function createCoupon(data: {
    code: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    applicableTo?: 'ALL' | 'SPECIFIC_ITEMS';
    itemIds?: string[];
}) {
    try {
        await dbConnect();
        const effectiveUserId = await getEffectiveUserId();
        const user = await getCurrentUser();
        if (!effectiveUserId || !user) return { success: false, error: "Unauthorized" };

        // Check for duplicates
        const existing = await Coupon.findOne({ userId: effectiveUserId, code: data.code.toUpperCase() });
        if (existing) return { success: false, error: "Coupon code already exists" };

        const newCoupon = await Coupon.create({
            code: data.code,
            type: data.type,
            value: data.value,
            applicableTo: data.applicableTo || 'ALL',
            itemIds: data.itemIds || [],
            userId: effectiveUserId,
        });

        // Audit Trail: Record coupon creation
        await activityLogService.logActivity({
            tenantId: effectiveUserId,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'COUPON_CREATED',
            entityType: 'COUPON',
            entityId: newCoupon._id.toString(),
            description: `Created discount coupon "${data.code.toUpperCase()}" (${data.type === 'PERCENTAGE' ? `${data.value}%` : `₹${data.value}`} off)`,
            metadata: { code: data.code, type: data.type, value: data.value },
        });

        revalidatePath("/coupons");
        return { success: true, couponId: newCoupon._id.toString() };
    } catch (error: any) {
        console.error("Failed to create coupon:", error);
        return { success: false, error: error.message || "Failed to create coupon" };
    }
}

export async function getCoupons() {
    try {
        await dbConnect();
        const effectiveUserId = await getEffectiveUserId();
        if (!effectiveUserId) return { success: false, error: "Unauthorized", coupons: [] };

        const coupons = await Coupon.find({ userId: effectiveUserId }).sort({ createdAt: -1 });
        return { success: true, coupons: JSON.parse(JSON.stringify(coupons)) };
    } catch (error: any) {
        console.error("Failed to fetch coupons:", error);
        return { success: false, error: "Failed to fetch coupons", coupons: [] };
    }
}

export async function deleteCoupon(id: string) {
    try {
        await dbConnect();
        const effectiveUserId = await getEffectiveUserId();
        const user = await getCurrentUser();
        if (!effectiveUserId || !user) return { success: false, error: "Unauthorized" };

        const deleted = await Coupon.findOneAndDelete({ _id: id, userId: effectiveUserId });
        if (!deleted) return { success: false, error: "Coupon not found" };

        // Audit Trail: Record coupon deletion
        await activityLogService.logActivity({
            tenantId: effectiveUserId,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'COUPON_DELETED',
            entityType: 'COUPON',
            entityId: id,
            description: `Deleted discount coupon "${deleted.code}"`,
            metadata: { code: deleted.code },
        });

        revalidatePath("/coupons");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete coupon:", error);
        return { success: false, error: error.message || "Failed to delete coupon" };
    }
}
