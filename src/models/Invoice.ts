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
    comment?: string;
    date: Date;
    status: 'Draft' | 'Sent' | 'Paid';
    createdAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>({
    menuEntryId: { type: Schema.Types.ObjectId, ref: 'MenuEntry', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
});

const InvoiceSchema = new Schema<IInvoice>(
    {
        customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
        items: [InvoiceItemSchema],
        totalAmount: { type: Number, required: true },
        comment: { type: String, required: false },
        date: { type: Date, default: Date.now },
        status: { type: String, enum: ['Draft', 'Sent', 'Paid'], default: 'Draft' },
    },
    { timestamps: true }
);

export default mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
