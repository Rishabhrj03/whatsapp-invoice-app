import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuEntry extends Document {
    name: string;
    price: number;
    description?: string;
    category?: string;
    createdAt: Date;
}

const MenuEntrySchema = new Schema<IMenuEntry>(
    {
        name: { type: String, required: true },
        price: { type: Number, required: true },
        description: { type: String, required: false },
        category: { type: String, required: false },
    },
    { timestamps: true }
);

export default mongoose.models.MenuEntry || mongoose.model<IMenuEntry>('MenuEntry', MenuEntrySchema);
