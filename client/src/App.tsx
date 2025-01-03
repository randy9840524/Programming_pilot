import { Switch, Route } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import HomePage from "./pages/HomePage";
import EditorPage from "./pages/EditorPage";
import PaymentPage from "./pages/PaymentPage";
import AuthPage from "./pages/AuthPage";
import { useUser } from "@/hooks/use-user";

function App() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // Show the auth page if user is not logged in and trying to access protected routes
  if (!user && window.location.pathname !== "/") {
    return <AuthPage />;
  }

  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/login" component={AuthPage} />
      <Route path="/editor" component={EditorPage} />
      <Route path="/payment" component={PaymentPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

// fallback 404 not found page
function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold">404 Page Not Found</h1>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            The page you're looking for doesn't exist.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;