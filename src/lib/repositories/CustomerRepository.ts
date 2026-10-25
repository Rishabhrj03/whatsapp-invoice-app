/**
 * CustomerRepository — Singleton Mongoose adapter for Customer entity.
 */
import dbConnect from '@/lib/mongoose';
import CustomerModel from '@/models/Customer';
import type { IRepository } from './IRepository';
import type { CustomerDTO, CreateCustomerInput } from '@/types/domain';

function serializeCustomer(doc: any): CustomerDTO {
    return {
        _id: doc._id.toString(),
        name: doc.name,
        phoneNumber: doc.phoneNumber,
        birthdayDate: doc.birthdayDate ?? undefined,
        anniversaryDate: doc.anniversaryDate ?? undefined,
        address: doc.address ?? undefined,
        userId: doc.userId?.toString(),
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    };
}

class CustomerRepository implements IRepository<CustomerDTO, CreateCustomerInput> {
    async findById(id: string): Promise<CustomerDTO | null> {
        await dbConnect();
        const doc = await CustomerModel.findById(id).lean();
        return doc ? serializeCustomer(doc) : null;
    }

    async findByIdForUser(id: string, userId: string): Promise<CustomerDTO | null> {
        await dbConnect();
        const doc = await CustomerModel.findOne({ _id: id, userId }).lean();
        return doc ? serializeCustomer(doc) : null;
    }

    async findAll(filter: Record<string, unknown> = {}): Promise<CustomerDTO[]> {
        await dbConnect();
        const docs = await CustomerModel.find(filter).sort({ name: 1 }).lean();
        return docs.map(serializeCustomer);
    }

    async findPaginated(
        filter: Record<string, unknown>,
        skip: number,
        limit: number,
    ): Promise<{ docs: CustomerDTO[]; total: number }> {
        await dbConnect();
        const [docs, total] = await Promise.all([
            CustomerModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            CustomerModel.countDocuments(filter),
        ]);
        return { docs: docs.map(serializeCustomer), total };
    }

    async create(dto: CreateCustomerInput & { userId: string; createdBy: string }): Promise<CustomerDTO> {
        await dbConnect();
        const doc = await CustomerModel.create(dto);
        return serializeCustomer(doc.toObject());
    }

    async update(id: string, data: Partial<CreateCustomerInput>): Promise<CustomerDTO | null> {
        await dbConnect();
        const doc = await CustomerModel.findByIdAndUpdate(id, data, { returnDocument: 'after' }).lean();
        return doc ? serializeCustomer(doc) : null;
    }

    async delete(id: string): Promise<boolean> {
        await dbConnect();
        const res = await CustomerModel.findByIdAndDelete(id);
        return !!res;
    }
}

export const customerRepository = new CustomerRepository();
