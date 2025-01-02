import { useEffect, useRef, useState } from "react";
import * as monaco from "monaco-editor";
import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EditorProps {
  file: string | null;
  onAIToggle: () => void;
}

// Setup Monaco environment
self.MonacoEnvironment = {
  getWorker: function (_moduleId: string, label: string) {
    const getWorkerModule = (label: string) => {
      switch (label) {
        case 'typescript':
        case 'javascript':
          return new Worker(new URL('monaco-editor/esm/vs/language/typescript/ts.worker', import.meta.url));
        default:
          return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url));
      }
    };

    return getWorkerModule(label);
  }
};

export default function Editor({ file, onAIToggle }: EditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!containerRef.current) return;

    editorRef.current = monaco.editor.create(containerRef.current, {
      value: "",
      language: "typescript",
      theme: "vs-dark",
      minimap: { enabled: true },
      automaticLayout: true,
      fontSize: 14,
      lineNumbers: "on",
      scrollBeyondLastLine: false,
      roundedSelection: false,
      padding: { top: 16 },
      wordWrap: "on",
    });

    return () => {
      editorRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!file || !editorRef.current) return;

    setIsLoading(true);
    fetch(`/api/files/${encodeURIComponent(file)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load file: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        if (editorRef.current) {
          editorRef.current.setValue(data.content || "");
          const ext = file.split(".").pop() || "";
          const language = getLanguageFromExt(ext);
          monaco.editor.setModelLanguage(
            editorRef.current.getModel()!,
            language
          );
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
    if (!file || !editorRef.current) return;

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

  return (
    <div className="h-full relative">
      <div className="absolute top-2 right-2 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSave}
          disabled={isLoading}
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
      <div ref={containerRef} className="h-full w-full" />
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