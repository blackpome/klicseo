import { redirect } from "next/navigation";

// The standalone Services page was folded into Booking → Step 1. Anyone landing
// here (stale tab, old bookmark) should end up on the booking admin page.
export default function ServicesRedirect() {
  redirect("/admin/booking");
}
