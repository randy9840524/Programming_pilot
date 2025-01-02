import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Copy, Code2 } from "lucide-react";
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

export default function CodeSnippetLibrary() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: snippets, isLoading } = useQuery<SelectSnippet[]>({
    queryKey: ["/api/snippets", searchQuery],
    enabled: true,
  });

  const filteredSnippets = snippets?.filter((snippet) =>
    snippet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    snippet.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (snippet.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ?? false)
  );

  const handleCopySnippet = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error("Failed to copy snippet:", err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b p-4">
        <h2 className="text-2xl font-semibold mb-4">Code Snippet Library</h2>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search snippets..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
              <Card key={snippet.id}>
                <CardHeader>
                  <CardTitle>{snippet.title}</CardTitle>
                  <CardDescription>{snippet.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-secondary p-4 rounded-md overflow-x-auto">
                    <code>{snippet.code}</code>
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
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCopySnippet(snippet.code)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
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