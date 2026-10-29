import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getEffectiveUserId } from "@/lib/auth-utils";
import { activityLogService } from "@/lib/services/ActivityLogService";
import { fetchAccountMembers } from "@/app/actions/activity";
import ActivityLogClient from "@/components/ActivityLogClient";

export const metadata = {
    title: "Activity Log & Audit Trail | Primebake",
    description: "Account-wide chronological activity log of actions performed by administrators and staff members.",
};

export default async function ActivityPage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/login");
    }

    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) {
        redirect("/login");
    }

    // Server-side prefetch for instant initial render
    const [logData, stats, membersRes] = await Promise.all([
        activityLogService.getActivityLogs(effectiveUserId, { page: 1, limit: 15 }),
        activityLogService.getActivityStats(effectiveUserId),
        fetchAccountMembers(),
    ]);

    return (
        <ActivityLogClient
            initialLogs={logData.logs}
            initialTotal={logData.total}
            initialTotalPages={logData.totalPages}
            initialStats={stats}
            members={membersRes.members || []}
        />
    );
}
