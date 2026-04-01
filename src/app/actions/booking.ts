"use server";

import { auth } from "@/auth";
import dbConnect from "@/lib/mongoose";
import AdvanceBooking from "@/models/AdvanceBooking";
import User from "@/models/User";
import Customer from "@/models/Customer";
import Invoice from "@/models/Invoice";
import { revalidatePath } from "next/cache";

export async function createAdvanceBooking(formData: any) {
    const session = await auth();
    if (!session?.user) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await dbConnect();

        const existingCustomer = await Customer.findOne({ phoneNumber: formData.phoneNumber, userId: session.user.id });
        if (!existingCustomer) {
            const customer = new Customer({
                name: formData.customerName,
                phoneNumber: formData.phoneNumber,
                address: formData.address,
                userId: session.user.id
            });
            await customer.save();
        }

        const booking = new AdvanceBooking({
            userId: session.user.id,
            customerName: formData.customerName,
            phoneNumber: formData.phoneNumber,
            address: formData.address,
            deliveryDate: new Date(formData.deliveryDate),
            deliveryTime: formData.deliveryTime,
            type: formData.type,
            photos: formData.photos || [],
            description: formData.description,
            weight: formData.weight,
            totalAmount: formData.totalAmount ? Number(formData.totalAmount) : 0,
            advanceAmount: formData.advanceAmount ? Number(formData.advanceAmount) : 0,
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

export async function getAdvanceBookings({ page = 1, limit = 10, search = "", status = "All" } = {}) {
    const session = await auth();
    if (!session?.user) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await dbConnect();

        const query: any = { userId: session.user.id };
        if (search) {
            query.$or = [
                { customerName: { $regex: search, $options: "i" } },
                { phoneNumber: { $regex: search, $options: "i" } }
            ];
        }
        if (status && status !== "All") {
            query.status = status;
        }

        const skip = (page - 1) * limit;

        const [bookings, total, user] = await Promise.all([
            AdvanceBooking.find(query)
                .sort({ deliveryDate: 1, deliveryTime: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            AdvanceBooking.countDocuments(query),
            User.findById(session.user.id).lean()
        ]);

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

        return {
            success: true,
            bookings: serialized,
            total,
            totalPages: Math.ceil(total / limit),
            settings: {
                hoursBefore: user?.bookingAlertHoursBefore ?? 4,
                frequencyMins: user?.bookingAlertFrequencyMins ?? 30,
                dispatchAlertHoursBefore: user?.dispatchAlertHoursBefore ?? 1
            }
        };
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
            totalAmount: formData.totalAmount ? Number(formData.totalAmount) : 0,
            advanceAmount: formData.advanceAmount ? Number(formData.advanceAmount) : 0,
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

export async function completeAdvanceBooking(bookingId: string, paymentType: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await dbConnect();

        const booking = await AdvanceBooking.findOneAndUpdate(
            { _id: bookingId, userId: session.user.id },
            { status: "Delivered" },
            { new: true }
        );

        if (!booking) {
            return { success: false, error: "Booking not found" };
        }

        // 1. Find or Create Customer
        let customer = await Customer.findOne({ phoneNumber: booking.phoneNumber, userId: session.user.id });
        if (!customer) {
            customer = new Customer({
                name: booking.customerName,
                phoneNumber: booking.phoneNumber,
                address: booking.address,
                userId: session.user.id
            });
            await customer.save();
        }

        // 2. Create Invoice
        const invoice = new Invoice({
            customer: customer._id,
            items: [{
                name: `Advance Booking: ${booking.description || "Order"}`,
                price: booking.totalAmount || 0,
                quantity: 1
            }],
            totalAmount: booking.totalAmount || 0,
            discountAmount: 0,
            paymentType: paymentType as 'Cash' | 'Card' | 'UPI',
            date: new Date(),
            status: "Paid",
            userId: session.user.id
        });

        await invoice.save();
        revalidatePath("/bookings");
        revalidatePath("/transactions");

        return { success: true };
    } catch (error: any) {
        console.error("Complete Booking Error:", error);
        return { success: false, error: "Failed to complete booking" };
    }
}
