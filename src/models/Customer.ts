import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
    name: string;
    phoneNumber: string;
    anniversaryDate?: string;
    birthdayDate?: string;
    address?: string;
    userId: mongoose.Types.ObjectId;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
    {
        name: { type: String, required: true },
        phoneNumber: { type: String, required: true },
        anniversaryDate: { type: String, required: false },
        birthdayDate: { type: String, required: false },
        address: { type: String, required: false },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    },
    { timestamps: true }
);

export default mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
