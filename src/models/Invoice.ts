import mongoose, { Schema, Document } from 'mongoose';
import { IMenuEntry } from './MenuEntry';
import { ICustomer } from './Customer';

export interface IInvoiceItem {
    menuEntryId: mongoose.Types.ObjectId | IMenuEntry;
    name: string;
    price: number;
    quantity: number;
}

export interface IInvoice extends Document {
    customer: mongoose.Types.ObjectId | ICustomer;
    items: IInvoiceItem[];
    totalAmount: number;
    discountAmount?: number;
    couponCode?: string;
    paymentType?: 'Cash' | 'Card' | 'UPI';
    pdfUrl?: string;
    comment?: string;
    date: Date;
    status: 'Draft' | 'Sent' | 'Paid';
    userId: mongoose.Types.ObjectId;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>({
    menuEntryId: { type: Schema.Types.ObjectId, ref: 'MenuEntry', required: false },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
});

const InvoiceSchema = new Schema<IInvoice>(
    {
        customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: false },
        items: [InvoiceItemSchema],
        totalAmount: { type: Number, required: true },
        discountAmount: { type: Number, default: 0 },
        couponCode: { type: String, required: false },
        paymentType: { type: String, enum: ['Cash', 'Card', 'UPI'], default: 'Cash' },
        pdfUrl: { type: String, required: false },
        comment: { type: String, required: false },
        date: { type: Date, default: Date.now },
        status: { type: String, enum: ['Draft', 'Sent', 'Paid'], default: 'Draft' },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false }, // Useful for STAFF tracking
    },
    { timestamps: true }
);

export default mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
