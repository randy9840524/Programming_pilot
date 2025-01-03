import { useEffect, useRef, useState } from "react";
import { Editor } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Brain, Play, Save, Code2, Eye, RefreshCw, Download, Upload, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import DocumentPreview from "./DocumentPreview";
import FileSync from "./FileSync";
import LivePreview from "./LivePreview";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EditorProps {
  file: string | null;
  onAIToggle: () => void;
}

export default function MonacoEditor({ file, onAIToggle }: EditorProps) {
  const editorRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileData, setFileData] = useState<any>(null);
  const [collaborators, setCollaborators] = useState(new Set<string>());
  const { toast } = useToast();
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildLog, setBuildLog] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("editor");

  const { data: buildStatus } = useQuery({
    queryKey: ['/api/build/status'],
    refetchInterval: 1000,
    enabled: isBuilding,
  });

  useEffect(() => {
    if (buildStatus?.status === 'complete') {
      setIsBuilding(false);
      setActiveTab("preview");
    }
    if (buildStatus?.logs) {
      setBuildLog(buildStatus.logs);
    }
  }, [buildStatus]);

  const handleSave = async () => {
    if (!file || !editorRef.current || !fileData?.content) return;
    const content = editorRef.current.getValue();
    try {
      const response = await fetch(`/api/files/${encodeURIComponent(file)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) throw new Error("Failed to save file");

      toast({
        title: "Success",
        description: "File saved successfully",
      });
    } catch (error) {
      console.error("Failed to save file:", error);
      toast({
        title: "Error",
        description: "Failed to save file",
        variant: "destructive",
      });
    }
  };

  const handleBuild = async () => {
    if (!file || !editorRef.current) return;
    setIsBuilding(true);
    const content = editorRef.current.getValue();

    try {
      const response = await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, file }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        title: "Build Started",
        description: "Your changes are being built...",
      });
    } catch (error) {
      console.error("Build failed:", error);
      toast({
        title: "Error",
        description: "Failed to start build",
        variant: "destructive",
      });
      setIsBuilding(false);
    }
  };

  function handleEditorDidMount(editor: any) {
    editorRef.current = editor;
  }

  useEffect(() => {
    if (!file) return;

    setIsLoading(true);
    fetch(`/api/files/${encodeURIComponent(file)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load file: ${res.statusText}`);
        }
        const contentType = res.headers.get("content-type");
        if (contentType?.startsWith("application/json")) {
          return res.json();
        }
        return {
          path: file,
          content: null,
          metadata: { mimeType: contentType },
        };
      })
      .then((data) => {
        setFileData(data);
        if (data.content !== null) {
          editorRef.current?.setValue(data.content || "");
          const ext = file.split(".").pop() || "";
          const language = getLanguageFromExt(ext);
          editorRef.current?.updateOptions({ language });
        }
      })
      .catch((error) => {
        console.error("Failed to load file:", error);
        toast({
          title: "Error",
          description: "Failed to load file content",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [file, toast]);

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Select a file to edit
      </div>
    );
  }

  if (fileData?.metadata?.mimeType && isPreviewableDocument(fileData.metadata.mimeType)) {
    return <DocumentPreview file={file} type={fileData.metadata.mimeType} />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4 flex items-center justify-between bg-background">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            <span>Save</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleBuild}
            disabled={isLoading || isBuilding}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            <span>{isBuilding ? "Building..." : "Build & Run"}</span>
            {isBuilding && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
          </Button>

          <div className="border-l h-6 mx-2" />

          <Tabs defaultValue="editor" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="editor" className="flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-2">
          {collaborators.size > 0 && (
            <Badge variant="outline">
              {collaborators.size} collaborator{collaborators.size !== 1 ? 's' : ''}
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onAIToggle}
            className="flex items-center gap-2"
          >
            <Brain className="h-4 w-4" />
            AI Assistant
            <Badge variant="secondary" className="ml-1">Beta</Badge>
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 p-4">
        <TabsContent value="editor" className="mt-0">
          <div className="h-full relative rounded-lg overflow-hidden border">
            <Editor
              height="100%"
              defaultLanguage="plaintext"
              theme="vs-dark"
              loading={<div className="p-4">Loading editor...</div>}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                roundedSelection: false,
                padding: { top: 16 },
                wordWrap: "on",
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                detectIndentation: true,
                smoothScrolling: true,
                cursorBlinking: "blink",
                cursorSmoothCaretAnimation: "on",
                mouseWheelZoom: true,
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <div className="h-full flex flex-col gap-4">
            <LivePreview 
              code={editorRef.current?.getValue() || ''} 
              isBuilding={isBuilding} 
            />

            {buildLog.length > 0 && (
              <div className="p-4 bg-secondary rounded-lg">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Build Output
                </h3>
                <pre className="text-xs whitespace-pre-wrap">
                  {buildLog.join('\n')}
                </pre>
              </div>
            )}
          </div>
        </TabsContent>
      </div>
    </div>
  );
}

function getLanguageFromExt(ext: string): string {
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "javascript", 
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    java: "java",
    cpp: "cpp",
    c: "c",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
  };
  return map[ext] || "plaintext";
}

function isPreviewableDocument(mimeType?: string) {
  if (!mimeType) return false;
  return (
    mimeType.startsWith("image/") ||
    mimeType === "application/pdf" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/msword" ||
    mimeType === "application/vnd.ms-excel"
  );
}