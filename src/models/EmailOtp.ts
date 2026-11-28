import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailOtp extends Document {
    email: string;
    otpHash: string;
    expiresAt: Date;
    attempts: number;
    resendCooldown: Date;
    createdAt: Date;
    updatedAt: Date;
}

const EmailOtpSchema = new Schema<IEmailOtp>(
    {
        email: { type: String, required: true, lowercase: true, trim: true, index: true },
        otpHash: { type: String, required: true },
        // MongoDB TTL index: automatically deletes the document after expiresAt is reached
        expiresAt: { type: Date, required: true, index: { expires: 0 } },
        attempts: { type: Number, default: 0 },
        resendCooldown: { type: Date, required: true },
    },
    { timestamps: true }
);

EmailOtpSchema.index({ email: 1, createdAt: -1 });

if (mongoose.models && mongoose.models.EmailOtp) {
    delete (mongoose.models as any).EmailOtp;
}

export default mongoose.models.EmailOtp || mongoose.model<IEmailOtp>('EmailOtp', EmailOtpSchema);
