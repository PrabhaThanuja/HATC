import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bay, Request } from "@shared/schema";

interface AlternativeBayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (suggestedBayId: number, notes: string) => void;
  request: Request | null;
  availableBays: Bay[];
}

export default function AlternativeBayModal({
  isOpen,
  onClose,
  onSubmit,
  request,
  availableBays
}: AlternativeBayModalProps) {
  const [selectedBay, setSelectedBay] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  
  const handleClose = () => {
    setSelectedBay(null);
    setNotes("");
    onClose();
  };
  
  const handleSubmit = () => {
    if (selectedBay) {
      onSubmit(selectedBay, notes);
      setSelectedBay(null);
      setNotes("");
    }
  };
  
  if (!request) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Suggest Alternative Bay</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <p className="mb-4">
            Flight <span className="font-medium">{request.flightCallsign}</span> requested 
            Bay <span className="font-medium">{request.requestedBayId}</span>.
          </p>
          
          <div>
            <label className="block text-neutral-700 font-medium mb-2">Select Alternative Bay</label>
            <div className="grid grid-cols-4 gap-2">
              {availableBays.map((bay) => (
                <Button
                  key={bay.id}
                  variant="outline"
                  className={`p-3 border ${
                    selectedBay === bay.id 
                      ? "border-primary bg-primary bg-opacity-10" 
                      : "border-neutral-300 hover:border-primary hover:bg-primary-light hover:bg-opacity-10"
                  }`}
                  onClick={() => setSelectedBay(bay.id)}
                >
                  {bay.bayNumber}
                </Button>
              ))}
            </div>
          </div>
          
          <div>
            <label htmlFor="alt-notes" className="block text-neutral-700 font-medium mb-2">
              Notes (Optional)
            </label>
            <Textarea
              id="alt-notes"
              rows={2}
              placeholder="Explain why the alternative is suggested"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border border-neutral-300 rounded-md"
            />
          </div>
        </div>
        
        <DialogFooter className="flex justify-end space-x-2 mt-4">
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedBay}
          >
            Send Suggestion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
