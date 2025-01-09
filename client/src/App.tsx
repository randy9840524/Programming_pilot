import { Switch, Route } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import EditorPage from "./pages/EditorPage";
import NavigationBar from "./components/NavigationBar";

// Placeholder components for new routes
function PromptPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Natural Language Prompt</h1>
      <p>Interact with AI using natural language.</p>
    </div>
  );
}

function PreviewPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Real-Time Preview</h1>
      <p>See your changes in real-time.</p>
    </div>
  );
}

function BackendPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Backend Development</h1>
      <p>Manage your backend services.</p>
    </div>
  );
}

function DeployPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">One-Click Website</h1>
      <p>Deploy your application instantly.</p>
    </div>
  );
}

function GitHubPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">GitHub Integration</h1>
      <p>Connect and manage your GitHub repositories.</p>
    </div>
  );
}

function HelpPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">AI-Assisted Help</h1>
      <p>Get intelligent assistance for your development needs.</p>
    </div>
  );
}

function CollabPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Collaboration</h1>
      <p>Work together with your team in real-time.</p>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <p>Configure your application preferences.</p>
    </div>
  );
}

function App() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <NavigationBar />
      <main className="flex-1 overflow-auto pl-16 p-4"> {/* Added padding and proper overflow handling */}
        <div className="container mx-auto max-w-7xl h-full"> {/* Added container with max width */}
          <Switch>
            <Route path="/" component={EditorPage} />
            <Route path="/prompt" component={PromptPage} />
            <Route path="/preview" component={PreviewPage} />
            <Route path="/backend" component={BackendPage} />
            <Route path="/deploy" component={DeployPage} />
            <Route path="/github" component={GitHubPage} />
            <Route path="/help" component={HelpPage} />
            <Route path="/collab" component={CollabPage} />
            <Route path="/settings" component={SettingsPage} />
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