import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardLayoutClient from "@/components/DashboardLayoutClient";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    return (
        <DashboardLayoutClient
            user={{
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
                role: (session.user as any).role
            }}
        >
            {children}
        </DashboardLayoutClient>
    );
}
