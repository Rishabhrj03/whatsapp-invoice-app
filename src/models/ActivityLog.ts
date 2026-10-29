import mongoose, { Schema, Document } from 'mongoose';

export type ActivityActionType =
    | 'INVOICE_CREATED'
    | 'INVOICE_UPDATED'
    | 'INVOICE_DELETED'
    | 'CUSTOMER_CREATED'
    | 'CUSTOMER_UPDATED'
    | 'CUSTOMER_DELETED'
    | 'BOOKING_CREATED'
    | 'BOOKING_STATUS_CHANGED'
    | 'BOOKING_COMPLETED'
    | 'BOOKING_UPDATED'
    | 'MENU_ITEM_CREATED'
    | 'MENU_ITEM_UPDATED'
    | 'MENU_ITEM_DELETED'
    | 'MENU_ITEMS_IMPORTED'
    | 'CATEGORY_CREATED'
    | 'CATEGORY_UPDATED'
    | 'CATEGORY_DELETED'
    | 'COUPON_CREATED'
    | 'COUPON_DELETED'
    | 'STAFF_ADDED'
    | 'STAFF_REMOVED'
    | 'BUSINESS_PROFILE_UPDATED';

export type ActivityEntityType =
    | 'INVOICE'
    | 'CUSTOMER'
    | 'BOOKING'
    | 'MENU_ITEM'
    | 'CATEGORY'
    | 'COUPON'
    | 'TEAM'
    | 'SETTINGS';

export interface IActivityLog extends Document {
    tenantId: mongoose.Types.ObjectId;  // Root business account / owner ID
    userId: mongoose.Types.ObjectId;    // User who performed the action (Owner or Staff)
    userName: string;                   // Snapshot of user name at time of event
    userEmail: string;                  // Snapshot of email
    userRole: 'OWNER' | 'STAFF';        // Snapshot of role
    action: ActivityActionType;
    entityType: ActivityEntityType;
    entityId?: string;
    description: string;
    metadata?: Record<string, any>;
    createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
    {
        tenantId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        userName: { type: String, required: true },
        userEmail: { type: String, required: true },
        userRole: { type: String, enum: ['OWNER', 'STAFF'], required: true },
        action: { type: String, required: true, index: true },
        entityType: { type: String, required: true, index: true },
        entityId: { type: String, required: false },
        description: { type: String, required: true },
        metadata: { type: Schema.Types.Mixed, required: false },
    },
    {
        timestamps: { createdAt: true, updatedAt: false }
    }
);

// High-performance compound indexes for multi-tenant activity stream querying
ActivityLogSchema.index({ tenantId: 1, createdAt: -1 });
ActivityLogSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
ActivityLogSchema.index({ tenantId: 1, entityType: 1, createdAt: -1 });
ActivityLogSchema.index({ tenantId: 1, action: 1, createdAt: -1 });

export default mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
