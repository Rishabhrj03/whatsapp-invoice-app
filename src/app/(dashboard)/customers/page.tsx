import dbConnect from "@/lib/mongoose";
import Customer from "@/models/Customer";
import CustomersClient from "@/components/CustomersClient";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
    await dbConnect();
    const session = await auth();
    if (!session?.user?.id) return null;

    const customers = await Customer.find({ userId: session.user.id }).lean().sort({ createdAt: -1 });

    // Serialize MongoDB objects
    const serializedCustomers = customers.map(c => ({
        ...c,
        _id: c._id.toString(),
        birthdayDate: (c.birthdayDate instanceof Date) ? c.birthdayDate.toISOString() : undefined,
        anniversaryDate: (c.anniversaryDate instanceof Date) ? c.anniversaryDate.toISOString() : undefined,
    }));

    return <CustomersClient initialCustomers={serializedCustomers} />;
}
