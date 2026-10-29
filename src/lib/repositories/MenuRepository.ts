/**
 * MenuRepository — Singleton Mongoose adapter for MenuEntry + Category.
 */
import dbConnect from '@/lib/mongoose';
import MenuEntryModel from '@/models/MenuEntry';
import CategoryModel from '@/models/Category';
import type { MenuItemDTO, CategoryDTO, CreateMenuItemInput, CreateCategoryInput } from '@/types/domain';
import { escapeRegex } from '@/lib/security';

function serializeMenuItem(doc: any): MenuItemDTO {
    return {
        _id: doc._id.toString(),
        name: doc.name,
        price: doc.price,
        description: doc.description ?? undefined,
        category: doc.category ?? undefined,
        userId: doc.userId?.toString(),
    };
}

function serializeCategory(doc: any): CategoryDTO {
    return {
        _id: doc._id.toString(),
        name: doc.name,
        description: doc.description ?? undefined,
        color: doc.color ?? '#f97316',
        userId: doc.userId?.toString(),
    };
}

class MenuRepository {
    // ─── Menu Items ───────────────────────────────────────────────────────────
    async findItemById(id: string): Promise<MenuItemDTO | null> {
        await dbConnect();
        const doc = await MenuEntryModel.findById(id).lean();
        return doc ? serializeMenuItem(doc) : null;
    }

    async findItemsByUser(userId: string): Promise<MenuItemDTO[]> {
        await dbConnect();
        const docs = await MenuEntryModel.find({ userId }).sort({ name: 1 }).lean();
        return docs.map(serializeMenuItem);
    }

    async findItemsPaginated(
        userId: string,
        skip: number,
        limit: number,
    ): Promise<{ docs: MenuItemDTO[]; total: number }> {
        await dbConnect();
        const [docs, total] = await Promise.all([
            MenuEntryModel.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            MenuEntryModel.countDocuments({ userId }),
        ]);
        return { docs: docs.map(serializeMenuItem), total };
    }

    async createItem(dto: CreateMenuItemInput & { userId: string; createdBy: string }): Promise<MenuItemDTO> {
        await dbConnect();
        const doc = await MenuEntryModel.create(dto);
        return serializeMenuItem(doc.toObject());
    }

    async updateItem(id: string, userId: string, data: Partial<CreateMenuItemInput>): Promise<MenuItemDTO | null> {
        await dbConnect();
        const doc = await MenuEntryModel.findOneAndUpdate({ _id: id, userId }, data, { returnDocument: 'after' }).lean();
        return doc ? serializeMenuItem(doc) : null;
    }

    async deleteItem(id: string, userId: string): Promise<boolean> {
        await dbConnect();
        const res = await MenuEntryModel.findOneAndDelete({ _id: id, userId });
        return !!res;
    }

    async deleteItems(ids: string[], userId: string): Promise<number> {
        await dbConnect();
        const res = await MenuEntryModel.deleteMany({ _id: { $in: ids }, userId });
        return res.deletedCount;
    }

    async bulkCreateItems(
        items: (CreateMenuItemInput & { userId: string; createdBy?: string })[],
    ): Promise<number> {
        await dbConnect();
        const res = await MenuEntryModel.insertMany(items);
        return res.length;
    }

    // ─── Categories ───────────────────────────────────────────────────────────
    async findCategoriesByUser(userId: string): Promise<CategoryDTO[]> {
        await dbConnect();
        const docs = await CategoryModel.find({ userId }).sort({ name: 1 }).lean();
        return docs.map(serializeCategory);
    }

    async findCategoriesPaginated(
        userId: string,
        skip: number,
        limit: number,
    ): Promise<{ docs: CategoryDTO[]; total: number }> {
        await dbConnect();
        const [docs, total] = await Promise.all([
            CategoryModel.find({ userId }).sort({ name: 1 }).skip(skip).limit(limit).lean(),
            CategoryModel.countDocuments({ userId }),
        ]);
        return { docs: docs.map(serializeCategory), total };
    }

    async createCategory(dto: CreateCategoryInput & { userId: string; createdBy: string }): Promise<CategoryDTO> {
        await dbConnect();
        const doc = await CategoryModel.create(dto);
        return serializeCategory(doc.toObject());
    }

    async updateCategory(id: string, userId: string, data: Partial<CreateCategoryInput>): Promise<CategoryDTO | null> {
        await dbConnect();
        const doc = await CategoryModel.findOneAndUpdate({ _id: id, userId }, data, { returnDocument: 'after' }).lean();
        return doc ? serializeCategory(doc) : null;
    }

    async deleteCategory(id: string, userId: string): Promise<boolean> {
        await dbConnect();
        const res = await CategoryModel.deleteOne({ _id: id, userId });
        return res.deletedCount > 0;
    }

    async ensureCategoriesExist(names: string[], userId: string, createdBy: string): Promise<void> {
        await dbConnect();
        const existing = await CategoryModel.find({
            userId,
            name: { $in: names.map(n => new RegExp(`^${escapeRegex(n.trim())}$`, 'i')) },
        }).select('name').lean();

        const existingNames = new Set(existing.map((c: any) => c.name.toLowerCase()));
        const missing = names.filter(n => !existingNames.has(n.toLowerCase()));

        if (missing.length > 0) {
            await CategoryModel.insertMany(
                missing.map(name => ({ name: name.trim(), userId, createdBy, color: '#f97316' })),
            );
        }
    }
}

export const menuRepository = new MenuRepository();
