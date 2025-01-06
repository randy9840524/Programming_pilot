import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Clock,
  Code2,
  FileText,
  History,
  Image as ImageIcon,
  Layers,
  RotateCcw,
  Save,
} from "lucide-react";
import type { SelectArtifact, SelectArtifactVersion } from "@db/schema";
import { useToast } from "@/hooks/use-toast";

interface ArtifactManagerProps {
  projectId: number;
}

export default function ArtifactManager({ projectId }: ArtifactManagerProps) {
  const [selectedArtifact, setSelectedArtifact] = useState<SelectArtifact | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const { data: artifacts, isLoading } = useQuery<SelectArtifact[]>({
    queryKey: ["/api/artifacts", projectId],
  });

  const { data: versions } = useQuery<SelectArtifactVersion[]>({
    queryKey: ["/api/artifacts", selectedArtifact?.id, "versions"],
    enabled: !!selectedArtifact,
  });

  const createArtifactMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      content: string;
      contentType: string;
    }) => {
      const response = await fetch("/api/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, projectId }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Artifact created successfully",
      });
      setIsCreating(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateArtifactMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      content: string;
      description: string;
    }) => {
      const response = await fetch(`/api/artifacts/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Artifact updated successfully",
      });
    },
  });

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case "code":
        return <Code2 className="h-4 w-4" />;
      case "image":
        return <ImageIcon className="h-4 w-4" />;
      case "markdown":
        return <FileText className="h-4 w-4" />;
      default:
        return <Layers className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading artifacts...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Artifacts</h2>
          <Button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2"
          >
            <Layers className="h-4 w-4" />
            New Artifact
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage and version your content artifacts
        </p>
      </div>

      <div className="flex-1 flex gap-4 p-4">
        <div className="w-1/3">
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-4">
              {artifacts?.map((artifact) => (
                <Card
                  key={artifact.id}
                  className={`cursor-pointer transition-colors hover:bg-accent ${
                    selectedArtifact?.id === artifact.id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedArtifact(artifact)}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center gap-2">
                      {getContentTypeIcon(artifact.contentType)}
                      <CardTitle className="text-base">{artifact.title}</CardTitle>
                    </div>
                    <CardDescription className="text-sm">
                      {artifact.description}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="p-4 pt-0 flex justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(artifact.updatedAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <History className="h-3 w-3" />
                      v{artifact.version}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1">
          {selectedArtifact ? (
            <Tabs defaultValue="content">
              <TabsList>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Edit Artifact</CardTitle>
                    <CardDescription>
                      Make changes to your artifact content
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      defaultValue={selectedArtifact.content}
                      className="min-h-[400px] font-mono"
                    />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Revert Changes
                    </Button>
                    <Button>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Version History</CardTitle>
                    <CardDescription>
                      View and restore previous versions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {versions?.map((version) => (
                          <Card key={version.id}>
                            <CardHeader className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <History className="h-4 w-4" />
                                  <CardTitle className="text-base">
                                    Version {version.version}
                                  </CardTitle>
                                </div>
                                <Button variant="outline" size="sm">
                                  Restore
                                </Button>
                              </div>
                              <CardDescription className="text-sm">
                                {version.description || "No description provided"}
                              </CardDescription>
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select an artifact to view or edit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
