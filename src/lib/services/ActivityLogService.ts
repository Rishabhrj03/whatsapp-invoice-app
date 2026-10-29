import mongoose from 'mongoose';
import dbConnect from '@/lib/mongoose';
import ActivityLog, { ActivityActionType, ActivityEntityType } from '@/models/ActivityLog';
import { escapeRegex } from '@/lib/security';

export interface LogActivityParams {
    tenantId: string | mongoose.Types.ObjectId;
    user: {
        id: string | mongoose.Types.ObjectId;
        name: string;
        email: string;
        role: 'OWNER' | 'STAFF';
    };
    action: ActivityActionType;
    entityType: ActivityEntityType;
    entityId?: string;
    description: string;
    metadata?: Record<string, any>;
}

export interface ActivityFilterOptions {
    page?: number;
    limit?: number;
    userId?: string;
    entityType?: string;
    action?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
}

export class ActivityLogService {
    /**
     * Non-blocking activity recorder.
     * Captures audit events across both admin (OWNER) and team members (STAFF).
     */
    async logActivity(params: LogActivityParams): Promise<boolean> {
        try {
            await dbConnect();
            await ActivityLog.create({
                tenantId: new mongoose.Types.ObjectId(params.tenantId.toString()),
                userId: new mongoose.Types.ObjectId(params.user.id.toString()),
                userName: params.user.name || 'Unknown User',
                userEmail: params.user.email || '',
                userRole: params.user.role || 'STAFF',
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                description: params.description,
                metadata: params.metadata || {},
            });
            return true;
        } catch (error) {
            // Guard: Logging failures must never crash primary business operations
            console.error('[ActivityLogService] Failed to record activity log:', error);
            return false;
        }
    }

    /**
     * Query tenant activity logs with multi-field filtering and pagination.
     */
    async getActivityLogs(tenantId: string, options: ActivityFilterOptions = {}) {
        await dbConnect();
        const page = Math.max(1, options.page || 1);
        const limit = Math.min(100, Math.max(1, options.limit || 20));
        const skip = (page - 1) * limit;

        const query: any = {
            tenantId: new mongoose.Types.ObjectId(tenantId),
        };

        if (options.userId && options.userId !== 'ALL') {
            query.userId = new mongoose.Types.ObjectId(options.userId);
        }

        if (options.entityType && options.entityType !== 'ALL') {
            query.entityType = options.entityType;
        }

        if (options.action && options.action !== 'ALL') {
            query.action = options.action;
        }

        if (options.search && options.search.trim()) {
            const safeSearch = escapeRegex(options.search.trim());
            const regex = new RegExp(safeSearch, 'i');
            query.$or = [
                { description: regex },
                { userName: regex },
                { userEmail: regex },
                { entityId: regex },
            ];
        }

        if (options.startDate || options.endDate) {
            query.createdAt = {};
            if (options.startDate) {
                query.createdAt.$gte = new Date(options.startDate);
            }
            if (options.endDate) {
                const end = new Date(options.endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        const [logs, total] = await Promise.all([
            ActivityLog.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ActivityLog.countDocuments(query),
        ]);

        const serialized = logs.map((log: any) => ({
            _id: log._id.toString(),
            tenantId: log.tenantId.toString(),
            userId: log.userId.toString(),
            userName: log.userName,
            userEmail: log.userEmail,
            userRole: log.userRole,
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId || null,
            description: log.description,
            metadata: log.metadata ? JSON.parse(JSON.stringify(log.metadata)) : {},
            createdAt: log.createdAt.toISOString(),
        }));

        return {
            logs: serialized,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Compute activity statistics for account dashboard
     */
    async getActivityStats(tenantId: string) {
        await dbConnect();
        const tenantObjectId = new mongoose.Types.ObjectId(tenantId);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const [totalActions, actionsLast24h, actionsLast7d, roleBreakdown] = await Promise.all([
            ActivityLog.countDocuments({ tenantId: tenantObjectId }),
            ActivityLog.countDocuments({ tenantId: tenantObjectId, createdAt: { $gte: oneDayAgo } }),
            ActivityLog.countDocuments({ tenantId: tenantObjectId, createdAt: { $gte: sevenDaysAgo } }),
            ActivityLog.aggregate([
                { $match: { tenantId: tenantObjectId } },
                { $group: { _id: '$userRole', count: { $sum: 1 } } }
            ]),
        ]);

        const breakdown = {
            owner: 0,
            staff: 0,
        };

        for (const item of roleBreakdown) {
            if (item._id === 'OWNER') breakdown.owner = item.count;
            if (item._id === 'STAFF') breakdown.staff = item.count;
        }

        return {
            totalActions,
            actionsLast24h,
            actionsLast7d,
            breakdown,
        };
    }
}

export const activityLogService = new ActivityLogService();
