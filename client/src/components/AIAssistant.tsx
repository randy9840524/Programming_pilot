import { useState, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Upload, X, Image as ImageIcon, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FilePreview {
  name: string;
  type: string;
  url: string;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<FilePreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) return;

    Array.from(uploadedFiles).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setFiles(prev => [...prev, {
          name: file.name,
          type: file.type,
          url
        }]);
        setMessages(prev => [...prev, `Uploaded file: ${file.name}`]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (fileName: string) => {
    setFiles(prev => prev.filter(file => file.name !== fileName));
    setMessages(prev => [...prev, `Removed file: ${fileName}`]);
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current;
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();

    if (!message && files.length === 0) {
      toast({
        title: "Error",
        description: "Please enter your request or upload a file to analyze",
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
        body: JSON.stringify({
          prompt: message,
          files: files.map(f => ({
            type: f.type,
            data: f.url.split(',')[1] // Remove data URL prefix
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      setMessages(prev => [...prev, `AI: ${data.response}`]);
      // Only clear files after successful analysis
      setFiles([]);
    } catch (error: any) {
      console.error("Development request failed:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process development request",
        variant: "destructive"
      });
      setMessages(prev => [...prev, `Error: ${error.message || "Failed to process development request"}`]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }

  return (
    <div className="h-full flex flex-col bg-background border-l">
      <div className="border-b p-4">
        <h2 className="text-xl font-semibold">Development Assistant</h2>
        <p className="text-sm text-muted-foreground">
          I can help analyze code, images, and files to assist with development
        </p>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`p-3 rounded-lg ${
                msg.startsWith("You:") ? "bg-primary/10" : 
                msg.startsWith("Error:") ? "bg-destructive/10" :
                msg.startsWith("Uploaded file:") || msg.startsWith("Removed file:") ? "bg-secondary/20" :
                "bg-secondary"
              }`}
            >
              <p className={`text-sm whitespace-pre-wrap ${
                msg.startsWith("Error:") ? "text-destructive" :
                msg.startsWith("Uploaded file:") || msg.startsWith("Removed file:") ? "text-muted-foreground" :
                ""
              }`}>
                {msg}
              </p>
            </div>
          ))}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Uploaded Files:</p>
              {files.map((file) => (
                <div key={file.name} className="flex items-center gap-2 p-2 bg-secondary rounded-lg">
                  {file.type.startsWith('image/') ? (
                    <div className="flex items-center gap-2 flex-1">
                      <ImageIcon className="h-4 w-4" />
                      <span className="text-sm truncate">{file.name}</span>
                      <img 
                        src={file.url} 
                        alt={file.name}
                        className="h-8 w-8 object-cover rounded"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.name)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {messages.length === 0 && files.length === 0 && (
            <div className="text-center text-muted-foreground">
              <p>Upload files or describe what you want to analyze</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          multiple
          accept="image/*,.txt,.js,.jsx,.ts,.tsx,.py,.html,.css,application/json"
        />

        <div className="flex gap-2 mb-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
        </div>

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!isLoading && (input.trim() || files.length > 0)) {
                  void handleSubmit(e);
                }
              }
            }}
            placeholder="Describe what you want to analyze..."
            className="min-h-[80px] resize-none"
          />
          <Button
            type="submit"
            className={`self-end ${isLoading ? 'bg-muted' : ''}`}
            disabled={isLoading || (!input.trim() && files.length === 0)}
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