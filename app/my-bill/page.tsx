import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import BillSelector from "@/components/BillSelector"; // Import the new component

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

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-24">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Bill</h1>
          <span className="text-xs text-gray-500">{user.email}</span>
        </div>

        {/* The Smart List Component */}
        <BillSelector bills={bills || []} />
      </div>
    </div>
  );
}
