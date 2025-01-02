import { useEffect, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import FileExplorer from "@/components/FileExplorer";
import Editor from "@/components/Editor";
import CommandPalette from "@/components/CommandPalette";
import AIAssistant from "@/components/AIAssistant";
import { useMobile } from "@/hooks/use-mobile";

export default function EditorPage() {
  const [showSidebar, setShowSidebar] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const isMobile = useMobile();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    // Update document title to reflect Devsol 1.0
    document.title = "Devsol 1.0 - Modern Development Environment";

    if (isMobile) {
      setShowSidebar(false);
    }
  }, [isMobile]);

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b p-2 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-lg mr-4">Devsol 1.0</span>
        <CommandPalette />
      </div>

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {showSidebar && (
            <>
              <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
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

          <ResizablePanel defaultSize={showAI ? 50 : 80}>
            <Editor
              file={selectedFile}
              onAIToggle={() => setShowAI(!showAI)}
            />
          </ResizablePanel>

          {showAI && (
            <>
              <ResizableHandle />
              <ResizablePanel defaultSize={30}>
                <AIAssistant file={selectedFile} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}