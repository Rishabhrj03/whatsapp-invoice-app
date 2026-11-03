import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardLayoutClient from "@/components/DashboardLayoutClient";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { getEffectiveUserId } from "@/lib/auth-utils";

export async function generateMetadata(): Promise<Metadata> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { title: "Workspace" };
        }

        await dbConnect();
        const effectiveUserId = await getEffectiveUserId();
        const [dbUser, ownerUser] = await Promise.all([
            User.findById(session.user.id).lean(),
            effectiveUserId && effectiveUserId !== session.user.id
                ? User.findById(effectiveUserId).lean()
                : null
        ]);

        const businessName = (ownerUser as any)?.businessName || (dbUser as any)?.businessName || "Workspace";
        const logoUrl = (ownerUser as any)?.logoUrl || (dbUser as any)?.logoUrl;

        return {
            title: {
                template: `${businessName} · %s`,
                default: `${businessName} · Invoicing & POS`,
            },
            icons: logoUrl ? {
                icon: [{ url: logoUrl }],
                shortcut: logoUrl,
                apple: logoUrl,
            } : undefined,
        };
    } catch {
        return {
            title: "Workspace · Invoicing & POS",
        };
    }
}


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
