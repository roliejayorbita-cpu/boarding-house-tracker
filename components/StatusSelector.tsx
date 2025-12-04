"use client";

import { updateBillStatus } from "@/app/actions";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

export default function StatusSelector({
  billId,
  type,
  status,
}: {
  billId: string;
  type: string;
  status: string;
}) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [isPending, startTransition] = useTransition();

  const getColor = (s: string) => {
    if (s === "PAID")
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
    if (s === "PENDING")
      return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800";
    return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setCurrentStatus(newStatus); // Update UI instantly

    // Update Server in background
    startTransition(async () => {
      const formData = new FormData();
      formData.append("billId", billId);
      formData.append("itemType", type);
      formData.append("newStatus", newStatus);
      await updateBillStatus(formData);
    });
  };

  return (
    <div className="relative">
      <select
        value={currentStatus}
        onChange={handleChange}
        disabled={isPending}
        className={`appearance-none w-full cursor-pointer text-xs font-bold px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 transition-colors ${getColor(
          currentStatus
        )} ${isPending ? "opacity-50" : ""}`}
      >
        <option value="UNPAID">UNPAID</option>
        <option value="PENDING">PENDING</option>
        <option value="PAID">PAID</option>
      </select>

      {/* Loading Spinner overlay */}
      {isPending && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Loader2 className="animate-spin text-gray-500" size={12} />
        </div>
      )}
    </div>
  );
}
