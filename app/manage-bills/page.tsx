import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Calendar } from "lucide-react";
import StatusSelector from "@/components/StatusSelector";

export default async function ManageBills() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const { data: bills } = await supabase
    .from("individual_bills")
    .select(
      `
      *,
      profiles (full_name),
      billing_cycles (month_name)
    `
    )
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 sticky top-0 bg-gray-50 dark:bg-gray-900 py-2 z-10">
          <Link
            href="/"
            className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <ArrowLeft className="text-gray-600 dark:text-gray-300" size={20} />
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Manage All Bills
          </h1>
        </div>

        {/* --- VIEW 1: DESKTOP TABLE (Hidden on Mobile) --- */}
        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Month</th>
                  <th className="px-6 py-3">Boarder</th>
                  <th className="px-6 py-3 text-center w-32">Rent</th>
                  <th className="px-6 py-3 text-center w-32">Net</th>
                  <th className="px-6 py-3 text-center w-32">Elec</th>
                  <th className="px-6 py-3 text-center w-32">Water</th>
                </tr>
              </thead>
              <tbody>
                {bills?.map((bill) => (
                  <tr
                    key={bill.id}
                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {bill.billing_cycles?.month_name}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {bill.profiles?.full_name}
                    </td>
                    <td className="px-2 py-4">
                      <StatusSelector
                        billId={bill.id}
                        type="rent"
                        status={bill.status_rent}
                      />
                    </td>
                    <td className="px-2 py-4">
                      <StatusSelector
                        billId={bill.id}
                        type="internet"
                        status={bill.status_internet}
                      />
                    </td>
                    <td className="px-2 py-4">
                      <StatusSelector
                        billId={bill.id}
                        type="electricity"
                        status={bill.status_electricity}
                      />
                    </td>
                    <td className="px-2 py-4">
                      <StatusSelector
                        billId={bill.id}
                        type="water"
                        status={bill.status_water}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- VIEW 2: MOBILE CARDS (Hidden on Desktop) --- */}
        <div className="md:hidden space-y-4">
          {bills?.map((bill) => (
            <div
              key={bill.id}
              className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-blue-500" />
                  <span className="font-bold text-gray-900 dark:text-white">
                    {bill.profiles?.full_name}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  <Calendar size={12} />
                  <span>{bill.billing_cycles?.month_name}</span>
                </div>
              </div>

              {/* Card Grid (2 Columns) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    🏠 Rent
                  </span>
                  <StatusSelector
                    billId={bill.id}
                    type="rent"
                    status={bill.status_rent}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    🌐 Net
                  </span>
                  <StatusSelector
                    billId={bill.id}
                    type="internet"
                    status={bill.status_internet}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    ⚡ Elec
                  </span>
                  <StatusSelector
                    billId={bill.id}
                    type="electricity"
                    status={bill.status_electricity}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    💧 Water
                  </span>
                  <StatusSelector
                    billId={bill.id}
                    type="water"
                    status={bill.status_water}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
