import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Shuffle } from "lucide-react";
import { useState } from "react";
import { Request } from "@shared/schema";

interface RequestListProps {
  requests: Request[];
  onApprove: (id: number) => void;
  onDeny: (id: number) => void;
  onSuggestAlternative: (request: Request) => void;
}

export default function RequestList({ 
  requests, 
  onApprove, 
  onDeny, 
  onSuggestAlternative
}: RequestListProps) {
  const [processingId, setProcessingId] = useState<number | null>(null);
  
  // Track the state of actions for each request
  const [actionStates, setActionStates] = useState<Record<number, { action: string; completed: boolean }>>({});
  
  const handleAction = async (action: 'approve' | 'deny' | 'suggest', request: Request) => {
    setProcessingId(request.id);
    
    // Set the action as in-progress
    setActionStates(prev => ({
      ...prev,
      [request.id]: { action, completed: false }
    }));
    
    try {
      if (action === 'approve') {
        await onApprove(request.id);
      } else if (action === 'deny') {
        await onDeny(request.id);
      } else if (action === 'suggest') {
        onSuggestAlternative(request);
      }
      
      // Mark the action as completed
      setActionStates(prev => ({
        ...prev,
        [request.id]: { action, completed: true }
      }));
    } finally {
      setProcessingId(null);
    }
  };
  
  if (requests.length === 0) {
    return (
      <div className="p-6 text-center bg-neutral-50 rounded-lg border border-neutral-200">
        <p className="text-neutral-600">No pending requests</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {requests.map((request) => {
        // Get the current action state for this request
        const actionState = actionStates[request.id];
        
        // Determine styling based on action state
        let containerClasses = "border rounded-lg p-4 ";
        let badgeClasses = "";
        let badgeText = "Pending";
        
        if (actionState && actionState.completed) {
          if (actionState.action === 'approve') {
            containerClasses += "bg-emerald-50 border-emerald-300";
            badgeClasses = "bg-emerald-300 text-emerald-900";
            badgeText = "Approved";
          } else if (actionState.action === 'deny') {
            containerClasses += "bg-rose-50 border-rose-300";
            badgeClasses = "bg-rose-300 text-rose-900";
            badgeText = "Denied";
          } else if (actionState.action === 'suggest') {
            containerClasses += "bg-indigo-50 border-indigo-300";
            badgeClasses = "bg-indigo-300 text-indigo-900";
            badgeText = "Alternative Suggested";
          }
        } else {
          containerClasses += "bg-amber-50 bg-opacity-30 border-amber-200";
          badgeClasses = "bg-amber-200 text-amber-900";
        }
        
        return (
          <div 
            key={request.id}
            className={containerClasses}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-lg">{request.flightCallsign}</h3>
                <p className="text-neutral-600">Requested Bay: <span className="font-medium">{request.requestedBayId}</span></p>
                <p className="text-sm text-neutral-500">
                  Requested at: {new Date(request.requestedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </p>
                {request.notes && (
                  <p className="text-sm text-neutral-600 mt-1">Notes: {request.notes}</p>
                )}
              </div>
              <Badge className={badgeClasses}>{badgeText}</Badge>
            </div>
            
            <div className="flex mt-3 space-x-2">
              <Button 
                className="flex-1 flex items-center justify-center bg-emerald-300 hover:bg-emerald-400 text-emerald-900"
                onClick={() => handleAction('approve', request)}
                disabled={processingId === request.id}
              >
                <Check className="mr-1 h-4 w-4" /> Approve
              </Button>
              
              <Button 
                className="flex-1 flex items-center justify-center bg-rose-300 hover:bg-rose-400 text-rose-900"
                onClick={() => handleAction('deny', request)}
                disabled={processingId === request.id}
              >
                <X className="mr-1 h-4 w-4" /> Deny
              </Button>
              
              <Button 
                className="flex items-center justify-center bg-indigo-300 hover:bg-indigo-400 text-indigo-900"
                onClick={() => handleAction('suggest', request)}
                disabled={processingId === request.id}
              >
                <Shuffle className="h-4 w-4" />
                <span className="sr-only md:not-sr-only md:ml-1">Suggest Alternative</span>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
