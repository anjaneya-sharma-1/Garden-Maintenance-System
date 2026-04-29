import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import React from "react";

// Import pages
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import Garden from "@/pages/garden";
import GardenDetail from "@/pages/garden-detail";
import Knowledge from "@/pages/knowledge";
import KnowledgeDetail from "@/pages/knowledge-detail";
import Reminders from "@/pages/reminders";
import Reports from "@/pages/reports";
import Profile from "@/pages/profile";
import Admin from "@/pages/admin";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType<any>, adminOnly?: boolean }) {
  const { data: currentUser, isLoading } = useGetCurrentUser();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!isLoading) {
      if (!currentUser?.user) {
        setLocation("/login");
      } else if (adminOnly && currentUser.user.role !== "admin") {
        setLocation("/");
      }
    }
  }, [currentUser, isLoading, setLocation, adminOnly]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser?.user || (adminOnly && currentUser.user.role !== "admin")) return null;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      
      {/* Protected Routes */}
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/garden" component={() => <ProtectedRoute component={Garden} />} />
      <Route path="/garden/:id" component={() => <ProtectedRoute component={GardenDetail} />} />
      <Route path="/knowledge" component={() => <ProtectedRoute component={Knowledge} />} />
      <Route path="/knowledge/:id" component={() => <ProtectedRoute component={KnowledgeDetail} />} />
      <Route path="/reminders" component={() => <ProtectedRoute component={Reminders} />} />
      <Route path="/reports" component={() => <ProtectedRoute component={Reports} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/admin" component={() => <ProtectedRoute component={Admin} adminOnly={true} />} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
