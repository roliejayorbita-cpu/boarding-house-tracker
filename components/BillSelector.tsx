"use client";

import { useState } from "react";
import { submitBulkPayment } from "@/app/actions";
import { Wallet, Banknote, Copy, CheckCircle } from "lucide-react";

// Helper to format currency
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);

// Helper to copy number
function CopyNumber({ number }: { number: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      type="button"
      className="flex items-center gap-1 text-xs bg-gray-100 border border-gray-300 px-2 py-1 rounded hover:bg-gray-200 transition"
    >
      <Copy size={12} /> {copied ? "Copied" : number}
    </button>
  );
}

export default function BillSelector({ bills }: { bills: any[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState<"NONE" | "CASH" | "GCASH">("NONE");

  // --- NEW: Wrapper to handle closing the modal ---
  const handlePaymentSubmit = async (formData: FormData) => {
    // 1. Close the modal immediately so it doesn't get stuck
    setShowModal("NONE");
    // 2. Clear selection (Optional: makes it feel cleaner)
    setSelected(new Set());
    // 3. Send data to server
    await submitBulkPayment(formData);
  };

  // 1. Calculate Total
  const selectedTotal = Array.from(selected).reduce((sum, key) => {
    const [id, type] = key.split("|");
    const bill = bills.find((b) => b.id === id);
    if (!bill) return sum;

    if (type === "rent") return sum + bill.amount_rent;
    if (type === "water") return sum + bill.amount_water;
    if (type === "electricity") return sum + bill.amount_electricity;
    if (type === "internet") return sum + bill.amount_internet;
    return sum;
  }, 0);

  // 2. Toggle Checkbox
  const toggleItem = (billId: string, type: string) => {
    const key = `${billId}|${type}`;
    const newSet = new Set(selected);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setSelected(newSet);
  };

  // 3. Prepare JSON
  const getItemsForSubmission = () => {
    return JSON.stringify(
      Array.from(selected).map((key) => {
        const [billId, type] = key.split("|");
        return { billId, type };
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* --- LIST OF BILLS --- */}
      {bills.map((bill) => (
        <div
          key={bill.id}
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <div className="bg-gray-50 p-3 border-b border-gray-100 flex justify-between">
            <span className="font-bold text-gray-700">
              {bill.billing_cycles?.month_name}
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            <SelectableRow
              label="🏠 Rent"
              amount={bill.amount_rent}
              status={bill.status_rent}
              isChecked={selected.has(`${bill.id}|rent`)}
              onToggle={() => toggleItem(bill.id, "rent")}
            />
            <SelectableRow
              label="🌐 Internet"
              amount={bill.amount_internet}
              status={bill.status_internet}
              isChecked={selected.has(`${bill.id}|internet`)}
              onToggle={() => toggleItem(bill.id, "internet")}
            />
            <SelectableRow
              label="⚡ Electricity"
              amount={bill.amount_electricity}
              status={bill.status_electricity}
              isChecked={selected.has(`${bill.id}|electricity`)}
              onToggle={() => toggleItem(bill.id, "electricity")}
            />
            <SelectableRow
              label="💧 Water"
              amount={bill.amount_water}
              status={bill.status_water}
              isChecked={selected.has(`${bill.id}|water`)}
              onToggle={() => toggleItem(bill.id, "water")}
            />
          </div>
        </div>
      ))}

      {/* --- FLOATING BOTTOM BAR --- */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-5 z-40">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Total Selected</p>
              <p className="text-xl font-bold text-blue-900">
                {formatCurrency(selectedTotal)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowModal("GCASH")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700"
              >
                <Wallet size={18} /> Pay
              </button>
              <button
                onClick={() => setShowModal("CASH")}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700"
              >
                <Banknote size={18} /> Cash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CASH MODAL --- */}
      {showModal === "CASH" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          {/* UPDATED: Action points to handlePaymentSubmit instead of submitBulkPayment directly */}
          <form
            action={handlePaymentSubmit}
            className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4"
          >
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-green-600">
                <Banknote size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Confirm Cash Payment
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                You are paying{" "}
                <span className="font-bold text-black">
                  {formatCurrency(selectedTotal)}
                </span>{" "}
                in cash.
              </p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg text-xs text-yellow-800 border border-yellow-200">
              ⚠️ Ensure you physically hand the cash to the Admin.
            </div>
            <input type="hidden" name="items" value={getItemsForSubmission()} />
            <input type="hidden" name="method" value="CASH" />
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal("NONE")}
                className="flex-1 py-3 text-gray-600 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700"
              >
                I Handed the Cash
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- GCASH MODAL --- */}
      {showModal === "GCASH" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          {/* UPDATED: Action points to handlePaymentSubmit */}
          <form
            action={handlePaymentSubmit}
            className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold text-gray-900">Pay via GCash</h3>
              <button
                type="button"
                onClick={() => setShowModal("NONE")}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* QR Section */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
              <p className="text-xs text-gray-500 mb-2">Scan or Send to:</p>
              <div className="flex justify-center mb-3">
                <div className="w-32 h-32 bg-white border flex items-center justify-center text-gray-300 text-xs">
                  <img
                    src="/my-qr.jpeg"
                    alt="Admin GCash QR"
                    className="w-32 h-32 object-contain mx-auto"
                  />
                </div>
              </div>
              <div className="flex justify-center">
                <CopyNumber number="09215226070" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">Total Amount to Send</p>
              <p className="text-3xl font-bold text-blue-600">
                {formatCurrency(selectedTotal)}
              </p>
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Upload Receipt
                </label>
                <input
                  type="file"
                  name="proof"
                  required
                  accept="image/*"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>

            <input type="hidden" name="items" value={getItemsForSubmission()} />
            <input type="hidden" name="method" value="GCASH" />

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 mt-2"
            >
              Submit Payment
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function SelectableRow({ label, amount, status, isChecked, onToggle }: any) {
  if (amount === 0) return null;
  const isPaid = status === "PAID";
  const isPending = status === "PENDING";

  if (isPaid || isPending) {
    return (
      <div className="p-3 flex justify-between items-center opacity-60">
        <div>
          <span className="block font-medium text-gray-900">{label}</span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isPaid
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {status}
          </span>
        </div>
        <span className="font-mono text-gray-600">
          {formatCurrency(amount)}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onToggle}
      className={`p-3 flex justify-between items-center cursor-pointer transition-colors ${
        isChecked ? "bg-blue-50" : "hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
            isChecked
              ? "bg-blue-600 border-blue-600"
              : "border-gray-300 bg-white"
          }`}
        >
          {isChecked && <CheckCircle size={14} className="text-white" />}
        </div>
        <span className="font-medium text-gray-900">{label}</span>
      </div>
      <span className="font-mono text-gray-800 font-semibold">
        {formatCurrency(amount)}
      </span>
    </div>
  );
}
