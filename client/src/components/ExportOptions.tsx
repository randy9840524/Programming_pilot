import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ExportOptions() {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async (type: 'web' | 'desktop') => {
    try {
      setIsExporting(true);
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
        a.download = 'pong-game.exe';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } else {
        // For web deployment, we receive a deployment URL
        const { url } = await response.json();
        window.open(url, '_blank');
      }

      toast({
        title: "Success",
        description: `${type === 'web' ? 'Web deployment' : 'Desktop export'} completed successfully!`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Download className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Options</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Card className="p-4">
            <h3 className="font-medium mb-2">Web Deployment</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Deploy your game to a web server for online access
            </p>
            <Button
              onClick={() => handleExport('web')}
              disabled={isExporting}
              className="w-full"
            >
              <Globe className="mr-2 h-4 w-4" />
              Deploy to Web
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
              <Download className="mr-2 h-4 w-4" />
              Create Executable
            </Button>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
