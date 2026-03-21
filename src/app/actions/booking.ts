"use server";

import { auth } from "@/auth";
import dbConnect from "@/lib/mongoose";
import AdvanceBooking from "@/models/AdvanceBooking";
import { revalidatePath } from "next/cache";

export async function createAdvanceBooking(formData: any) {
    const session = await auth();
    if (!session?.user) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await dbConnect();

        const booking = new AdvanceBooking({
            userId: session.user.id,
            customerName: formData.customerName,
            phoneNumber: formData.phoneNumber,
            address: formData.address,
            deliveryDate: new Date(formData.deliveryDate),
            deliveryTime: formData.deliveryTime,
            type: formData.type, // "Pickup" | "Delivery"
            photos: formData.photos || [],
            description: formData.description,
            weight: formData.weight,
            alertTime: formData.alertTime ? new Date(formData.alertTime) : undefined,
            status: "Received"
        });

        await booking.save();
        revalidatePath("/bookings");

        return { success: true, id: booking._id.toString() };
    } catch (error: any) {
        console.error("Create Booking Error:", error);
        return { success: false, error: error.message || "Failed to create booking" };
    }
}

export async function getAdvanceBookings() {
    const session = await auth();
    if (!session?.user) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await dbConnect();
        const bookings = await AdvanceBooking.find({ userId: session.user.id })
            .sort({ deliveryDate: 1, deliveryTime: 1 })
            .lean();

        // Convert _id ObjectIds to strings
        const serialized = bookings.map((b: any) => ({
            ...b,
            _id: b._id.toString(),
            userId: b.userId.toString(),
            createdAt: b.createdAt.toISOString(),
            updatedAt: b.updatedAt.toISOString(),
            deliveryDate: b.deliveryDate.toISOString(),
            alertTime: b.alertTime ? b.alertTime.toISOString() : undefined,
        }));

        return { success: true, bookings: serialized };
    } catch (error: any) {
        console.error("Get Bookings Error:", error);
        return { success: false, error: "Failed to load bookings" };
    }
}

export async function updateAdvanceBookingDetails(bookingId: string, formData: any) {
    const session = await auth();
    if (!session?.user) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await dbConnect();

        const payload: any = {
            customerName: formData.customerName,
            phoneNumber: formData.phoneNumber,
            address: formData.address,
            deliveryDate: new Date(formData.deliveryDate),
            deliveryTime: formData.deliveryTime,
            type: formData.type,
            description: formData.description,
            weight: formData.weight,
        };

        if (formData.alertTime) payload.alertTime = new Date(formData.alertTime);
        if (formData.photos) payload.photos = formData.photos;

        const booking = await AdvanceBooking.findOneAndUpdate(
            { _id: bookingId, userId: session.user.id },
            { $set: payload },
            { new: true }
        );

        if (!booking) {
            return { success: false, error: "Booking not found" };
        }

        revalidatePath("/bookings");
        return { success: true };
    } catch (error: any) {
        console.error("Update Details Error:", error);
        return { success: false, error: "Failed to update booking details" };
    }
}

export async function updateBookingStatus(bookingId: string, status: string) {
    const session = await auth();
    if (!session?.user) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await dbConnect();
        const booking = await AdvanceBooking.findOneAndUpdate(
            { _id: bookingId, userId: session.user.id },
            { status },
            { new: true }
        );

        if (!booking) {
            return { success: false, error: "Booking not found" };
        }

        revalidatePath("/bookings");
        return { success: true };
    } catch (error: any) {
        console.error("Update Booking Error:", error);
        return { success: false, error: "Failed to update booking status" };
    }
}
