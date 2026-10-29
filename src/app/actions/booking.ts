"use server";

import { auth } from "@/auth";
import dbConnect from "@/lib/mongoose";
import { getEffectiveUserId, getCurrentUser } from "@/lib/auth-utils";
import AdvanceBooking from "@/models/AdvanceBooking";
import User from "@/models/User";
import Customer from "@/models/Customer";
import Invoice from "@/models/Invoice";
import { activityLogService } from "@/lib/services/ActivityLogService";
import { revalidatePath } from "next/cache";

export async function createAdvanceBooking(formData: any) {
    const session = await auth();
    const effectiveUserId = await getEffectiveUserId();
    const user = await getCurrentUser();
    if (!session?.user || !effectiveUserId || !user) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await dbConnect();

        const existingCustomer = await Customer.findOne({ phoneNumber: formData.phoneNumber, userId: effectiveUserId });
        if (!existingCustomer) {
            const customer = new Customer({
                name: formData.customerName,
                phoneNumber: formData.phoneNumber,
                address: formData.address,
                userId: effectiveUserId
            });
            await customer.save();
        }

        const booking = new AdvanceBooking({
            userId: effectiveUserId,
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

        // Audit Trail: Record advance booking creation
        await activityLogService.logActivity({
            tenantId: effectiveUserId,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'BOOKING_CREATED',
            entityType: 'BOOKING',
            entityId: booking._id.toString(),
            description: `Created advance booking for "${formData.customerName}" (${formData.type || "Order"}, ₹${formData.totalAmount || 0})`,
            metadata: {
                customerName: formData.customerName,
                phoneNumber: formData.phoneNumber,
                deliveryDate: formData.deliveryDate,
                deliveryTime: formData.deliveryTime,
                totalAmount: formData.totalAmount,
                advanceAmount: formData.advanceAmount,
            },
        });

        revalidatePath("/bookings");

        return { success: true, id: booking._id.toString() };
    } catch (error: any) {
        console.error("Create Booking Error:", error);
        return { success: false, error: error.message || "Failed to create booking" };
    }
}

export async function getAdvanceBookings({ page = 1, limit = 10, search = "", status = "All" } = {}) {
    const session = await auth();
    const effectiveUserId = await getEffectiveUserId();
    if (!session?.user || !effectiveUserId) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await dbConnect();

        const query: any = { userId: effectiveUserId };
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
            User.findById(effectiveUserId).lean()
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
    const effectiveUserId = await getEffectiveUserId();
    if (!session?.user || !effectiveUserId) {
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
            { _id: bookingId, userId: effectiveUserId },
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
    const effectiveUserId = await getEffectiveUserId();
    const user = await getCurrentUser();
    if (!session?.user || !effectiveUserId || !user) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await dbConnect();
        const booking = await AdvanceBooking.findOneAndUpdate(
            { _id: bookingId, userId: effectiveUserId },
            { status },
            { new: true }
        );

        if (!booking) {
            return { success: false, error: "Booking not found" };
        }

        // Audit Trail: Record booking status transition
        await activityLogService.logActivity({
            tenantId: effectiveUserId,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'BOOKING_STATUS_CHANGED',
            entityType: 'BOOKING',
            entityId: bookingId,
            description: `Changed booking status to "${status}" for "${booking.customerName}"`,
            metadata: {
                bookingId,
                customerName: booking.customerName,
                newStatus: status,
                deliveryDate: booking.deliveryDate,
            },
        });

        revalidatePath("/bookings");
        return { success: true };
    } catch (error: any) {
        console.error("Update Booking Error:", error);
        return { success: false, error: "Failed to update booking status" };
    }
}

export async function completeAdvanceBooking(bookingId: string, paymentType: string) {
    const session = await auth();
    const effectiveUserId = await getEffectiveUserId();
    const user = await getCurrentUser();
    if (!session?.user?.id || !effectiveUserId || !user) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await dbConnect();

        const booking = await AdvanceBooking.findOneAndUpdate(
            { _id: bookingId, userId: effectiveUserId },
            { status: "Delivered" },
            { new: true }
        );

        if (!booking) {
            return { success: false, error: "Booking not found" };
        }

        // 1. Find or Create Customer scoped to tenant
        let customer = await Customer.findOne({ phoneNumber: booking.phoneNumber, userId: effectiveUserId });
        if (!customer) {
            customer = new Customer({
                name: booking.customerName,
                phoneNumber: booking.phoneNumber,
                address: booking.address,
                userId: effectiveUserId
            });
            await customer.save();
        }

        // 2. Create Invoice scoped to tenant
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
            userId: effectiveUserId
        });

        await invoice.save();

        // Audit Trail: Record booking completion and bill generation
        await activityLogService.logActivity({
            tenantId: effectiveUserId,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
            action: 'BOOKING_COMPLETED',
            entityType: 'BOOKING',
            entityId: bookingId,
            description: `Delivered advance booking & generated Bill #${invoice._id.toString().slice(-6).toUpperCase()} for "${booking.customerName}" (₹${booking.totalAmount || 0})`,
            metadata: {
                bookingId,
                invoiceId: invoice._id.toString(),
                customerName: booking.customerName,
                paymentType,
                totalAmount: booking.totalAmount,
            },
        });

        revalidatePath("/bookings");
        revalidatePath("/transactions");

        return { success: true };
    } catch (error: any) {
        console.error("Complete Booking Error:", error);
        return { success: false, error: "Failed to complete booking" };
    }
}
