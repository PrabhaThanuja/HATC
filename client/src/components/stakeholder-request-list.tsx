import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { useState } from "react";
import { Request } from "@shared/schema";

interface StakeholderRequestListProps {
  requests: Request[];
  onCancel: (id: number) => void;
  onAcceptAlternative: (requestId: number, suggestedBayId: number) => void;
}

export default function StakeholderRequestList({ 
  requests, 
  onCancel,
  onAcceptAlternative
}: StakeholderRequestListProps) {
  const [processingId, setProcessingId] = useState<number | null>(null);
  
  const handleCancel = async (requestId: number) => {
    setProcessingId(requestId);
    try {
      await onCancel(requestId);
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleAcceptAlternative = async (requestId: number, suggestedBayId: number) => {
    setProcessingId(requestId);
    try {
      await onAcceptAlternative(requestId, suggestedBayId);
    } finally {
      setProcessingId(null);
    }
  };
  
  if (requests.length === 0) {
    return (
      <div className="p-6 text-center bg-neutral-50 rounded-lg border border-neutral-200">
        <p className="text-neutral-600">No requests found</p>
      </div>
    );
  }
  
  // Helper to get badge classes for status
  const getStatusBadgeClass = (status: string | undefined) => {
    switch (status) {
      case 'pending':
        return "bg-amber-200 text-amber-900";
      case 'approved':
        return "bg-emerald-300 text-emerald-900";
      case 'denied':
        return "bg-rose-300 text-rose-900";
      default:
        return "bg-neutral-300 text-neutral-700";
    }
  };
  
  // Helper to get card classes for status
  const getCardClass = (status: string | undefined, hasSuggestion: boolean) => {
    if (hasSuggestion) return "bg-indigo-50 border-indigo-300";
    
    switch (status) {
      case 'pending':
        return "bg-amber-50 bg-opacity-30 border-amber-200";
      case 'approved':
        return "bg-emerald-50 border-emerald-300";
      case 'denied':
        return "bg-rose-50 border-rose-300";
      default:
        return "bg-neutral-100 border-neutral-300";
    }
  };
  
  return (
    <div className="space-y-4">
      {requests.map((request) => {
        const hasSuggestion = Boolean(request.suggestedBayId);
        
        return (
          <div 
            key={request.id}
            className={`border rounded-lg p-4 ${getCardClass(request.status, hasSuggestion)}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center">
                  <h3 className="font-bold text-lg">{request.flightCallsign}</h3>
                  <Badge className={`ml-2 ${getStatusBadgeClass(request.status || 'pending')}`}>
                    {request.status ? (request.status.charAt(0).toUpperCase() + request.status.slice(1)) : 'Pending'}
                  </Badge>
                </div>
                <p className="text-neutral-600">
                  {request.status === 'approved' 
                    ? `Assigned Bay: ${request.requestedBayId}` 
                    : `Requested Bay: ${request.requestedBayId}`}
                </p>
                <p className="text-sm text-neutral-500">
                  {request.status === 'pending' && 
                    `Requested at: ${new Date(request.requestedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                  {request.status && request.status !== 'pending' && request.respondedAt &&
                    `${request.status.charAt(0).toUpperCase() + request.status.slice(1)} at: ${new Date(request.respondedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                </p>
                {request.notes && (
                  <p className="text-sm text-neutral-700 mt-1 bg-neutral-50 p-2 rounded-md">
                    <span className="font-medium">Notes:</span> {request.notes}
                  </p>
                )}
              </div>
              
              {request.status === 'pending' && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-neutral-400 hover:text-danger" 
                  onClick={() => handleCancel(request.id)}
                  disabled={processingId === request.id}
                >
                  <Trash className="h-5 w-5" />
                  <span className="sr-only">Cancel request</span>
                </Button>
              )}
            </div>
            
            {request.responseNotes && (
              <div className="mt-2 p-2 bg-neutral-100 rounded-md text-sm border border-neutral-200">
                <p className="font-medium text-neutral-800">Notes from ATC:</p>
                <p className="text-neutral-700">{request.responseNotes}</p>
              </div>
            )}
            
            {request.suggestedBayId && (
              <div className="mt-2 p-2 bg-indigo-50 rounded text-sm border border-indigo-300">
                <p className="font-medium text-indigo-800">Alternative Suggestion:</p>
                <p className="text-indigo-700">Bay {request.requestedBayId} is unavailable. ATC suggests Bay {request.suggestedBayId} instead.</p>
                
                <div className="mt-2 flex space-x-2">
                  <Button 
                    size="sm" 
                    className="bg-indigo-300 hover:bg-indigo-400 text-indigo-900"
                    onClick={() => handleAcceptAlternative(request.id, request.suggestedBayId!)}
                    disabled={processingId === request.id}
                  >
                    Accept
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                    onClick={() => handleCancel(request.id)}
                    disabled={processingId === request.id}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
