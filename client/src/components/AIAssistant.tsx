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
  error?: boolean;
}

export default function AIAssistant({ file }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = async () => {
    if (!input.trim() || !file) {
      toast({
        title: "Error",
        description: file ? "Please enter a message" : "Please select a file first",
        variant: "destructive",
      });
      return;
    }

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await analyzeCode(file, userMessage);
      if (response.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response.error, error: true },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response.content },
        ]);
      }
    } catch (error: any) {
      console.error("Failed to get AI response:", error);
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

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!isLoading && input.trim()) {
                  void sendMessage();
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
            size="icon"
            className="self-end"
            onClick={() => sendMessage()}
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
      </div>
    </div>
  );
}