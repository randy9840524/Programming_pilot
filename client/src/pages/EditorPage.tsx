import { useEffect, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Menu, Settings, Terminal, Code2, Play, Save, RefreshCw, Database } from "lucide-react";
import FileExplorer from "@/components/FileExplorer";
import Editor from "@/components/Editor";
import CommandPalette from "@/components/CommandPalette";
import AIAssistant from "@/components/AIAssistant";
import ProjectSelector from "@/components/ProjectSelector";
import { useMobile } from "@/hooks/use-mobile";

export default function EditorPage() {
  const [showSidebar, setShowSidebar] = useState(true);
  const [showAI, setShowAI] = useState(true);
  const isMobile = useMobile();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    document.title = "CodeCraft IDE - Modern Development Environment";

    if (isMobile) {
      setShowSidebar(false);
      setShowAI(false);
    }
  }, [isMobile]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <div className="border-b p-2 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSidebar(!showSidebar)}
          aria-label={showSidebar ? "Hide sidebar" : "Show sidebar"}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex-1 flex items-center gap-4">
          <span className="font-bold text-lg">CodeCraft IDE</span>
          <ProjectSelector />
          <CommandPalette />

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button variant="secondary" size="sm" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Run
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Console
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database
            </Button>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAI(!showAI)}
          className="ml-auto"
        >
          {showAI ? "Hide AI" : "Show AI"}
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {showSidebar && (
            <>
              <ResizablePanel defaultSize={15} minSize={10} maxSize={20}>
                <ScrollArea className="h-full">
                  <FileExplorer
                    onFileSelect={setSelectedFile}
                    selectedFile={selectedFile}
                  />
                </ScrollArea>
              </ResizablePanel>
              <ResizableHandle />
            </>
          )}

          <ResizablePanel defaultSize={showAI ? 45 : 85}>
            <Editor
              file={selectedFile}
              onAIToggle={() => setShowAI(!showAI)}
            />
          </ResizablePanel>

          {showAI && (
            <>
              <ResizableHandle />
              <ResizablePanel defaultSize={40} minSize={30}>
                <AIAssistant />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}