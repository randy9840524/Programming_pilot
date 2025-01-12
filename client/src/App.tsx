import { Switch, Route } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import EditorPage from "./pages/EditorPage";
import NavigationBar from "./components/NavigationBar";
import { useCallback, useState } from "react";
import type { SelectProject } from "@db/schema";
import { useToast } from "@/hooks/use-toast";

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
  const [selectedProject, setSelectedProject] = useState<SelectProject | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleProjectSelect = useCallback(async (projectId: number | null) => {
    // If projectId is null, clear the selection
    if (!projectId) {
      setSelectedProject(null);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch project details
      const response = await fetch(`/api/projects/${projectId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const project = await response.json();
      setSelectedProject(project);
      toast({
        title: "Success",
        description: `Switched to project: ${project.name}`,
      });
    } catch (err: any) {
      console.error('Failed to fetch project:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to switch project",
        variant: "destructive",
      });
      setSelectedProject(null);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <NavigationBar />
      <main className="flex-1 overflow-auto pl-16 p-4">
        <div className="container mx-auto max-w-7xl h-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Switch>
              <Route 
                path="/" 
                component={() => (
                  <EditorPage 
                    selectedProject={selectedProject}
                    onProjectSelect={handleProjectSelect}
                  />
                )} 
              />
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
          )}
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