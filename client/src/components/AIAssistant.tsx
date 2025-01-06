import { useState, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Send, Loader2, Upload, X, Image as ImageIcon, FileText, 
  Code2, Globe, Sparkles, Eye 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDropzone } from 'react-dropzone';
import {
  Card,
  CardContent,
} from "@/components/ui/card";

interface FilePreview {
  name: string;
  type: string;
  url: string;
  data?: string;
  content?: string;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const onDrop = (acceptedFiles: File[]) => {
    acceptedFiles.forEach(processFile);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'text/plain': ['.txt'],
      'text/javascript': ['.js', '.jsx', '.ts', '.tsx'],
      'text/html': ['.html'],
      'text/css': ['.css']
    },
    multiple: true
  });

  const processFile = async (file: File) => {
    try {
      const reader = new FileReader();

      reader.onload = async (e) => {
        const url = e.target?.result as string;
        const base64Data = url.split(',')[1];

        let content: string | undefined;
        if (!file.type.startsWith('image/')) {
          // For text files, read the content
          const textReader = new FileReader();
          content = await new Promise((resolve) => {
            textReader.onload = (e) => resolve(e.target?.result as string);
            textReader.readAsText(file);
          });
        }

        setFiles(prev => [...prev, {
          name: file.name,
          type: file.type,
          url,
          data: base64Data,
          content
        }]);

        toast({
          title: "File uploaded",
          description: `Successfully uploaded ${file.name}`,
        });

        setMessages(prev => [...prev, `Uploaded ${file.type.startsWith('image/') ? 'image' : 'code'} file: ${file.name}`]);
      };

      reader.onerror = () => {
        toast({
          title: "Error",
          description: `Failed to upload ${file.name}`,
          variant: "destructive"
        });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "Error",
        description: `Failed to process ${file.name}`,
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) return;
    Array.from(uploadedFiles).forEach(processFile);
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

  const analyzeFiles = async () => {
    if (files.length === 0) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: "Please analyze these files and suggest implementation details",
          files: files.map(f => ({
            type: f.type,
            data: f.data
          }))
        }),
      });

      if (!response.ok) throw new Error(await response.text());

      const data = await response.json();
      setMessages(prev => [...prev, `AI Analysis: ${data.response}`]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to analyze files",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();

    if (!message && files.length === 0) {
      toast({
        title: "Error",
        description: "Please enter your request or upload files to analyze",
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
            data: f.data
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      setMessages(prev => [...prev, `AI: ${data.response}`]);
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
        <h2 className="text-xl font-semibold">Design Assistant</h2>
        <p className="text-sm text-muted-foreground">
          Upload images, code, or provide screenshots to generate applications
        </p>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          <div {...getRootProps()} className={`
            border-2 border-dashed rounded-lg p-8 text-center
            ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted'}
            hover:border-primary hover:bg-primary/5 transition-colors
            cursor-pointer
          `}>
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag and drop files here, or click to select files
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Supports images, code files, and text documents
            </p>
          </div>

          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Uploaded Files:</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={analyzeFiles}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Analyze Files
                </Button>
              </div>

              {files.map((file) => (
                <Card key={file.name} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {file.type.startsWith('image/') ? (
                          <ImageIcon className="h-4 w-4" />
                        ) : file.type.includes('javascript') || file.type.includes('typescript') ? (
                          <Code2 className="h-4 w-4" />
                        ) : file.type.includes('html') ? (
                          <Globe className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                        <span className="font-medium">{file.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(file.url)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.name)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {file.type.startsWith('image/') ? (
                      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                        <img 
                          src={file.url} 
                          alt={file.name}
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <pre className="bg-secondary p-4 rounded-lg overflow-x-auto max-h-[300px]">
                        <code className="text-sm">
                          {file.content || 'Unable to preview file content'}
                        </code>
                      </pre>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`p-3 rounded-lg ${
                msg.startsWith("You:") ? "bg-primary/10" : 
                msg.startsWith("Error:") ? "bg-destructive/10" :
                msg.startsWith("Uploaded") || msg.startsWith("Removed") ? "bg-secondary/20" :
                msg.startsWith("AI Analysis:") ? "bg-green-100 dark:bg-green-900/20" :
                "bg-secondary"
              }`}
            >
              <p className={`text-sm whitespace-pre-wrap ${
                msg.startsWith("Error:") ? "text-destructive" :
                msg.startsWith("Uploaded") || msg.startsWith("Removed") ? "text-muted-foreground" :
                msg.startsWith("AI Analysis:") ? "text-green-800 dark:text-green-200" :
                ""
              }`}>
                {msg}
              </p>
            </div>
          ))}
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
                if (!isLoading && (input.trim() || files.length > 0)) {
                  void handleSubmit(e);
                }
              }
            }}
            placeholder="Describe what you want to build or analyze..."
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