import { auth } from "@/auth";
import TeamClient from "@/components/TeamClient";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { redirect } from "next/navigation";

export default async function TeamPage({ searchParams }: { searchParams: { page?: string } }) {
    await dbConnect();
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const page = parseInt(searchParams.page || "1", 10);
    const limit = 10;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(session.user.id);
    if (!currentUser || currentUser.role !== 'OWNER') {
        redirect("/dashboard");
    }

    const [staff, total] = await Promise.all([
        User.find({ ownerId: currentUser._id, role: 'STAFF' }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        User.countDocuments({ ownerId: currentUser._id, role: 'STAFF' })
    ]);

    return <TeamClient
        staff={JSON.parse(JSON.stringify(staff))}
        owner={JSON.parse(JSON.stringify(currentUser))}
        currentPage={page}
        totalPages={Math.ceil(total / limit) || 1}
    />;
}
