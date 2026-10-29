/**
 * InvoiceRepository — concrete Mongoose implementation of IRepository for Invoice.
 * Singleton instance exported at the bottom (Singleton Pattern).
 *
 * Consumers (services / actions) depend on the IRepository interface,
 * not this class directly → Dependency Inversion.
 */
import dbConnect from '@/lib/mongoose';
import InvoiceModel from '@/models/Invoice';
import type { IRepository } from './IRepository';
import type { InvoiceDTO, CreateInvoiceInput, UpdateInvoiceInput } from '@/types/domain';
import mongoose from 'mongoose';

function serializeInvoice(doc: any): InvoiceDTO {
    return {
        _id: doc._id.toString(),
        customerId: doc.customer?.toString?.() ?? doc.customer,
        customer: doc.customer && typeof doc.customer === 'object' && doc.customer.name
            ? {
                _id: doc.customer._id.toString(),
                name: doc.customer.name,
                phoneNumber: doc.customer.phoneNumber,
                address: doc.customer.address,
                userId: doc.customer.userId?.toString(),
                createdAt: doc.customer.createdAt?.toISOString?.() ?? doc.customer.createdAt,
            }
            : null,
        items: (doc.items ?? []).map((it: any) => ({
            menuEntryId: it.menuEntryId?.toString(),
            name: it.name,
            price: it.price,
            quantity: it.quantity,
            description: it.description,
        })),
        totalAmount: doc.totalAmount,
        discountAmount: doc.discountAmount ?? 0,
        couponCode: doc.couponCode,
        paymentType: doc.paymentType ?? 'Cash',
        pdfUrl: doc.pdfUrl,
        comment: doc.comment,
        date: doc.date instanceof Date ? doc.date.toISOString() : doc.date,
        status: doc.status ?? 'Sent',
        userId: doc.userId?.toString(),
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    };
}

class InvoiceRepository implements IRepository<InvoiceDTO, CreateInvoiceInput> {
    async findById(id: string): Promise<InvoiceDTO | null> {
        await dbConnect();
        const doc = await InvoiceModel.findById(id).populate('customer').lean();
        return doc ? serializeInvoice(doc) : null;
    }

    async findAll(filter: Record<string, unknown> = {}): Promise<InvoiceDTO[]> {
        await dbConnect();
        const docs = await InvoiceModel.find(filter).populate('customer').sort({ createdAt: -1 }).lean();
        return docs.map(serializeInvoice);
    }

    async findByCustomer(userId: string, customerId: string, since?: Date): Promise<InvoiceDTO[]> {
        await dbConnect();
        const query: Record<string, unknown> = { userId, customer: customerId };
        if (since) query.date = { $gte: since };
        const docs = await InvoiceModel.find(query).sort({ date: -1 }).lean();
        return docs.map(serializeInvoice);
    }

    async findPaginated(
        filter: Record<string, unknown>,
        skip: number,
        limit: number,
    ): Promise<{ docs: InvoiceDTO[]; total: number }> {
        await dbConnect();
        const [docs, total] = await Promise.all([
            InvoiceModel.find(filter).populate('customer').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            InvoiceModel.countDocuments(filter),
        ]);
        return { docs: docs.map(serializeInvoice), total };
    }

    async create(dto: CreateInvoiceInput & { userId: string; createdBy: string }): Promise<InvoiceDTO> {
        await dbConnect();
        const doc = await InvoiceModel.create({
            customer: dto.customerId || undefined,
            items: dto.items,
            totalAmount: dto.totalAmount,
            discountAmount: dto.discountAmount ?? 0,
            couponCode: dto.couponCode,
            comment: dto.comment,
            paymentType: dto.paymentType,
            date: new Date(),
            status: 'Sent',
            userId: dto.userId,
            createdBy: dto.createdBy,
        });
        return serializeInvoice(doc.toObject());
    }

    async update(id: string, data: Partial<UpdateInvoiceInput> & { userId?: string }): Promise<InvoiceDTO | null> {
        await dbConnect();
        const updated = await InvoiceModel.findByIdAndUpdate(id, data, { returnDocument: 'after' }).lean();
        return updated ? serializeInvoice(updated) : null;
    }

    async updatePdfUrl(id: string, pdfUrl: string): Promise<boolean> {
        await dbConnect();
        const res = await InvoiceModel.findByIdAndUpdate(id, { pdfUrl }, { returnDocument: 'after' });
        return !!res;
    }

    async delete(id: string): Promise<boolean> {
        await dbConnect();
        const res = await InvoiceModel.findByIdAndDelete(id);
        return !!res;
    }

    async aggregateRevenue(userId: string): Promise<number> {
        await dbConnect();
        const result = await InvoiceModel.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]);
        return result[0]?.total ?? 0;
    }
}

// Singleton export — one instance per process
export const invoiceRepository = new InvoiceRepository();
