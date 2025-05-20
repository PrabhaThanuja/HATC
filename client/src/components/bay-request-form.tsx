import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bay } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Send, AlertCircle } from "lucide-react";
import BayGrid from "@/components/bay-grid";

// Create schema for form validation
const requestSchema = z.object({
  flightCallsign: z.string().min(3, "Flight callsign must be at least 3 characters").max(8),
  requestedBayId: z.number({ required_error: "Please select a bay" }),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof requestSchema>;

interface BayRequestFormProps {
  availableBays: Bay[];
  allBays: Bay[];
  onSubmit: (data: FormValues) => void;
}

// BayGrid component is imported separately where needed

export default function BayRequestForm({ availableBays, allBays, onSubmit }: BayRequestFormProps) {
  const [selectedBay, setSelectedBay] = useState<number | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      flightCallsign: "",
      notes: "",
    },
  });
  
  const handleSubmit = (data: FormValues) => {
    // Call onSubmit with the form data
    onSubmit({
      ...data,
      requestedBayId: selectedBay!
    });
    
    // Reset form and selection state
    form.reset();
    setSelectedBay(null);
    
    // Update the bay status in the UI (handled by useMutation in the hook)
  };
  
  const selectBay = (bayId: number) => {
    setSelectedBay(bayId);
    form.setValue("requestedBayId", bayId);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="flightCallsign"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-neutral-700 font-medium">Flight Callsign</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g. BA1326" 
                  className="w-full p-3 border border-neutral-300 rounded-md" 
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="requestedBayId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-neutral-700 font-medium">Select Bay</FormLabel>
              <div className="mb-2">
                <p className="text-xs text-neutral-500">
                  <span className="inline-block w-3 h-3 bg-emerald-100 mr-1 rounded-sm"></span> Free
                  <span className="inline-block w-3 h-3 bg-rose-100 mr-1 ml-3 rounded-sm"></span> Occupied
                  <span className="inline-block w-3 h-3 bg-amber-100 mr-1 ml-3 rounded-sm"></span> Pending
                </p>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-[40vh] overflow-y-auto p-2">
                {/* Show all bays with their status colors */}
                {allBays
                  .sort((a, b) => a.bayNumber - b.bayNumber)
                  .map((bay) => {
                    // Determine if this bay is available for selection
                    const isAvailable = bay.status === 'free';
                    // Define bay status color classes
                    const getBayStatusClass = (status: string) => {
                      switch(status) {
                        case 'free': return 'bg-emerald-100 text-emerald-900 border-emerald-200 hover:bg-emerald-200';
                        case 'occupied': return 'bg-rose-100 text-rose-900 border-rose-200 cursor-not-allowed opacity-80';
                        case 'pending': return 'bg-amber-100 text-amber-900 border-amber-200 cursor-not-allowed opacity-80';
                        default: return 'bg-gray-100 text-gray-900 border-gray-200';
                      }
                    };
                    
                    // If this bay is selected, use a special class
                    const selectedClass = selectedBay === bay.id 
                      ? 'ring-2 ring-primary ring-offset-1 font-bold' 
                      : '';
                    
                    return (
                      <Button
                        key={bay.id}
                        type="button"
                        variant="outline"
                        className={`p-2 border ${getBayStatusClass(bay.status)} ${selectedClass}`}
                        onClick={() => isAvailable ? selectBay(bay.id) : null}
                        disabled={!isAvailable}
                      >
                        {bay.bayNumber}
                      </Button>
                    );
                  })
                }
              </div>
              
              <p className="text-sm text-neutral-500 mt-2">
                Only free bays can be selected for requests.
              </p>
              
              {form.formState.errors.requestedBayId && (
                <p className="text-sm font-medium text-destructive mt-1">
                  {form.formState.errors.requestedBayId.message}
                </p>
              )}
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-neutral-700 font-medium">Additional Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Any special requirements or information"
                  className="w-full p-3 border border-neutral-300 rounded-md" 
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            type="submit" 
            className="bg-primary text-white px-6 py-3 rounded-md text-lg font-medium hover:bg-primary-dark flex items-center justify-center w-full"
            disabled={form.formState.isSubmitting}
          >
            <Send className="mr-2 h-5 w-5" /> Submit Request
          </Button>
        </div>
      </form>
    </Form>
  );
}
