import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    businessName?: string;
    logoUrl?: string;
    whatsappTemplate?: string;
    role: 'OWNER' | 'STAFF';
    ownerId?: mongoose.Types.ObjectId; // If STAFF, points to OWNER
    emailVerified?: Date;
    resetToken?: string;
    resetTokenExpiry?: Date;
    bookingAlertHoursBefore?: number;
    bookingAlertFrequencyMins?: number;
    dispatchAlertHoursBefore?: number;
    createdAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: false },
        businessName: { type: String, required: false },
        logoUrl: { type: String, required: false },
        whatsappTemplate: { type: String, required: false },
        role: { type: String, enum: ['OWNER', 'STAFF'], default: 'OWNER' },
        ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
        emailVerified: { type: Date, required: false },
        resetToken: { type: String, required: false },
        resetTokenExpiry: { type: Date, required: false },
        bookingAlertHoursBefore: { type: Number, default: 4 },
        bookingAlertFrequencyMins: { type: Number, default: 30 },
        dispatchAlertHoursBefore: { type: Number, default: 1 },
    },
    { timestamps: true }
);

if (mongoose.models && mongoose.models.User) {
    delete (mongoose.models as any).User;
}

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
