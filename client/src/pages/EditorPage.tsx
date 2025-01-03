import { useEffect, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Menu, Settings } from "lucide-react";
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

          <ResizablePanel defaultSize={showAI ? 50 : 85}>
            <Editor
              file={selectedFile}
              onAIToggle={() => setShowAI(!showAI)}
            />
          </ResizablePanel>

          {showAI && (
            <>
              <ResizableHandle />
              <ResizablePanel defaultSize={35} minSize={25}>
                <AIAssistant />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}