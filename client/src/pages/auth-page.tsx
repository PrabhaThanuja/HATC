import { useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Plane, Shield, LockKeyhole } from "lucide-react";

// Form validation schema
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(4, "Password must be at least 4 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation } = useAuth();
  const { toast } = useToast();

  // If user is already logged in, redirect to home page
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    try {
      await loginMutation.mutateAsync(data);
      
      // The toast and user storage is handled in the loginMutation in useAuth hook
      console.log("Login successful, redirecting...");
      
      // Immediately navigate to home page after successful login
      setLocation("/");
      
      // Force a full page reload to ensure clean state
      window.location.href = "/";
    } catch (error) {
      console.error("Login submission error:", error);
    }
  }

  return (
    <div className="flex flex-col min-h-[80vh] items-center">
      {/* Header with Hello ATC */}
      <div className="w-full mb-8 pt-8 text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="mr-4 p-3 bg-primary text-white rounded-full">
            <Plane className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Hello ATC
          </h1>
        </div>
        <Separator className="max-w-md mx-auto" />
      </div>
      
      {/* Login Form */}
      <div className="w-full max-w-md mx-auto px-4">
        <Card className="shadow-lg border-2 border-primary/10">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <LockKeyhole className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">Log in to your account</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials below to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  form.handleSubmit(onSubmit)(e);
                }} 
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your username" 
                          {...field} 
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const passwordField = document.querySelector('input[name="password"]') as HTMLInputElement;
                              if (passwordField) passwordField.focus();
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          {...field} 
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              form.handleSubmit(onSubmit)();
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Logging in..." : "Log in"}
                </Button>
              </form>
            </Form>
            
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <p>
                Demo accounts:<br />
                <span className="font-semibold">atc_user</span> / <span className="font-semibold">password</span> (ATC)<br />
                <span className="font-semibold">stakeholder</span> / <span className="font-semibold">password</span> (Airline)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}