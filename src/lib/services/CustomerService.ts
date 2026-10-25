/**
 * CustomerService — Business logic layer for Customers (Single Responsibility Principle).
 */
import { customerRepository } from '@/lib/repositories/CustomerRepository';
import { CreateCustomerSchema, CreateCustomerInput } from '@/lib/schemas';
import type { CustomerDTO } from '@/types/domain';

export class CustomerService {
    async createCustomer(rawInput: unknown, effectiveUserId: string, authUserId: string): Promise<{
        success: boolean;
        customer?: CustomerDTO;
        error?: string;
    }> {
        const parsed = CreateCustomerSchema.safeParse(rawInput);
        if (!parsed.success) {
            const firstIssue = parsed.error.issues[0]?.message || 'Invalid customer data';
            return { success: false, error: firstIssue };
        }

        const data: CreateCustomerInput = parsed.data;

        const customer = await customerRepository.create({
            ...data,
            userId: effectiveUserId,
            createdBy: authUserId,
        });

        return { success: true, customer };
    }

    async getCustomersPaginated(effectiveUserId: string, page: number = 1, limit: number = 10): Promise<{
        customers: CustomerDTO[];
        total: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;
        const { docs, total } = await customerRepository.findPaginated({ userId: effectiveUserId }, skip, limit);
        return {
            customers: docs,
            total,
            totalPages: Math.ceil(total / limit) || 1,
        };
    }

    async deleteCustomer(id: string, effectiveUserId: string): Promise<boolean> {
        const existing = await customerRepository.findByIdForUser(id, effectiveUserId);
        if (!existing) return false;
        return customerRepository.delete(id);
    }
}

export const customerService = new CustomerService();
