export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-20">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center animate-pulse">
          <div className="h-8 w-32 bg-gray-300 rounded"></div>
          <div className="h-4 w-24 bg-gray-300 rounded"></div>
        </div>

        {/* Big Card Skeleton */}
        <div className="bg-gray-300 h-40 w-full rounded-2xl animate-pulse"></div>

        {/* List Skeleton */}
        <div className="space-y-4">
          <div className="bg-white h-24 w-full rounded-xl animate-pulse"></div>
          <div className="bg-white h-24 w-full rounded-xl animate-pulse"></div>
          <div className="bg-white h-24 w-full rounded-xl animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
