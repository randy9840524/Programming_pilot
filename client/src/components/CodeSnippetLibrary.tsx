import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Copy, Code2, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SelectSnippet } from "@db/schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function CodeSnippetLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: snippets, isLoading } = useQuery<SelectSnippet[]>({
    queryKey: ["/api/snippets", searchQuery],
    enabled: true,
  });

  // AI-powered suggestion mutation
  const suggestMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: "",
          prompt: `Suggest code snippets related to: ${query}`,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to get AI suggestions");
      }
      return response.json();
    },
  });

  const handleGetSuggestions = async () => {
    if (!searchQuery.trim()) return;
    try {
      await suggestMutation.mutateAsync(searchQuery);
      toast({
        title: "AI Suggestions",
        description: "New suggestions have been added to the library",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI suggestions",
        variant: "destructive",
      });
    }
  };

  const filteredSnippets = snippets?.filter((snippet) =>
    snippet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    snippet.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (snippet.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ?? false)
  );

  const handleCopySnippet = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: "Copied!",
        description: "Code snippet copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy snippet",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b p-4">
        <h2 className="text-2xl font-semibold mb-4">Code Snippet Library</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search snippets..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGetSuggestions}
            disabled={suggestMutation.isPending}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI Suggest
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Code2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredSnippets?.map((snippet) => (
              <Card key={snippet.id} className="group">
                <CardHeader>
                  <CardTitle>{snippet.title}</CardTitle>
                  <CardDescription>{snippet.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-secondary p-4 rounded-md overflow-x-auto relative group">
                    <code>{snippet.code}</code>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopySnippet(snippet.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </pre>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex gap-2">
                    {snippet.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleCopySnippet(snippet.code)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Insert
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}