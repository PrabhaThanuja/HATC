import { Switch, Route, useLocation, Redirect } from "wouter";
import { Suspense, lazy } from "react";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { LoaderPinwheel } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";

// Lazy-loaded components
const AtcDashboard = lazy(() => import("@/pages/atc-dashboard"));
const StakeholderDashboard = lazy(() => import("@/pages/stakeholder-dashboard"));
const AuthPage = lazy(() => import("@/pages/auth-page"));

function LoadingFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <LoaderPinwheel className="h-8 w-8 text-primary animate-spin" />
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  const [location] = useLocation();

  // Store user ID in localStorage so WebSocket notifications can access it
  if (user) {
    localStorage.setItem('userId', user.id.toString());
  }

  // Don't show header on auth page
  const showHeader = location !== "/auth";

  // Log the current location and user for debugging
  console.log("App location:", location, "User:", user?.role);

  return (
    <div className="flex flex-col min-h-screen">
      {showHeader && user && <Header user={user} />}
      
      <main className="flex-grow">
        <Suspense fallback={<LoadingFallback />}>
          <Switch>
            <Route path="/auth">
              {user ? <Redirect to="/" /> : <AuthPage />}
            </Route>
            
            <Route path="/">
              {!user ? (
                <Redirect to="/auth" />
              ) : user.role === "atc" ? (
                <AtcDashboard user={{
                  id: user.id,
                  username: user.username,
                  role: user.role,
                  displayName: user.displayName
                }} />
              ) : (
                <StakeholderDashboard user={{
                  id: user.id,
                  username: user.username,
                  role: user.role,
                  displayName: user.displayName
                }} />
              )}
            </Route>
            
            <Route>
              <NotFound />
            </Route>
          </Switch>
        </Suspense>
      </main>
      
      {showHeader && <Footer />}
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
