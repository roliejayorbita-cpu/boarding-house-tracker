import { createClient } from "@/utils/supabase/server";
import { payItem } from "@/app/actions"; // Ensure you export this new function
import { redirect } from "next/navigation";
import { Wallet, Banknote, CheckCircle, Clock } from "lucide-react";

// ... helper formatCurrency ...
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);

const formatDate = (dateString: string) =>
  dateString
    ? new Date(dateString).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
      })
    : "Pending";

export default async function MyBillPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  // Fetch ALL bills (History)
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
    <div className="min-h-screen bg-gray-100 p-4 pb-20">
      <div className="max-w-md mx-auto space-y-6">
        {/* GRAND TOTAL HEADER */}
        <div className="bg-linear-to-r from-blue-900 to-blue-700 text-white p-6 rounded-2xl shadow-xl">
          <p className="text-blue-200 text-sm mb-1 uppercase tracking-wider">
            Total Pending Due
          </p>
          <h2 className="text-5xl font-bold">{formatCurrency(grandTotal)}</h2>
          {grandTotal === 0 && (
            <p className="mt-2 text-green-300 font-medium">All caught up! 🎉</p>
          )}
        </div>

        {/* MONTHLY LIST */}
        <div className="space-y-6">
          {bills?.map((bill) => (
            <div
              key={bill.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Month Header */}
              <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-lg">
                  {bill.billing_cycles?.month_name}
                </h3>
                <span className="text-xs text-gray-500">
                  Bill ID: {bill.id.slice(0, 4)}
                </span>
              </div>

              {/* Items List */}
              <div className="divide-y divide-gray-100">
                <BillItem
                  label="🏠 Rent"
                  amount={bill.amount_rent}
                  due={bill.billing_cycles?.deadline_rent}
                  status={bill.status_rent}
                  billId={bill.id}
                  type="rent"
                />
                <BillItem
                  label="🌐 Internet"
                  amount={bill.amount_internet}
                  due={bill.billing_cycles?.deadline_internet}
                  status={bill.status_internet}
                  billId={bill.id}
                  type="internet"
                />
                <BillItem
                  label="⚡ Electricity"
                  amount={bill.amount_electricity}
                  due={bill.billing_cycles?.deadline_electricity}
                  status={bill.status_electricity}
                  billId={bill.id}
                  type="electricity"
                />
                <BillItem
                  label="💧 Water"
                  amount={bill.amount_water}
                  due={bill.billing_cycles?.deadline_water}
                  status={bill.status_water}
                  billId={bill.id}
                  type="water"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Sub-Component for Clean Code
function BillItem({ label, amount, due, status, billId, type }: any) {
  if (amount === 0) return null; // Hide if not billed yet (e.g. Water bill hasn't arrived)

  const isPaid = status === "PAID";
  const isPending = status === "PENDING";

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div>
          <span className="block font-medium text-gray-900">{label}</span>
          <span
            className={`text-xs ${isPaid ? "text-green-600" : "text-red-500"}`}
          >
            {isPaid ? "Paid on time" : `Due: ${formatDate(due)}`}
          </span>
        </div>
        <div className="text-right">
          <span className="block font-mono text-gray-700">
            {formatCurrency(amount)}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isPaid
                ? "bg-green-100 text-green-700"
                : isPending
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {status}
          </span>
        </div>
      </div>

      {/* Pay Buttons (Only show if UNPAID) */}
      {status === "UNPAID" && (
        <div className="flex gap-2 mt-1">
          <form action={payItem} className="flex-1">
            <input type="hidden" name="billId" value={billId} />
            <input type="hidden" name="itemType" value={type} />
            <input type="hidden" name="method" value="GCASH" />
            <button className="w-full flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded hover:bg-blue-100">
              <Wallet size={14} /> GCash
            </button>
          </form>
          <form action={payItem} className="flex-1">
            <input type="hidden" name="billId" value={billId} />
            <input type="hidden" name="itemType" value={type} />
            <input type="hidden" name="method" value="CASH" />
            <button className="w-full flex items-center justify-center gap-2 py-2 bg-green-50 text-green-700 text-xs font-bold rounded hover:bg-green-100">
              <Banknote size={14} /> Cash
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
