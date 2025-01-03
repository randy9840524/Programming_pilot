import { useEffect, useRef, useState } from "react";
import { Editor } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Save, Play, Code2, Eye, RefreshCcw, Download, Upload, 
  Copy, Settings2, FileText, RotateCcw, Share2, Terminal,
  Laptop, GitBranch, Database, Lock, Bot, Palette, PanelRight,
  Settings, Maximize2, Split, Minimize2,
  Split, ChevronDown, ChevronRight, XCircle, Plus, Search, Trash2, 
  Code
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LivePreview from "./LivePreview";
import { cn } from "@/lib/utils";

interface EditorProps {
  file: string | null;
  onAIToggle: () => void;
}

export default function MonacoEditor({ file, onAIToggle }: EditorProps) {
  const editorRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("editor");
  const { toast } = useToast();
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildLog, setBuildLog] = useState<string[]>([]);
  const [editorValue, setEditorValue] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'split'|'editor'|'preview'>('editor');

  useEffect(() => {
    if (file && editorRef.current) {
      fetch(`/api/files/${encodeURIComponent(file)}`)
        .then(res => res.text())
        .then(content => {
          editorRef.current.setValue(content);
          setEditorValue(content);
        })
        .catch(err => {
          console.error("Failed to load file:", err);
          toast({
            title: "Error",
            description: "Failed to load file content",
            variant: "destructive",
          });
        });
    }
  }, [file]);

  const handleSave = async () => {
    if (!file || !editorRef.current) return;
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
      await handleSave();

      const response = await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, file }),
      });

      if (!response.ok) throw new Error(await response.text());

      setViewMode('preview');
      toast({
        title: "Build Started",
        description: "Building and previewing changes...",
      });

      const pollStatus = setInterval(async () => {
        const statusRes = await fetch('/api/build/status');
        const status = await statusRes.json();

        if (status.status === "complete") {
          clearInterval(pollStatus);
          setIsBuilding(false);
          setBuildLog(status.logs || []);
          toast({
            title: "Build Complete",
            description: "Your changes are now live",
          });
        }
      }, 2000);

    } catch (error) {
      console.error("Build failed:", error);
      toast({
        title: "Error",
        description: "Failed to build: " + (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive",
      });
      setIsBuilding(false);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorValue(value);
    }
  };

  function handleEditorDidMount(editor: any) {
    editorRef.current = editor;
  }

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Select a file to edit
      </div>
    );
  }

  const renderToolbar = () => (
    <div className="border-b p-2 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 mr-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className="flex items-center gap-1"
          >
            <Save className="h-4 w-4" />
            Save
          </Button>

          <Button
            variant={isBuilding ? "outline" : "default"}
            size="sm"
            onClick={handleBuild}
            disabled={isBuilding}
            className="flex items-center gap-1"
          >
            {isBuilding ? (
              <RefreshCcw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isBuilding ? "Building..." : "Build & Run"}
          </Button>
        </div>

        <div className="flex items-center gap-1 border-l pl-4">
          <Button 
            variant={viewMode === 'editor' ? 'secondary' : 'ghost'} 
            size="sm"
            onClick={() => setViewMode('editor')}
          >
            <Code className="h-4 w-4 mr-1" />
            Editor
          </Button>
          <Button 
            variant={viewMode === 'split' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('split')}
          >
            <Split className="h-4 w-4 mr-1" />
            Split View
          </Button>
          <Button 
            variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('preview')}
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onAIToggle}
          className="flex items-center gap-1"
        >
          <Bot className="h-4 w-4" />
          AI Assistant
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsFullscreen(!isFullscreen)}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>

        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {renderToolbar()}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        {(viewMode === 'editor' || viewMode === 'split') && (
          <div className={viewMode === 'split' ? 'col-span-1' : 'col-span-1 lg:col-span-2'}>
            <Editor
              height="100%"
              defaultLanguage="typescript"
              theme="vs-dark"
              loading={<div className="p-4">Loading editor...</div>}
              onMount={handleEditorDidMount}
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                roundedSelection: false,
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                automaticLayout: true,
              }}
            />
          </div>
        )}

        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={viewMode === 'split' ? 'col-span-1' : 'col-span-1 lg:col-span-2'}>
            <LivePreview 
              code={editorValue} 
              isBuilding={isBuilding}
            />
          </div>
        )}
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