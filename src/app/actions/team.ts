"use server";

import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function addStaffMember(formData: FormData) {
    try {
        await dbConnect();
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const owner = await User.findById(session.user.id);
        if (owner?.role !== 'OWNER') {
            return { success: false, error: "Only owners can add staff members." };
        }

        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        if (!name || !email || !password) {
            return { success: false, error: "All fields are required." };
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return { success: false, error: "A user with this email already exists." };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'STAFF',
            ownerId: owner._id,
        });

        revalidatePath("/team");
        return { success: true, staff: JSON.parse(JSON.stringify(newUser)) };
    } catch (error: any) {
        console.error("Failed to add staff:", error);
        return { success: false, error: error.message || "Failed to add staff member" };
    }
}

export async function removeStaffMember(staffId: string) {
    try {
        await dbConnect();
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const owner = await User.findById(session.user.id);
        if (owner?.role !== 'OWNER') {
            return { success: false, error: "Only owners can manage staff." };
        }

        await User.findOneAndDelete({ _id: staffId, ownerId: owner._id });

        revalidatePath("/team");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to remove staff" };
    }
}
