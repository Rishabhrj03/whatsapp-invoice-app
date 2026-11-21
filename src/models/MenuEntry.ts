import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuEntry extends Document {
    name: string;
    price: number;
    description?: string;
    category?: string;
    isAvailable?: boolean;
    userId: mongoose.Types.ObjectId;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
}

const MenuEntrySchema = new Schema<IMenuEntry>(
    {
        name: { type: String, required: true },
        price: { type: Number, required: true },
        description: { type: String, required: false },
        category: { type: String, required: false },
        isAvailable: { type: Boolean, default: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    },
    { timestamps: true }
);

export default mongoose.models.MenuEntry || mongoose.model<IMenuEntry>('MenuEntry', MenuEntrySchema);
