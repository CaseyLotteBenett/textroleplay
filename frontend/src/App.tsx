import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Admin from "@/pages/admin";
import Registration from "@/pages/registration";
import ChatList from "@/pages/chat-list";
import ChatRoom from "@/pages/chat-room-simple";
import CharacterEdit from "@/pages/character-edit";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { apiRequest } from "./lib/queryClient";

function Router() {
  const { user, isLoading } = useAuth();

  // Initialize test data on app start
  useEffect(() => {
    const initTestData = async () => {
      try {
        await apiRequest("POST", "/api/admin/init-test-data");
      } catch (error) {
        // Silently fail - test data might already exist
      }
    };
    initTestData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Načítání...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!user ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/registration" component={Registration} />
        </>
      ) : (
        <>
          <Route path="/" component={user.role === "admin" ? Admin : Home} />
          <Route path="/admin" component={Admin} />
          <Route path="/home" component={Home} />
          <Route path="/character/edit" component={CharacterEdit} />
          <Route path="/chat" component={ChatList} />
          <Route path="/chat/:roomId" component={ChatRoom} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
