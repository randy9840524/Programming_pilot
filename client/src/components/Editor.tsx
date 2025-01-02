import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";
import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";

interface EditorProps {
  file: string | null;
  onAIToggle: () => void;
}

export default function Editor({ file, onAIToggle }: EditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    });

    return () => {
      editorRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!file || !editorRef.current) return;

    // TODO: Load file content
    fetch(`/api/files/${encodeURIComponent(file)}`)
      .then((res) => res.text())
      .then((content) => {
        editorRef.current?.setValue(content);
        const ext = file.split(".").pop() || "";
        const language = getLanguageFromExt(ext);
        monaco.editor.setModelLanguage(
          editorRef.current!.getModel()!,
          language
        );
      });
  }, [file]);

  return (
    <div className="h-full relative">
      <div ref={containerRef} className="h-full w-full" />
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2"
        onClick={onAIToggle}
      >
        <Brain className="h-5 w-5" />
      </Button>
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
