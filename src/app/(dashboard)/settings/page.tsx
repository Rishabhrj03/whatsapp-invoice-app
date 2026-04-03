import { auth } from "@/auth";
import SettingsClient from "@/components/SettingsClient";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/login");
    }

    await dbConnect();
    const { getEffectiveUserId } = await import("@/lib/auth-utils");
    const effectiveUserId = await getEffectiveUserId();

    if (!effectiveUserId) {
        redirect("/login");
    }

    const user = await User.findById(effectiveUserId);

    if (!user) {
        redirect("/login");
    }

    return <SettingsClient initialUser={JSON.parse(JSON.stringify(user))} />;
}
