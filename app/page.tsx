import { createClient } from "@/utils/supabase/server";
import { createBillingCycle, verifyPayment } from "./actions";
import { redirect } from "next/navigation";
import { CheckCircle, XCircle, Clock } from "lucide-react";

// --- HELPER FUNCTIONS ---
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  if (!dateString) return "Pending";
  return new Date(dateString).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
};

// --- MAIN COMPONENT ---
export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Security Check
  if (!user) return redirect("/login");

  // REPLACE THIS WITH YOUR ACTUAL ADMIN EMAIL
  const ADMIN_EMAIL = "roliejayorbita@gmail.com";

  // If the logged-in user is NOT you, kick them to the Boarder Page
  if (user.email !== ADMIN_EMAIL) {
    return redirect("/my-bill");
  }

  // 2. Fetch History (All Cycles)
  const { data: history } = await supabase
    .from("billing_cycles")
    .select("*")
    .order("created_at", { ascending: false });

  // 3. Fetch Pending Approvals (The Inbox)
  const { data: pendingBills } = await supabase
    .from("individual_bills")
    .select(
      `
      *,
      profiles (full_name, room_number),
      billing_cycles (month_name)
    `
    )
    .or(
      "status_rent.eq.PENDING,status_water.eq.PENDING,status_electricity.eq.PENDING,status_internet.eq.PENDING"
    )
    .order("created_at", { ascending: true });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <span className="text-sm text-gray-500">{user.email}</span>
          </div>
        </div>

        {/* --- SECTION A: PAYMENT APPROVAL QUEUE --- */}
        {pendingBills && pendingBills.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-yellow-400">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="text-yellow-600" />
              <h2 className="text-xl font-bold text-gray-800">
                Pending Approvals ({pendingBills.length})
              </h2>
            </div>

            <div className="grid gap-4">
              {pendingBills.map((bill) => (
                <div
                  key={bill.id}
                  className="bg-yellow-50 p-4 rounded-lg border border-yellow-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-gray-900">
                        {bill.profiles?.full_name} ({bill.profiles?.room_number}
                        )
                      </p>
                      <p className="text-sm text-gray-600">
                        {bill.billing_cycles?.month_name}
                      </p>
                    </div>
                    <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded font-bold">
                      Action Required
                    </span>
                  </div>

                  <div className="space-y-2">
                    <ApprovalItem
                      label="Rent"
                      amount={bill.amount_rent}
                      status={bill.status_rent}
                      proofUrl={bill.proof_rent}
                      type="rent"
                      billId={bill.id}
                    />
                    <ApprovalItem
                      label="Internet"
                      amount={bill.amount_internet}
                      status={bill.status_internet}
                      proofUrl={bill.proof_internet}
                      type="internet"
                      billId={bill.id}
                    />
                    <ApprovalItem
                      label="Electricity"
                      amount={bill.amount_electricity}
                      status={bill.status_electricity}
                      proofUrl={bill.proof_electricity}
                      type="electricity"
                      billId={bill.id}
                    />
                    <ApprovalItem
                      label="Water"
                      amount={bill.amount_water}
                      status={bill.status_water}
                      proofUrl={bill.proof_water} // <--- Pass this
                      type="water"
                      billId={bill.id}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- SECTION B: CREATE / UPDATE BILL FORM --- */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Create / Update Monthly Bill
          </h2>

          <form action={createBillingCycle} className="space-y-6">
            {/* Month Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Select Month
              </label>
              <input
                name="monthKey"
                type="month"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Select an existing month to update it, or a new month to create
                it.
              </p>
            </div>

            {/* Expenses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* RENT */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <h3 className="font-semibold text-gray-700 mb-2">
                  🏠 Rent (Fixed ₱5k)
                </h3>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Rent Due Date
                </label>
                <input
                  name="rentDeadline"
                  type="date"
                  className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                />
              </div>

              {/* INTERNET */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 opacity-70">
                <h3 className="font-semibold text-gray-700 mb-2">
                  🌐 Internet (Fixed)
                </h3>
                <input
                  type="text"
                  value="₱2,220.00"
                  disabled
                  className="block w-full bg-gray-100 border-gray-300 rounded text-sm px-3 py-1.5 text-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Due Date: Always 17th
                </p>
              </div>

              {/* ELECTRICITY */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <h3 className="font-semibold text-gray-700 mb-2">
                  ⚡ Electricity
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">
                      Total Bill (₱)
                    </label>
                    <input
                      name="electricity"
                      type="number"
                      step="0.01"
                      className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">
                      Due Date
                    </label>
                    <input
                      name="elecDeadline"
                      type="date"
                      className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* WATER */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <h3 className="font-semibold text-gray-700 mb-2">💧 Water</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">
                      Total Bill (₱)
                    </label>
                    <input
                      name="water"
                      type="number"
                      step="0.01"
                      className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">
                      Due Date
                    </label>
                    <input
                      name="waterDeadline"
                      type="date"
                      className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-bold shadow-sm transition-all"
              >
                Publish / Update Bill
              </button>
            </div>
          </form>
        </div>

        {/* --- SECTION C: HISTORY --- */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Billing History
          </h2>
          {history?.map((cycle) => (
            <div
              key={cycle.id}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-xl text-gray-900">
                  {cycle.month_name}
                </h3>
                <span className="px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full">
                  PUBLISHED
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                  <span className="block text-orange-800 font-semibold mb-1">
                    🏠 Rent
                  </span>
                  <div className="text-gray-600">₱625.00</div>
                  <div className="text-xs text-orange-600 font-medium mt-1">
                    Due: {formatDate(cycle.deadline_rent)}
                  </div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                  <span className="block text-yellow-800 font-semibold mb-1">
                    ⚡ Elec
                  </span>
                  <div className="text-gray-600">
                    {formatCurrency(cycle.total_electricity / 8)}
                  </div>
                  <div className="text-xs text-yellow-600 font-medium mt-1">
                    Due: {formatDate(cycle.deadline_electricity)}
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <span className="block text-blue-800 font-semibold mb-1">
                    💧 Water
                  </span>
                  <div className="text-gray-600">
                    {formatCurrency(cycle.total_water / 8)}
                  </div>
                  <div className="text-xs text-blue-600 font-medium mt-1">
                    Due: {formatDate(cycle.deadline_water)}
                  </div>
                </div>
                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                  <span className="block text-indigo-800 font-semibold mb-1">
                    🌐 Net
                  </span>
                  <div className="text-gray-600">
                    {formatCurrency(cycle.total_internet / 12)}
                  </div>
                  <div className="text-xs text-indigo-600 font-medium mt-1">
                    Due: {formatDate(cycle.deadline_internet)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT FOR CLEAN LOGIC ---
function ApprovalItem({ label, amount, status, type, billId, proofUrl }: any) {
  if (status !== "PENDING") return null;

  return (
    <div className="flex justify-between items-center bg-white p-3 rounded shadow-sm">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">{formatCurrency(amount)}</span>

        {/* VIEW RECEIPT BUTTON */}
        {proofUrl ? (
          <a
            href={proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold hover:bg-blue-200 underline"
          >
            View Receipt
          </a>
        ) : (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
            Cash / No Img
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <form action={verifyPayment}>
          <input type="hidden" name="billId" value={billId} />
          <input type="hidden" name="itemType" value={type} />
          <input type="hidden" name="decision" value="APPROVE" />
          <button
            type="submit"
            className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"
            title="Approve"
          >
            <CheckCircle size={18} />
          </button>
        </form>

        <form action={verifyPayment}>
          <input type="hidden" name="billId" value={billId} />
          <input type="hidden" name="itemType" value={type} />
          <input type="hidden" name="decision" value="REJECT" />
          <button
            type="submit"
            className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
            title="Reject"
          >
            <XCircle size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
