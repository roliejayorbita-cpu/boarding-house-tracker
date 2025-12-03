"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// HELPER: Converts empty strings "" to null so Database doesn't crash
function toNullable(value: string) {
  return value === "" ? null : value;
}

export async function createBillingCycle(formData: FormData) {
  const supabase = await createClient();

  const monthKey = formData.get("monthKey") as string;
  if (!monthKey) {
    console.error("❌ Error: No Month Selected");
    return;
  }

  const [year, month] = monthKey.split("-");
  const dateObj = new Date(parseInt(year), parseInt(month) - 1);
  const monthName = dateObj.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const FIXED_INTERNET_BILL = 2220;
  const TOTAL_RENT_BILL = 5000;
  const TOTAL_BOARDERS = 8;
  const TOTAL_INTERNET_USERS = 12;

  const elecInput = formData.get("electricity") as string;
  const waterInput = formData.get("water") as string;
  const elecTotal = elecInput ? parseFloat(elecInput) : 0;
  const waterTotal = waterInput ? parseFloat(waterInput) : 0;

  const rentShare = TOTAL_RENT_BILL / TOTAL_BOARDERS;
  const internetShare = FIXED_INTERNET_BILL / TOTAL_INTERNET_USERS;
  const elecShare = elecTotal / TOTAL_BOARDERS;
  const waterShare = waterTotal / TOTAL_BOARDERS;

  const internetDeadline = `${monthKey}-17`;
  const rentDeadline = toNullable(formData.get("rentDeadline") as string);
  const waterDeadline = toNullable(formData.get("waterDeadline") as string);
  const elecDeadline = toNullable(formData.get("elecDeadline") as string);

  // 5. FIND OR CREATE CYCLE
  const { data: existingCycle } = await supabase
    .from("billing_cycles")
    .select("id")
    .eq("month_key", monthKey)
    .maybeSingle();

  let cycleId = existingCycle?.id;

  if (cycleId) {
    // --- UPDATE EXISTING ---
    console.log(`🔄 Updating existing cycle: ${monthName}`);
    const updates: any = {};

    // Only update if the Admin actually typed something new
    if (elecTotal > 0) {
      updates.total_electricity = elecTotal;
      if (elecDeadline) updates.deadline_electricity = elecDeadline;
    }
    if (waterTotal > 0) {
      updates.total_water = waterTotal;
      if (waterDeadline) updates.deadline_water = waterDeadline;
    }

    // Only update Rent deadline if a new date was picked
    if (rentDeadline) {
      updates.deadline_rent = rentDeadline;
    }

    // Internet is always refreshed
    updates.total_internet = FIXED_INTERNET_BILL;
    updates.deadline_internet = internetDeadline;

    await supabase.from("billing_cycles").update(updates).eq("id", cycleId);
  } else {
    // --- CREATE NEW (Insert everything provided) ---
    console.log(`🆕 Creating new cycle: ${monthName}`);

    const { data: newCycle, error: insertError } = await supabase
      .from("billing_cycles")
      .insert({
        month_key: monthKey,
        month_name: monthName,
        total_electricity: elecTotal,
        total_water: waterTotal,
        total_internet: FIXED_INTERNET_BILL,
        deadline_rent: rentDeadline,
        deadline_water: waterDeadline,
        deadline_electricity: elecDeadline,
        deadline_internet: internetDeadline,
        is_published: true,
      })
      .select()
      .single();

    if (insertError || !newCycle) {
      console.error("❌ CRITICAL DB INSERT ERROR:", insertError);
      return;
    }
    cycleId = newCycle.id;
  }

  // 6. Manage Individual Bills
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .eq("bill_type", "FULL");

  if (!users) return;

  for (const user of users) {
    const { data: existingBill } = await supabase
      .from("individual_bills")
      .select("*")
      .eq("user_id", user.id)
      .eq("cycle_id", cycleId)
      .maybeSingle();

    if (existingBill) {
      // --- UPDATE BILL ---
      const updates: any = {};
      updates.amount_rent = rentShare;
      updates.amount_internet = internetShare;

      // Only update cost if total is provided
      if (elecTotal > 0) updates.amount_electricity = elecShare;
      if (waterTotal > 0) updates.amount_water = waterShare;

      // Calculate New Total
      // We carefully take the NEW value if provided, or fallback to OLD value in database
      const finalRent = updates.amount_rent;
      const finalNet = updates.amount_internet;
      const finalElec =
        elecTotal > 0 ? elecShare : existingBill.amount_electricity || 0;
      const finalWater =
        waterTotal > 0 ? waterShare : existingBill.amount_water || 0;

      updates.total_due = finalRent + finalNet + finalElec + finalWater;

      await supabase
        .from("individual_bills")
        .update(updates)
        .eq("id", existingBill.id);
    } else {
      // --- INSERT BILL ---
      await supabase.from("individual_bills").insert({
        user_id: user.id,
        cycle_id: cycleId,
        amount_rent: rentShare,
        amount_water: waterShare,
        amount_electricity: elecShare,
        amount_internet: internetShare,
        total_due: rentShare + waterShare + elecShare + internetShare,
        status_rent: "UNPAID",
        status_water: "UNPAID",
        status_electricity: "UNPAID",
        status_internet: "UNPAID",
      });
    }
  }

  revalidatePath("/");
}

