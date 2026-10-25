import { getAdvanceBookings } from "@/app/actions/booking";
import BookingsClient from "@/components/BookingsClient";

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string; status?: string }> }) {
    const resolvedSearchParams = await searchParams;
    const page = parseInt(resolvedSearchParams.page || "1", 10);
    const search = resolvedSearchParams.search || "";
    const status = resolvedSearchParams.status || "Received";

    const response = await getAdvanceBookings({ page, limit: 10, search, status });
    return <BookingsClient
        initialBookings={response.success ? (response.bookings || []) : []}
        settings={response.success ? (response as any).settings : { hoursBefore: 4, frequencyMins: 30 }}
        currentPage={page}
        totalPages={response.success ? (response as any).totalPages : 1}
        initialSearch={search}
        initialStatus={status}
    />;
}
