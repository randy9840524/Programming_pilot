import { useEffect, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Menu, Settings, Terminal, Code2, Play, Save, RefreshCw, Database, Laptop } from "lucide-react";
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
      {/* Top Navigation Bar */}
      <div className="border-b p-3 flex items-center gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSidebar(!showSidebar)}
          aria-label={showSidebar ? "Hide sidebar" : "Show sidebar"}
          className="shrink-0"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex-1 flex items-center gap-4 overflow-x-auto">
          <span className="font-bold text-lg whitespace-nowrap">CodeCraft IDE</span>
          <ProjectSelector />
          <CommandPalette />

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-2">
              <Laptop className="h-4 w-4" />
              Environment
            </Button>
            <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Console
            </Button>
            <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAI(!showAI)}
          >
            {showAI ? "Hide AI" : "Show AI"}
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {showSidebar && (
            <>
              <ResizablePanel defaultSize={15} minSize={10} maxSize={20}>
                <ScrollArea className="h-full border-r">
                  <FileExplorer
                    onFileSelect={setSelectedFile}
                    selectedFile={selectedFile}
                  />
                </ScrollArea>
              </ResizablePanel>
              <ResizableHandle withHandle />
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
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={30}>
                <div className="h-full border-l">
                  <AIAssistant />
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}