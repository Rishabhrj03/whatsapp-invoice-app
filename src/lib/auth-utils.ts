import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { auth } from "@/auth";

export async function getEffectiveUserId() {
    await dbConnect();
    const session = await auth();
    if (!session?.user?.id) return null;

    const user = await User.findById(session.user.id);
    if (!user) return null;

    // If the user is STAFF, their effective ID is their owner's ID
    // Otherwise (OWNER), it's their own ID
    return user.role === 'STAFF' && user.ownerId ? user.ownerId.toString() : user._id.toString();
}

export async function getCurrentUser() {
    await dbConnect();
    const session = await auth();
    if (!session?.user?.id) return null;
    return await User.findById(session.user.id);
}
