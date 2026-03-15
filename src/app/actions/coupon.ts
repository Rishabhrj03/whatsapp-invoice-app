"use server";

import dbConnect from "@/lib/mongoose";
import Coupon from "@/models/Coupon";
import { auth } from "@/auth";
import { getEffectiveUserId } from "@/lib/auth-utils";
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
        if (!effectiveUserId) return { success: false, error: "Unauthorized" };

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
        if (!effectiveUserId) return { success: false, error: "Unauthorized" };

        const deleted = await Coupon.findOneAndDelete({ _id: id, userId: effectiveUserId });
        if (!deleted) return { success: false, error: "Coupon not found" };

        revalidatePath("/coupons");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete coupon:", error);
        return { success: false, error: error.message || "Failed to delete coupon" };
    }
}
