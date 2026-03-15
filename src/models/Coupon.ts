import mongoose, { Schema, Document } from 'mongoose';

export interface ICoupon extends Document {
    code: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    applicableTo: 'ALL' | 'SPECIFIC_ITEMS';
    itemIds?: mongoose.Types.ObjectId[]; // Applicable if 'SPECIFIC_ITEMS'
    userId: mongoose.Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
    {
        code: { type: String, required: true, uppercase: true, trim: true },
        type: { type: String, enum: ['PERCENTAGE', 'FIXED'], required: true },
        value: { type: Number, required: true },
        applicableTo: { type: String, enum: ['ALL', 'SPECIFIC_ITEMS'], default: 'ALL' },
        itemIds: [{ type: Schema.Types.ObjectId, ref: 'MenuEntry' }],
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Ensure a user can't have duplicate coupon codes
CouponSchema.index({ userId: 1, code: 1 }, { unique: true });

export default mongoose.models.Coupon || mongoose.model<ICoupon>('Coupon', CouponSchema);
