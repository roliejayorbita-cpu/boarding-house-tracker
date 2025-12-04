import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import BillSelector from "@/components/BillSelector";

// Helper to format currency
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);

export default async function MyBillPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  // Fetch ALL bills
  const { data: bills } = await supabase
    .from("individual_bills")
    .select(`*, billing_cycles (*)`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Calculate Grand Total (Only count items that are UNPAID)
  let grandTotal = 0;
  bills?.forEach((bill) => {
    if (bill.status_rent === "UNPAID") grandTotal += bill.amount_rent;
    if (bill.status_water === "UNPAID") grandTotal += bill.amount_water;
    if (bill.status_electricity === "UNPAID")
      grandTotal += bill.amount_electricity;
    if (bill.status_internet === "UNPAID") grandTotal += bill.amount_internet;
  });

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 pb-24">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Bill
          </h1>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {user.email}
          </span>
        </div>

        {/* GRAND TOTAL HEADER */}
        {/* We keep the blue gradient because it looks good in both modes, but added a dark shadow */}
        <div className="bg-linear-to-r from-blue-900 to-blue-700 text-white p-6 rounded-2xl shadow-xl dark:shadow-blue-900/20">
          <p className="text-blue-200 text-sm mb-1 uppercase tracking-wider">
            Total Pending Due
          </p>
          <h2 className="text-5xl font-bold">{formatCurrency(grandTotal)}</h2>
          {grandTotal === 0 && (
            <p className="mt-2 text-green-300 font-medium">All caught up! 🎉</p>
          )}
        </div>

        {/* The Smart List Component */}
        {/* This component handles its own dark mode internally (which we did in the previous step) */}
        <BillSelector bills={bills || []} />
      </div>
    </div>
  );
}
