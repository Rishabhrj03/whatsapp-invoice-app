import dbConnect from "@/lib/mongoose";
import Customer from "@/models/Customer";
import CustomersClient from "@/components/CustomersClient";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: { page?: string } }) {
    await dbConnect();
    const session = await auth();
    if (!session?.user?.id) return null;

    const page = parseInt(searchParams.page || "1", 10);
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = { userId: session.user.id };

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
