import { useLocation } from "wouter";
import {
  Home,
  Upload,
  FileCode,
  Settings,
  Download,
  Copy
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LivePreview from "./LivePreview";

interface NavItemProps {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  active?: boolean;
}

const NavItem = ({ icon, tooltip, onClick, active }: NavItemProps) => {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={`p-2 rounded-lg transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          <p className="text-sm">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default function NavigationBar() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClone = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.xlsx,.xls,.doc,.docx';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          setIsLoading(true);
          setIsPreviewOpen(true);
          setPreviewContent(null);

          const reader = new FileReader();
          reader.onload = async (e) => {
            const base64Data = e.target?.result?.toString().split(',')[1];
            if (base64Data) {
              try {
                const analyzeResponse = await fetch('/api/analyze', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    files: [{
                      type: file.type,
                      name: file.name,
                      data: base64Data
                    }],
                    prompt: "Please analyze this content and create a pixel-perfect HTML/CSS implementation"
                  }),
                });

                if (!analyzeResponse.ok) {
                  throw new Error(`Failed to analyze file: ${await analyzeResponse.text()}`);
                }

                const { response: analyzedContent } = await analyzeResponse.json();

                const previewResponse = await fetch('/api/preview', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ response: analyzedContent }),
                });

                if (!previewResponse.ok) {
                  throw new Error(`Failed to generate preview: ${await previewResponse.text()}`);
                }

                const previewHtml = await previewResponse.text();
                setPreviewContent(previewHtml);

                toast({
                  title: "Success",
                  description: "Preview generated successfully",
                });
              } catch (error: any) {
                console.error('Error processing file:', error);
                toast({
                  title: "Error",
                  description: error.message || "Failed to process file",
                  variant: "destructive",
                });
              }
            }
          };
          reader.readAsDataURL(file);
        } catch (error: any) {
          console.error('Error processing file:', error);
          toast({
            title: "Error",
            description: error.message || "Failed to process file",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };
    input.click();
  };

  return (
    <>
      <nav className="fixed left-0 top-0 h-full w-16 bg-background border-r flex flex-col items-center py-4 space-y-4 shadow-sm">
        <NavItem
          icon={<Home className="h-5 w-5" />}
          tooltip="Home"
          onClick={() => setLocation("/")}
          active={location === "/"}
        />

        <NavItem
          icon={<FileCode className="h-5 w-5" />}
          tooltip="Code Editor"
          onClick={() => setLocation("/editor")}
          active={location === "/editor"}
        />

        <NavItem
          icon={<Upload className="h-5 w-5" />}
          tooltip="Upload & Clone Application"
          onClick={handleClone}
        />

        <NavItem
          icon={<Download className="h-5 w-5" />}
          tooltip="Export Application"
          onClick={() => setLocation("/export")}
          active={location === "/export"}
        />

        <NavItem
          icon={<Copy className="h-5 w-5" />}
          tooltip="Clone from Screenshot"
          onClick={handleClone}
        />

        <NavItem
          icon={<Settings className="h-5 w-5" />}
          tooltip="Settings"
          onClick={() => setLocation("/settings")}
          active={location === "/settings"}
        />
      </nav>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[90vw] w-[1200px] h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Live Preview</DialogTitle>
            <DialogDescription>
              Preview of the cloned application
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden mt-4">
            <LivePreview
              htmlContent={previewContent || undefined}
              isLoading={isLoading}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}