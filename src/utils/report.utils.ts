import type { Billboard, Booking } from "@/types/billboard.types";
import type { PaymentTransaction } from "@/services/payment.service";

/**
 * Export analytics data as a CSV file download
 */
export const exportAnalyticsCSV = (
  billboards: Billboard[],
  bookings: Booking[],
  payments: PaymentTransaction[],
): void => {
  const rows: string[][] = [];

  // Section 1: Summary
  const totalRevenue = payments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);
  rows.push(["=== ANALYTICS SUMMARY ==="]);
  rows.push(["Total Billboards", `${billboards.length}`]);
  rows.push(["Total Bookings", `${bookings.length}`]);
  rows.push(["Total Revenue (NGN)", `${totalRevenue}`]);
  rows.push([
    "Active Bookings",
    `${bookings.filter((b) => b.status === "active").length}`,
  ]);
  rows.push([
    "Completed Bookings",
    `${bookings.filter((b) => b.status === "completed").length}`,
  ]);
  rows.push([]);

  // Section 2: Billboards
  rows.push(["=== BILLBOARD LISTINGS ==="]);
  rows.push([
    "Title",
    "Location",
    "Type",
    "Daily Price (NGN)",
    "Views",
    "Rating",
    "Status",
  ]);
  billboards.forEach((b) => {
    rows.push([
      b.title,
      `${b.location.address} - ${b.location.city} - ${b.location.state}`,
      b.type || b.category || "Unknown",
      `${b.pricing.daily || b.pricing.hourly || 0}`,
      `${b.views || 0}`,
      `${b.rating || 0}`,
      b.status,
    ]);
  });
  rows.push([]);

  // Section 3: Bookings
  rows.push(["=== BOOKINGS ==="]);
  rows.push([
    "Billboard",
    "Advertiser",
    "Start Date",
    "End Date",
    "Duration",
    "Amount (NGN)",
    "Status",
    "Payment",
  ]);
  bookings.forEach((b) => {
    const start =
      b.startDate instanceof Date ? b.startDate : new Date(b.startDate);
    const end = b.endDate instanceof Date ? b.endDate : new Date(b.endDate);
    rows.push([
      b.billboardTitle,
      b.advertiserName,
      start.toLocaleDateString(),
      end.toLocaleDateString(),
      `${b.duration}`,
      `${b.totalAmount}`,
      b.status,
      b.paymentStatus,
    ]);
  });
  rows.push([]);

  // Section 4: Payments
  rows.push(["=== PAYMENTS ==="]);
  rows.push(["Billboard", "Amount (NGN)", "Reference", "Status", "Date"]);
  payments.forEach((p) => {
    const date =
      p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt);
    rows.push([
      p.billboardTitle,
      `${p.amount}`,
      p.reference,
      p.status,
      date.toLocaleDateString(),
    ]);
  });

  // Convert to CSV string
  const csvContent = rows
    .map((row) =>
      row.map((cell) => `"${(cell || "").replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  // Trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `adspot-analytics-${new Date().toISOString().slice(0, 10)}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
