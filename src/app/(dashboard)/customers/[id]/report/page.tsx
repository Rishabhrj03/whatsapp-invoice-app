import { getCustomerReport } from "@/app/actions/invoice";
import CustomerReportClient from "@/components/CustomerReportClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CustomerReportPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const res = await getCustomerReport(id);

    if (!res.success || !res.customer) {
        notFound();
    }

    return (
        <CustomerReportClient
            customer={res.customer}
            invoices={res.invoices}
            totalSpend={res.totalSpend}
        />
    );
}
