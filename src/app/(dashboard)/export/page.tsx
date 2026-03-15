import dbConnect from "@/lib/mongoose";
import Customer from "@/models/Customer";
import MenuEntry from "@/models/MenuEntry";
import Invoice from "@/models/Invoice";
import ExportClient from "@/components/ExportClient";
import { getEffectiveUserId } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
    await dbConnect();
    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) return null;

    const [customers, menuItems, invoices] = await Promise.all([
        Customer.find({ userId: effectiveUserId }).sort({ name: 1 }).lean(),
        MenuEntry.find({ userId: effectiveUserId }).sort({ name: 1 }).lean(),
        Invoice.find({ userId: effectiveUserId }).populate('customer').sort({ createdAt: -1 }).lean()
    ]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    Data Export
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                    Download your data in CSV format for backup or analysis.
                </p>
            </div>

            <ExportClient
                customers={JSON.parse(JSON.stringify(customers))}
                menuItems={JSON.parse(JSON.stringify(menuItems))}
                invoices={JSON.parse(JSON.stringify(invoices))}
            />
        </div>
    );
}
