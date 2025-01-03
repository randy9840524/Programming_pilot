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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!input.trim() || !file) {
      toast({
        title: "Error",
        description: file ? "Please enter a question" : "Please select a file first",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, `You: ${userMessage}`]);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userMessage,
          filePath: file
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to get AI response');
      }

      const data = await response.json();
      if (!data.response) {
        throw new Error('Invalid response from AI');
      }

      setMessages(prev => [...prev, `AI: ${data.response}`]);
    } catch (error: any) {
      console.error("Failed to get AI response:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response",
        variant: "destructive"
      });
      setMessages(prev => [...prev, `Error: ${error.message || "Failed to get AI response"}`]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background border-l">
      <div className="border-b p-4">
        <h2 className="text-xl font-semibold">AI Assistant</h2>
        <p className="text-sm text-muted-foreground">Ask questions about your code</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className="text-sm">
              {msg.startsWith("Error:") ? (
                <p className="text-destructive">{msg}</p>
              ) : (
                <p className="whitespace-pre-wrap">{msg}</p>
              )}
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground">
              <p>Select a file and start asking questions</p>
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
                void handleSubmit();
              }
            }}
            placeholder={file ? "Ask a question..." : "Select a file first"}
            className="min-h-[80px]"
            disabled={isLoading || !file}
          />
          <Button 
            type="submit"
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
      </form>
    </div>
  );
}