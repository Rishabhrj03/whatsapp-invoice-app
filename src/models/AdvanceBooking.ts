import mongoose, { Schema, Document } from "mongoose";

export interface IAdvanceBooking extends Document {
    userId: mongoose.Types.ObjectId;
    customerName: string;
    phoneNumber: string;
    address?: string;
    deliveryDate: Date;
    deliveryTime: string;
    type: 'Pickup' | 'Delivery';
    photos?: string[];
    description?: string;
    weight?: string;
    status: 'Received' | 'Preparing' | 'Prepared' | 'Delivered';
    alertTime?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const AdvanceBookingSchema = new Schema<IAdvanceBooking>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        customerName: { type: String, required: true },
        phoneNumber: { type: String, required: true },
        address: { type: String },
        deliveryDate: { type: Date, required: true },
        deliveryTime: { type: String, required: true },
        type: { type: String, enum: ["Pickup", "Delivery"], required: true },
        photos: { type: [String], default: [] },
        description: { type: String },
        weight: { type: String },
        status: { type: String, enum: ["Received", "Preparing", "Prepared", "Delivered"], default: "Received" },
        alertTime: { type: Date },
    },
    { timestamps: true }
);

export default mongoose.models.AdvanceBooking || mongoose.model<IAdvanceBooking>("AdvanceBooking", AdvanceBookingSchema);
