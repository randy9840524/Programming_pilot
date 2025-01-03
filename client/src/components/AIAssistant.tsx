import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIAssistantProps {
  file: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

export default function AIAssistant({ file }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!input.trim() || !file) {
      toast({
        title: "Error",
        description: file ? "Please enter a question" : "Please select a file first",
        variant: "destructive",
      });
      return;
    }

    const question = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: question }]);
    setIsLoading(true);

    try {
      // First fetch the file content
      const fileResponse = await fetch(`/api/files/${encodeURIComponent(file)}`, {
        credentials: 'include'
      });

      if (!fileResponse.ok) {
        throw new Error(`Failed to load file: ${await fileResponse.text()}`);
      }

      const fileData = await fileResponse.json();
      if (!fileData.content) {
        throw new Error("File content is empty");
      }

      // Send for analysis
      const prompt = `${question}\n\nHere's the code:\n\`\`\`\n${fileData.content}\n\`\`\``;

      const analysisResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
        credentials: 'include'
      });

      const data = await analysisResponse.json();

      if (!analysisResponse.ok) {
        throw new Error(data.message || data.error || "Analysis failed");
      }

      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: data.response 
      }]);
    } catch (error: any) {
      console.error("AI request failed:", error);
      const errorMessage = error.message || "Failed to get AI response";

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: `Error: ${errorMessage}`,
        error: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background border-l">
      <div className="border-b p-4">
        <h2 className="text-xl font-semibold mb-2">AI Assistant</h2>
        <p className="text-sm text-muted-foreground">
          Ask questions about your code and get intelligent responses
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, i) => (
            <div
              key={i}
              className={`flex ${
                message.role === "assistant" ? "justify-start" : "justify-end"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "assistant"
                    ? message.error 
                      ? "bg-destructive/10 text-destructive" 
                      : "bg-secondary text-secondary-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                <pre className="whitespace-pre-wrap break-words text-sm">
                  {message.content}
                </pre>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">Welcome to AI Assistant!</p>
              <p>Start by asking a question about your code.</p>
              <p className="text-sm mt-4">Examples:</p>
              <ul className="text-sm mt-1 space-y-1">
                <li>"What does this code do?"</li>
                <li>"How can I improve this function?"</li>
                <li>"Is there a bug in this code?"</li>
              </ul>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!isLoading && input.trim()) {
                  void handleSubmit();
                }
              }
            }}
            placeholder={
              file
                ? "Ask a question about your code..."
                : "Select a file to start chatting"
            }
            className="min-h-[80px] resize-none"
            disabled={isLoading || !file}
          />
          <Button
            type="submit"
            size="icon"
            className="self-end"
            disabled={isLoading || !input.trim() || !file}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift + Enter for new line
        </p>
      </form>
    </div>
  );
}