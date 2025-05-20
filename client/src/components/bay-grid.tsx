import { Badge } from "@/components/ui/badge";
import { Bay } from "@shared/schema";
import { AlertCircle } from "lucide-react";

interface BayGridProps {
  bays: Bay[];
  onBayClick?: (bay: Bay) => void;
}

export default function BayGrid({ bays, onBayClick }: BayGridProps) {
  console.log("Bay Grid Component - Total bays received:", bays.length, bays);
  
  // Sort bays by bay number
  const sortedBays = [...bays].sort((a, b) => a.bayNumber - b.bayNumber);
  
  // Helper to get CSS classes for bay status
  const getBayStatusClasses = (status: string) => {
    switch (status) {
      case 'free':
        return "border-success bg-emerald-300 text-emerald-900"; // Light sage green for free bays
      case 'occupied': // We use 'occupied' in code but display as 'blocked' in the UI
        return "border-danger bg-rose-300 text-rose-900"; // Soft muted rose for blocked bays
      case 'pending':
        return "border-warning bg-amber-200 text-amber-900"; // Soft gold/amber for pending bays
      default:
        return "border-neutral-300 bg-neutral-100";
    }
  };
  
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 mb-6 max-h-[70vh] overflow-y-auto p-2">
        {sortedBays.map((bay) => (
          <div
            key={bay.id}
            className={`relative p-3 rounded-lg border-2 ${getBayStatusClasses(bay.status)} text-center cursor-pointer hover:brightness-110 shadow-md transition-all`}
            onClick={() => onBayClick && onBayClick(bay)}
          >
            {bay.status === 'pending' && (
              <AlertCircle className="absolute text-white text-xs right-1 top-1 h-4 w-4" />
            )}
            <span className="font-bold text-xl">{bay.bayNumber}</span>
            <div className="text-xs font-medium truncate">
              {bay.status === 'free' && 'Free'}
              {bay.status === 'occupied' && `Blocked: ${bay.currentFlight}`}
              {bay.status === 'pending' && 'Pending'}
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex space-x-4 items-center text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-emerald-300 border border-success rounded-sm mr-1"></div>
          <span>Free</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-rose-300 border border-danger rounded-sm mr-1"></div>
          <span>Blocked</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-amber-200 border border-warning rounded-sm mr-1"></div>
          <span>Pending</span>
        </div>
      </div>
    </>
  );
}
