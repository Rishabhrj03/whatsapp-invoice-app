import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
    name: string;
    description?: string;
    color?: string;
    userId: mongoose.Types.ObjectId;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
}

const CategorySchema = new Schema<ICategory>(
    {
        name: { type: String, required: true },
        description: { type: String, required: false },
        color: { type: String, required: false, default: '#f97316' }, // default orange
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    },
    { timestamps: true }
);

// Ensure a user cannot have duplicate category names
CategorySchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
