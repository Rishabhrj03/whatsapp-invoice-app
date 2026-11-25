import dbConnect from "@/lib/mongoose";
import OnHoldInvoice from "@/models/OnHoldInvoice";
import OnHoldClient from "@/components/OnHoldClient";
import { auth } from "@/auth";
import { getEffectiveUserId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "On-Hold Bills",
    description: "Manage temporarily parked bills and resume invoicing for customers.",
};

export default async function OnHoldPage() {
    await dbConnect();
    const session = await auth();
    const effectiveUserId = await getEffectiveUserId();

    if (!session?.user?.id || !effectiveUserId) {
        redirect("/login");
    }

    const heldInvoices = await OnHoldInvoice.find({ userId: effectiveUserId })
        .sort({ createdAt: -1 })
        .lean();

    return (
        <div className="space-y-6">
            <OnHoldClient
                initialHeldInvoices={JSON.parse(JSON.stringify(heldInvoices))}
            />
        </div>
    );
}
