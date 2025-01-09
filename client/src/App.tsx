import { Switch, Route } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import EditorPage from "./pages/EditorPage";
import NavigationBar from "./components/NavigationBar";

function App() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <NavigationBar />
      <main className="flex-1 overflow-auto pl-16 p-4"> {/* Added padding and proper overflow handling */}
        <div className="container mx-auto max-w-7xl h-full"> {/* Added container with max width */}
          <Switch>
            <Route path="/" component={EditorPage} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
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