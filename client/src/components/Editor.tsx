import { useEffect, useRef, useState } from "react";
import { Editor } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import DocumentPreview from "./DocumentPreview";
import FileSync from "./FileSync";
import LivePreview from "./LivePreview";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from 'lucide-react';

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

  const { data: buildStatus } = useQuery({
    queryKey: ['/api/build/status'],
    refetchInterval: 1000,
    enabled: isBuilding,
  });

  useEffect(() => {
    if (buildStatus?.status === 'complete') {
      setIsBuilding(false);
    }
    if (buildStatus?.logs) {
      setBuildLog(buildStatus.logs);
    }
  }, [buildStatus]);

  const handleContentChange = (newContent: string) => {
    if (editorRef.current) {
      const currentPosition = editorRef.current.getPosition();
      editorRef.current.setValue(newContent);
      editorRef.current.setPosition(currentPosition);
    }
  };

  function handleEditorDidMount(editor: any) {
    editorRef.current = editor;

    editor.onDidChangeModelContent(() => {
      if (!wsRef.current || !file) return;

      const content = editor.getValue();
      wsRef.current.send(JSON.stringify({
        type: 'edit',
        file,
        data: { content }
      }));
    });

    editor.onDidChangeCursorPosition((e: any) => {
      if (!wsRef.current || !file) return;

      wsRef.current.send(JSON.stringify({
        type: 'cursor',
        file,
        data: {
          position: {
            line: e.position.lineNumber,
            column: e.position.column
          }
        }
      }));
    });

    editor.onDidChangeCursorSelection((e: any) => {
      if (!wsRef.current || !file) return;

      wsRef.current.send(JSON.stringify({
        type: 'selection',
        file,
        data: {
          selection: {
            start: {
              line: e.selection.startLineNumber,
              column: e.selection.startColumn
            },
            end: {
              line: e.selection.endLineNumber,
              column: e.selection.endColumn
            }
          }
        }
      }));
    });
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

  return (
    <div className="h-full relative flex flex-col">
      <div className="absolute top-2 right-2 flex gap-2 z-10">
        {collaborators.size > 0 && (
          <div className="flex items-center gap-1">
            <Badge variant="outline">
              {collaborators.size} collaborator{collaborators.size !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            // Handle save functionality
            if (!file || !editorRef.current || !fileData?.content) return;
            const content = editorRef.current.getValue();
            fetch(`/api/files/${encodeURIComponent(file)}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content }),
            })
              .then((res) => {
                if (!res.ok) throw new Error("Failed to save file");
                toast({
                  title: "Success",
                  description: "File saved successfully",
                });
              })
              .catch((error) => {
                console.error("Failed to save file:", error);
                toast({
                  title: "Error",
                  description: "Failed to save file",
                  variant: "destructive",
                });
              });
          }}
          disabled={isLoading || !fileData?.content}
        >
          Save
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onAIToggle}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <Brain className="h-4 w-4" />
          <span>AI Assistant</span>
          <Badge variant="secondary" className="ml-1">Beta</Badge>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleBuild}
          disabled={isLoading || isBuilding}
        >
          {isBuilding ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Building...
            </>
          ) : (
            "Build & Preview"
          )}
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-4">
        <div className="col-span-2 relative">
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

        <div className="flex flex-col">
          <LivePreview code={editorRef.current?.getValue() || ''} isBuilding={isBuilding} />

          {buildLog.length > 0 && (
            <div className="mt-4 p-4 bg-secondary rounded-lg">
              <h3 className="text-sm font-medium mb-2">Build Output</h3>
              <pre className="text-xs whitespace-pre-wrap">
                {buildLog.join('\n')}
              </pre>
            </div>
          )}
        </div>
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