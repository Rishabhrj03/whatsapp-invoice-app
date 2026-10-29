"use server";

import { auth } from "@/auth";
import { getEffectiveUserId, getCurrentUser } from "@/lib/auth-utils";
import { activityLogService, ActivityFilterOptions } from "@/lib/services/ActivityLogService";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export async function fetchActivityLogs(options: ActivityFilterOptions = {}) {
    try {
        const session = await auth();
        const effectiveUserId = await getEffectiveUserId();

        if (!session?.user?.id || !effectiveUserId) {
            return { success: false, error: "Unauthorized", logs: [], total: 0, totalPages: 0 };
        }

        const data = await activityLogService.getActivityLogs(effectiveUserId, options);
        return { success: true, ...data };
    } catch (error: any) {
        console.error("fetchActivityLogs error:", error);
        return { success: false, error: error.message || "Failed to load activity logs", logs: [], total: 0, totalPages: 0 };
    }
}

export async function fetchActivityStats() {
    try {
        const session = await auth();
        const effectiveUserId = await getEffectiveUserId();

        if (!session?.user?.id || !effectiveUserId) {
            return { success: false, error: "Unauthorized" };
        }

        const stats = await activityLogService.getActivityStats(effectiveUserId);
        return { success: true, stats };
    } catch (error: any) {
        console.error("fetchActivityStats error:", error);
        return { success: false, error: error.message || "Failed to load activity statistics" };
    }
}

export async function fetchAccountMembers() {
    try {
        await dbConnect();
        const session = await auth();
        const effectiveUserId = await getEffectiveUserId();

        if (!session?.user?.id || !effectiveUserId) {
            return { success: false, error: "Unauthorized", members: [] };
        }

        // Fetch owner and all staff associated with this account
        const members = await User.find({
            $or: [
                { _id: effectiveUserId },
                { ownerId: effectiveUserId }
            ]
        })
        .select("_id name email role")
        .sort({ role: 1, name: 1 })
        .lean();

        const serialized = members.map((m: any) => ({
            id: m._id.toString(),
            name: m.name,
            email: m.email,
            role: m.role,
        }));

        return { success: true, members: serialized };
    } catch (error: any) {
        console.error("fetchAccountMembers error:", error);
        return { success: false, error: error.message || "Failed to load team members", members: [] };
    }
}
