import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EditorProps {
  file: string | null;
  onAIToggle: () => void;
}

export default function MonacoEditor({ file, onAIToggle }: EditorProps) {
  const editorRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  function handleEditorDidMount(editor: any) {
    editorRef.current = editor;
  }

  useEffect(() => {
    if (!file) return;

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
          editorRef.current.updateOptions({ language });
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
      <div className="absolute top-2 right-2 flex gap-2 z-10">
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
      <Editor
        height="100%"
        defaultLanguage="typescript"
        theme="vs-dark"
        loading={<div>Loading...</div>}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          roundedSelection: false,
          padding: { top: 16 },
          wordWrap: "on",
          automaticLayout: true,
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