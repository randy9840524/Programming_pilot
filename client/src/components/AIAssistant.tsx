import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIAssistantProps {
  file: string | null;
}

export default function AIAssistant({ file }: AIAssistantProps) {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();

    if (!message) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setInput("");
    setMessages(prev => [...prev, `You: ${message}`]);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      setMessages(prev => [...prev, `AI: ${data.response}`]);
    } catch (error: any) {
      const errorMessage = error.message || "Something went wrong";
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      setMessages(prev => [...prev, `Error: ${errorMessage}`]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col bg-background border-l">
      <div className="border-b p-4">
        <h2 className="text-xl font-semibold">AI Assistant</h2>
        <p className="text-sm text-muted-foreground">
          Ask me anything
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className="text-sm">
              {msg.startsWith("Error:") ? (
                <p className="text-destructive font-medium">{msg}</p>
              ) : (
                <p className="whitespace-pre-wrap">{msg}</p>
              )}
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground">
              <p>How can I help you today?</p>
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
                  void handleSubmit(e);
                }
              }
            }}
            placeholder="Type your message..."
            className="min-h-[80px] resize-none"
          />
          <Button
            type="submit"
            className="self-end"
            disabled={isLoading || !input.trim()}
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