// ... existing imports

export async function submitPayment(formData: FormData) {
  const supabase = await createClient();

  // 1. Get Form Data
  const billId = formData.get("billId") as string;
  const paymentMethod = formData.get("paymentMethod") as string;
  const file = formData.get("proof") as File | null;

  // 2. Prepare Update Data
  const updates: any = {
    status: "PENDING", // Moves from UNPAID -> PENDING (Admin must approve later)
    payment_method: paymentMethod,
  };

  // 3. Handle GCash Screenshot Upload
  if (paymentMethod === "GCASH" && file && file.size > 0) {
    // Create unique filename: user-timestamp.png
    const { data: userData } = await supabase.auth.getUser();
    const filename = `${userData.user?.id}-${Date.now()}`;

    const { data, error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(filename, file);

    if (uploadError) {
      console.error("Upload failed:", uploadError);
      return; // Stop if upload fails
    }

    // Get the Public URL so we can view it later
    const {
      data: { publicUrl },
    } = supabase.storage.from("receipts").getPublicUrl(filename);

    updates.proof_url = publicUrl;
  }

  // 4. Update the Bill in Database
  const { error } = await supabase
    .from("individual_bills")
    .update(updates)
    .eq("id", billId);

  if (error) {
    console.error("Update failed:", error);
    return;
  }

  revalidatePath("/my-bill");
  revalidatePath("/"); // Update admin dashboard too
}

export async function payItem(formData: FormData) {
  const supabase = await createClient();
  const billId = formData.get("billId");
  const itemType = formData.get("itemType"); // 'rent', 'water', 'electricity', 'internet'
  const method = formData.get("method"); // 'CASH' or 'GCASH'

  // Construct column names dynamically
  const statusCol = `status_${itemType}`;

  // Update that specific column to PENDING
  await supabase
    .from("individual_bills")
    .update({ [statusCol]: "PENDING" }) // You would add proof_url logic here later if needed
    .eq("id", billId);

  revalidatePath("/my-bill");
}

export async function verifyPayment(formData: FormData) {
  const supabase = await createClient();

  const billId = formData.get("billId") as string;
  const itemType = formData.get("itemType") as string; // 'rent', 'water', etc.
  const decision = formData.get("decision") as string; // 'APPROVE' or 'REJECT'

  // 1. Determine the new status
  const newStatus = decision === "APPROVE" ? "PAID" : "UNPAID";

  // 2. Construct the column name dynamically (e.g., status_rent)
  const statusCol = `status_${itemType}`;

  // 3. Update the Database
  const { error } = await supabase
    .from("individual_bills")
    .update({ [statusCol]: newStatus })
    .eq("id", billId);

  if (error) {
    console.error("Verification failed:", error);
    return;
  }

  revalidatePath("/");
}
