import { getAdvanceBookings } from "@/app/actions/booking";
import BookingsClient from "@/components/BookingsClient";

export default async function BookingsPage({ searchParams }: { searchParams: { page?: string, search?: string, status?: string } }) {
    const page = parseInt(searchParams.page || "1", 10);
    const search = searchParams.search || "";
    const status = searchParams.status || "Received";

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
