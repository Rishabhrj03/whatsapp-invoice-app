import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
    name: string;
    phoneNumber: string;
    anniversaryDate?: string;
    birthdayDate?: string;
    address?: string;
    createdAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
    {
        name: { type: String, required: true },
        phoneNumber: { type: String, required: true },
        anniversaryDate: { type: String, required: false },
        birthdayDate: { type: String, required: false },
        address: { type: String, required: false },
    },
    { timestamps: true }
);

export default mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
