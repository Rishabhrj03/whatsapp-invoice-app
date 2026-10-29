"use server";

import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { activityLogService } from "@/lib/services/ActivityLogService";

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

        // Audit Trail: Record staff onboarding
        await activityLogService.logActivity({
            tenantId: owner._id.toString(),
            user: { id: owner._id, name: owner.name, email: owner.email, role: owner.role },
            action: 'STAFF_ADDED',
            entityType: 'TEAM',
            entityId: newUser._id.toString(),
            description: `Added staff member "${name}" (${email}) to the account`,
            metadata: { name, email, role: 'STAFF' },
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

        const deletedStaff = await User.findOneAndDelete({ _id: staffId, ownerId: owner._id });

        if (deletedStaff) {
            // Audit Trail: Record staff removal
            await activityLogService.logActivity({
                tenantId: owner._id.toString(),
                user: { id: owner._id, name: owner.name, email: owner.email, role: owner.role },
                action: 'STAFF_REMOVED',
                entityType: 'TEAM',
                entityId: staffId,
                description: `Removed staff member "${deletedStaff.name}" (${deletedStaff.email})`,
                metadata: { name: deletedStaff.name, email: deletedStaff.email },
            });
        }

        revalidatePath("/team");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to remove staff" };
    }
}
