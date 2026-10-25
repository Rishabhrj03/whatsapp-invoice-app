import dbConnect from "@/lib/mongoose";
import Customer from "@/models/Customer";
import CustomersClient from "@/components/CustomersClient";
import { auth } from "@/auth";
import { getEffectiveUserId } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
    await dbConnect();
    const session = await auth();
    const effectiveUserId = await getEffectiveUserId();
    if (!session?.user?.id || !effectiveUserId) return null;

    const resolvedSearchParams = await searchParams;
    const page = parseInt(resolvedSearchParams.page || "1", 10);
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = { userId: effectiveUserId };

    const [customers, total] = await Promise.all([
        Customer.find(query).lean().sort({ createdAt: -1 }).skip(skip).limit(limit),
        Customer.countDocuments(query)
    ]);

    // Serialize MongoDB objects
    const serializedCustomers = customers.map(c => ({
        ...c,
        _id: c._id.toString(),
        birthdayDate: (c.birthdayDate instanceof Date) ? c.birthdayDate.toISOString() : undefined,
        anniversaryDate: (c.anniversaryDate instanceof Date) ? c.anniversaryDate.toISOString() : undefined,
    }));

    return <CustomersClient
        initialCustomers={serializedCustomers}
        currentPage={page}
        totalPages={Math.ceil(total / limit) || 1}
    />;
}
