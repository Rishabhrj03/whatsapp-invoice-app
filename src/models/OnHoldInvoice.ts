import mongoose, { Schema, Document } from 'mongoose';

export interface IOnHoldItem {
    categoryId?: string;
    menuEntryId?: string;
    name: string;
    price: number;
    quantity: number;
    description?: string;
}

export interface IOnHoldInvoice extends Document {
    userId: mongoose.Types.ObjectId;      // Multi-tenant business ID
    createdBy?: mongoose.Types.ObjectId;  // Staff or Owner ID
    customerId?: mongoose.Types.ObjectId;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    items: IOnHoldItem[];
    totalAmount: number;
    discountAmount?: number;
    manualDiscountType?: 'FIXED' | 'PERCENTAGE';
    manualDiscountValue?: string;
    couponCode?: string;
    appliedCoupon?: any;
    paymentType: 'Cash' | 'Card' | 'UPI';
    comment?: string;
    invoiceDate?: string;
    holdReference?: string;
    createdAt: Date;
    updatedAt: Date;
}

const OnHoldItemSchema = new Schema<IOnHoldItem>(
    {
        categoryId: { type: String, required: false },
        menuEntryId: { type: String, required: false },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, default: 1 },
        description: { type: String, required: false },
    },
    { _id: false }
);

const OnHoldInvoiceSchema = new Schema<IOnHoldInvoice>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
        customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: false },
        customerName: { type: String, required: false },
        customerPhone: { type: String, required: false },
        customerAddress: { type: String, required: false },
        items: [OnHoldItemSchema],
        totalAmount: { type: Number, required: true },
        discountAmount: { type: Number, default: 0 },
        manualDiscountType: { type: String, enum: ['FIXED', 'PERCENTAGE'], default: 'FIXED' },
        manualDiscountValue: { type: String, default: '' },
        couponCode: { type: String, required: false },
        appliedCoupon: { type: Schema.Types.Mixed, required: false },
        paymentType: { type: String, enum: ['Cash', 'Card', 'UPI'], default: 'Cash' },
        comment: { type: String, required: false },
        invoiceDate: { type: String, required: false },
        holdReference: { type: String, required: false },
    },
    { timestamps: true }
);

// Performance index for multi-tenant query
OnHoldInvoiceSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.OnHoldInvoice || mongoose.model<IOnHoldInvoice>('OnHoldInvoice', OnHoldInvoiceSchema);
