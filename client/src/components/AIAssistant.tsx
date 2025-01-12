import { useState, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDropzone } from "react-dropzone";
import {
  Send,
  Loader2,
  Upload,
  X,
  Image as ImageIcon,
  FileText,
  Code2,
  Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LivePreview from "@/components/LivePreview";
import { cn } from "@/lib/utils";

interface FilePreview {
  name: string;
  type: string;
  url: string;
  data?: string;
  content?: string;
  isImage?: boolean;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [previewCode, setPreviewCode] = useState<string>("");
  const [isBuilding, setIsBuilding] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop: async (acceptedFiles: File[]) => {
      try {
        for (const file of acceptedFiles) {
          await processFile(file);
        }
      } catch (error: any) {
        console.error('Error processing files:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to process files",
          variant: "destructive"
        });
      }
    },
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'text/plain': ['.txt'],
      'text/javascript': ['.js', '.jsx', '.ts', '.tsx'],
      'text/html': ['.html'],
      'text/css': ['.css']
    },
    maxSize: 5242880, // 5MB
    multiple: true
  });

  const processFile = async (file: File): Promise<void> => {
    try {
      const reader = new FileReader();
      const isImage = file.type.startsWith('image/');

      reader.onload = async (e) => {
        const url = e.target?.result as string;
        const base64Data = url.split(',')[1];

        let content: string | undefined;
        if (!isImage) {
          content = await new Promise<string>((resolve) => {
            const textReader = new FileReader();
            textReader.onload = (e) => resolve(e.target?.result as string);
            textReader.readAsText(file);
          });
        }

        const newFile: FilePreview = {
          name: file.name,
          type: file.type,
          url,
          data: base64Data,
          content,
          isImage
        };

        setFiles(prevFiles => [...prevFiles, newFile]);
        setMessages(prevMessages => [
          ...prevMessages,
          `Uploaded ${isImage ? 'image' : 'file'}: ${file.name}`
        ]);

        toast({
          title: "Success",
          description: `Successfully uploaded ${file.name}`,
        });

        scrollToBottom();
      };

      reader.onerror = () => {
        throw new Error(`Failed to read file: ${file.name}`);
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('File processing error:', error);
      throw new Error(`Failed to process ${file.name}: ${error.message}`);
    }
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const handlePreview = async () => {
    if (files.length === 0 && !input.trim()) {
      toast({
        title: "Error",
        description: "Please upload files or provide instructions first",
        variant: "destructive"
      });
      return;
    }

    setIsBuilding(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input.trim() || "Generate a preview based on the uploaded files",
          files: files.map(f => ({
            type: f.type,
            name: f.name,
            data: f.data,
            isImage: f.isImage
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      setPreviewCode(data.response);
      setMessages(prev => [...prev, `Preview generated successfully`]);
      scrollToBottom();

      toast({
        title: "Success",
        description: "Preview generated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate preview",
        variant: "destructive"
      });
    } finally {
      setIsBuilding(false);
    }
  };

  const removeFile = (fileName: string) => {
    setFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
    setMessages(prevMessages => [...prevMessages, `Removed file: ${fileName}`]);
  };

  return (
    <div className="h-full flex flex-col bg-background border-l">
      <div className="border-b py-2 px-4">
        <h2 className="text-lg font-semibold">Design Assistant</h2>
        <p className="text-xs text-muted-foreground">
          Upload images, code, or provide screenshots to generate applications
        </p>
      </div>

      <Tabs defaultValue="input" className="flex-1 flex flex-col">
        <div className="border-b px-4">
          <TabsList className="h-9">
            <TabsTrigger value="input">Input & Analysis</TabsTrigger>
            <TabsTrigger value="preview">Live Preview</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="input" className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="p-4 space-y-4">
              {/* File Upload Zone */}
              <div {...getRootProps()} className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
                isDragActive && !isDragReject ? "border-primary bg-primary/10" : "border-muted",
                isDragReject ? "border-destructive bg-destructive/10" : "",
                "hover:border-primary hover:bg-primary/5"
              )}>
                <input {...getInputProps()} />
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {isDragActive ? "Drop the files here..." : "Drag and drop files here, or click to select files"}
                </p>
                {isDragReject && (
                  <p className="mt-2 text-sm text-destructive">
                    Some files are not supported
                  </p>
                )}
              </div>

              {/* File Preview Section */}
              {files.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handlePreview}
                      disabled={isBuilding}
                      className={cn(
                        files.length > 0 && !isBuilding ? "bg-green-500 hover:bg-green-600" : ""
                      )}
                    >
                      {isBuilding ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {isBuilding ? "Processing..." : "Generate Preview"}
                    </Button>
                  </div>

                  {files.map((file, index) => (
                    <Card key={`${file.name}-${index}`} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {file.isImage ? (
                              <ImageIcon className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                            <span className="font-medium text-sm">{file.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => removeFile(file.name)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {file.isImage ? (
                          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                            <img
                              src={file.url}
                              alt={file.name}
                              className="absolute inset-0 w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <pre className="bg-muted p-3 rounded-lg overflow-x-auto max-h-[200px] text-sm">
                            <code>{file.content || 'Unable to preview file content'}</code>
                          </pre>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Messages History */}
              <div className="space-y-3">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-3 rounded-lg text-sm",
                      msg.startsWith("You:") ? "bg-primary/10" :
                      msg.startsWith("Error:") ? "bg-destructive/10" :
                      msg.startsWith("Uploaded") ? "bg-secondary/20" :
                      msg.startsWith("Preview generated") ? "bg-green-100 dark:bg-green-900/20" :
                      "bg-secondary"
                    )}
                  >
                    <p className={cn(
                      "whitespace-pre-wrap",
                      msg.startsWith("Error:") ? "text-destructive" :
                      msg.startsWith("Uploaded") ? "text-muted-foreground" :
                      msg.startsWith("Preview generated") ? "text-green-800 dark:text-green-200" :
                      ""
                    )}>
                      {msg}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!isBuilding && (input.trim() || files.length > 0)) {
                      handlePreview();
                    }
                  }
                }}
                placeholder="Describe what you want to build or analyze..."
                className="min-h-[50px] max-h-[100px] resize-none text-sm"
              />
              <Button
                onClick={handlePreview}
                size="icon"
                className="h-[50px]"
                disabled={isBuilding || (!input.trim() && files.length === 0)}
              >
                {isBuilding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Press Enter to send, Shift + Enter for new line
            </p>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="flex-1 p-0 m-0">
          <LivePreview code={previewCode} isBuilding={isBuilding} />
        </TabsContent>
      </Tabs>
    </div>
  );
}