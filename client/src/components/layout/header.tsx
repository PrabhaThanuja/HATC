import { PersonStanding, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface HeaderProps {
  user: {
    displayName: string;
  };
}

export default function Header({ user }: HeaderProps) {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
    // Clear local storage
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
    // Redirect to login page
    setLocation("/auth");
    // Force reload to clear any cached state
    window.location.href = "/auth";
  };

  return (
    <header className="bg-primary text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">ATC Bay Management System</h1>
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            className="text-white hover:text-white/80 hover:bg-primary-dark mr-2"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-1" /> 
            <span className="hidden sm:inline">Logout</span>
          </Button>
          <div className="relative ml-2 flex items-center">
            <div className="flex items-center space-x-2">
              <span className="hidden md:inline-block">{user.displayName}</span>
              <div className="w-10 h-10 rounded-full bg-primary-dark flex items-center justify-center">
                <PersonStanding className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
