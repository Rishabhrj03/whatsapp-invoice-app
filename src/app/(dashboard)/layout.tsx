import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardLayoutClient from "@/components/DashboardLayoutClient";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

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
    const dbUser = await User.findById(session.user.id);

    return (
        <DashboardLayoutClient
            user={{
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
                role: (session.user as any).role,
                businessName: dbUser?.businessName,
                logoUrl: dbUser?.logoUrl
            }}
        >
            {children}
        </DashboardLayoutClient>
    );
}
