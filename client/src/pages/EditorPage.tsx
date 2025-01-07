import { useEffect, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Menu, Settings, Upload, Play, Sparkles, FileText, FolderOpen, Code2 } from "lucide-react";
import FileExplorer from "@/components/FileExplorer";
import Editor from "@/components/Editor";
import CommandPalette from "@/components/CommandPalette";
import AIAssistant from "@/components/AIAssistant";
import ProjectSelector from "@/components/ProjectSelector";
import { useMobile } from "@/hooks/use-mobile";
import ExportOptions from "@/components/ExportOptions";

type RightPanelView = 'ai' | 'artifacts';

export default function EditorPage() {
  const [showSidebar, setShowSidebar] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [rightPanelView, setRightPanelView] = useState<RightPanelView>('ai');
  const isMobile = useMobile();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  useEffect(() => {
    document.title = "CodeCraft IDE - Modern Development Environment";

    if (isMobile) {
      setShowSidebar(false);
      setShowRightPanel(false);
    }
  }, [isMobile]);

  const handleProjectSelect = (projectId: number | null) => {
    setSelectedProjectId(projectId);
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Top Navigation Bar */}
      <div className="border-b px-3 py-2 flex items-center gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
          <ProjectSelector onSelect={handleProjectSelect} />
          <CommandPalette />
        </div>

        <ExportOptions />
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* New Vertical Sidebar */}
        <div className="w-12 border-r bg-background flex flex-col items-center py-4 gap-4">
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <FolderOpen className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <Upload className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <Code2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <Sparkles className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <Play className="h-4 w-4" />
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1">
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

            <ResizablePanel defaultSize={showRightPanel ? 45 : 85} minSize={30}>
              <Editor
                file={selectedFile}
                onAIToggle={() => setShowRightPanel(!showRightPanel)}
              />
            </ResizablePanel>

            {showRightPanel && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={40} minSize={30} maxSize={50}>
                  <div className="h-full">
                    <AIAssistant />
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
}