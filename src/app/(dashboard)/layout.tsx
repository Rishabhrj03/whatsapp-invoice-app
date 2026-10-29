import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardLayoutClient from "@/components/DashboardLayoutClient";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { getEffectiveUserId } from "@/lib/auth-utils";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    await dbConnect();
    const effectiveUserId = await getEffectiveUserId();

    const [dbUser, ownerUser] = await Promise.all([
        User.findById(session.user.id),
        effectiveUserId && effectiveUserId !== session.user.id
            ? User.findById(effectiveUserId)
            : null
    ]);

    if (!dbUser) {
        redirect("/login");
    }

    const effectiveBusinessName = ownerUser?.businessName || dbUser?.businessName;
    const effectiveLogoUrl = ownerUser?.logoUrl || dbUser?.logoUrl;

    return (
        <DashboardLayoutClient
            user={{
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
                role: (session.user as any).role,
                businessName: effectiveBusinessName,
                logoUrl: effectiveLogoUrl
            }}
        >
            {children}
        </DashboardLayoutClient>
    );
}
