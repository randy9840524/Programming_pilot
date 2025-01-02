import { useEffect, useRef, useState } from "react";
import { Editor } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DocumentPreview from "./DocumentPreview";

interface EditorProps {
  file: string | null;
  onAIToggle: () => void;
}

export default function MonacoEditor({ file, onAIToggle }: EditorProps) {
  const editorRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileData, setFileData] = useState<any>(null);
  const { toast } = useToast();

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

  const handleSave = async () => {
    if (!file || !editorRef.current || !fileData?.content) return;

    try {
      const content = editorRef.current.getValue();
      const response = await fetch(`/api/files/${encodeURIComponent(file)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error("Failed to save file");
      }

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

  const isPreviewableDocument = (mimeType?: string) => {
    if (!mimeType) return false;
    return (
      mimeType.startsWith("image/") ||
      mimeType === "application/pdf" ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType === "application/msword" ||
      mimeType === "application/vnd.ms-excel"
    );
  };

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
    <div className="h-full relative">
      <div className="absolute top-2 right-2 flex gap-2 z-10">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSave}
          disabled={isLoading || !fileData?.content}
        >
          Save
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onAIToggle}
          disabled={isLoading}
        >
          <Brain className="h-5 w-5" />
        </Button>
      </div>
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