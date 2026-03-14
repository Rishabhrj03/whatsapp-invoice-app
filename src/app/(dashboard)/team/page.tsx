import { auth } from "@/auth";
import TeamClient from "@/components/TeamClient";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { redirect } from "next/navigation";

export default async function TeamPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    await dbConnect();
    const currentUser = await User.findById(session.user.id);

    if (!currentUser || currentUser.role !== 'OWNER') {
        redirect("/dashboard");
    }

    const staff = await User.find({ ownerId: currentUser._id, role: 'STAFF' }).sort({ createdAt: -1 });

    return <TeamClient staff={JSON.parse(JSON.stringify(staff))} owner={JSON.parse(JSON.stringify(currentUser))} />;
}
