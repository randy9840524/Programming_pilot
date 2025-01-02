import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { analyzeCode } from "@/lib/ai";
import { useToast } from "@/hooks/use-toast";

interface AIAssistantProps {
  file: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIAssistant({ file }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = async () => {
    if (!input.trim() || !file) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await analyzeCode(file, userMessage);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response },
      ]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background border-l">
      <div className="border-b p-6">
        <h2 className="text-2xl font-semibold mb-2">AI Assistant</h2>
        <p className="text-muted-foreground">
          Ask questions about your code and get intelligent responses
        </p>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6">
          {messages.map((message, i) => (
            <div
              key={i}
              className={`flex ${
                message.role === "assistant" ? "justify-start" : "justify-end"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === "assistant"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">Welcome to AI Assistant!</p>
              <p>Start by asking a question about your code.</p>
              <p className="text-sm mt-2">Examples:</p>
              <ul className="text-sm mt-1 space-y-1">
                <li>"What does this code do?"</li>
                <li>"How can I improve this function?"</li>
                <li>"Is there a bug in this code?"</li>
              </ul>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-6">
        <div className="flex gap-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask a question about your code..."
            className="min-h-[100px] resize-none text-base"
            disabled={isLoading}
          />
          <Button
            size="lg"
            className="self-end px-6"
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}