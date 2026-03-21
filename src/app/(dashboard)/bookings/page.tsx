import { getAdvanceBookings } from "@/app/actions/booking";
import BookingsClient from "@/components/BookingsClient";

export default async function BookingsPage() {
    const response = await getAdvanceBookings();
    return <BookingsClient initialBookings={response.success ? response.bookings : []} />;
}
