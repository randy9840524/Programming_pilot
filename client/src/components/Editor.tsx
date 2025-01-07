import { useEffect, useRef, useState } from "react";
import { Editor } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Save, Play, Code2, Eye, RefreshCcw, Share2, 
  Terminal, GitBranch, Database, FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LivePreview from "./LivePreview";

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
  const [editorValue, setEditorValue] = useState<string>("// Start coding here");

  useEffect(() => {
    if (file && editorRef.current) {
      fetch(`/api/files/${encodeURIComponent(file)}`)
        .then(res => res.text())
        .then(content => {
          if (editorRef.current) {
            editorRef.current.setValue(content);
            setEditorValue(content);
          }
        })
        .catch(error => {
          console.error("Error loading file:", error);
          toast({
            title: "Error",
            description: "Failed to load file",
            variant: "destructive"
          });
        });
    }
  }, [file, toast]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorValue(value);
    }
  };

  function handleEditorDidMount(editor: any) {
    editorRef.current = editor;
    const initialValue = editorRef.current.getValue() || "// Start coding here";
    setEditorValue(initialValue);
  }

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Select a file to edit
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-2 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleBuild}
              disabled={isBuilding}
              className="flex items-center gap-2"
            >
              {isBuilding ? (
                <RefreshCcw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isBuilding ? "Building..." : "Run"}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Console
            </Button>
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database
            </Button>
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Git
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
          <TabsList className="grid w-full grid-cols-2">
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

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onAIToggle}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            AI Assistant
          </Button>
        </div>
      </div>

      <div className="flex-1">
        <TabsContent value="editor" className="m-0 h-full">
          <Editor
            height="100%"
            defaultLanguage="typescript"
            theme="vs-dark"
            loading={<div className="p-4">Loading editor...</div>}
            onMount={handleEditorDidMount}
            onChange={handleEditorChange}
            value={editorValue}
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
        </TabsContent>

        <TabsContent value="preview" className="m-0 h-full">
          <LivePreview code={editorValue} isBuilding={isBuilding} />
        </TabsContent>
      </div>
    </div>
  );
}

async function handleSave() {
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
}

async function handleBuild() {
  if (!file || !editorRef.current) return;
  setIsBuilding(true);
  const content = editorRef.current.getValue();

  try {
    const response = await fetch('/api/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, file }),
    });

    if (!response.ok) throw new Error(await response.text());

    setActiveTab("preview");
    toast({
      title: "Build Started",
      description: "Your changes are being built...",
    });

    // Poll build status
    const pollStatus = setInterval(async () => {
      const statusRes = await fetch('/api/build/status');
      const status = await statusRes.json();

      if (status.status === "complete") {
        clearInterval(pollStatus);
        setIsBuilding(false);
      }
    }, 2000);

  } catch (error) {
    console.error("Build failed:", error);
    toast({
      title: "Error",
      description: "Failed to start build",
      variant: "destructive",
    });
    setIsBuilding(false);
  }
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