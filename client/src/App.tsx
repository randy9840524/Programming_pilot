import { Switch, Route } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import HomePage from "./pages/HomePage";
import EditorPage from "./pages/EditorPage";
import PaymentPage from "./pages/PaymentPage";

function App() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
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