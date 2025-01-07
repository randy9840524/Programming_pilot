import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, Globe, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ExportOptions() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'web' | 'desktop' | null>(null);
  const { toast } = useToast();

  const handleExport = async (type: 'web' | 'desktop') => {
    try {
      setIsExporting(true);
      setExportType(type);

      const response = await fetch(`/api/export/${type}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      // For desktop apps, we receive a URL to download the executable
      if (type === 'desktop') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'game-app.zip';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        toast({
          title: "Success",
          description: "Desktop application package downloaded successfully! Extract the zip file and run the executable inside.",
        });
      } else {
        // For web deployment, we receive a deployment URL
        const { url } = await response.json();
        window.open(url, '_blank');

        toast({
          title: "Success",
          description: "Web deployment completed! Opening deployment URL in a new tab.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export application",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Download className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Options</DialogTitle>
          <DialogDescription>
            Choose how you want to deploy or package your application
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Card className="p-4">
            <h3 className="font-medium mb-2">Web Deployment</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Deploy your game as a web application for online access
            </p>
            <Button
              onClick={() => handleExport('web')}
              disabled={isExporting}
              className="w-full"
            >
              {isExporting && exportType === 'web' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Globe className="mr-2 h-4 w-4" />
              )}
              {isExporting && exportType === 'web' ? 'Deploying...' : 'Deploy to Web'}
            </Button>
          </Card>

          <Card className="p-4">
            <h3 className="font-medium mb-2">Desktop Application</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a standalone executable for Windows, Mac, or Linux
            </p>
            <Button
              onClick={() => handleExport('desktop')}
              disabled={isExporting}
              className="w-full"
            >
              {isExporting && exportType === 'desktop' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isExporting && exportType === 'desktop' ? 'Creating Package...' : 'Create Executable'}
            </Button>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}