import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LivePreviewProps {
  code: string;
  isBuilding: boolean;
}

export default function LivePreview({ code, isBuilding }: LivePreviewProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const generatePreview = async () => {
    if (!code) return;

    setIsRefreshing(true);
    try {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      setPreview(data.preview);
      setError(null);
    } catch (err: any) {
      console.error('Preview generation error:', err);
      setError(err.message || 'Failed to generate preview');
      setPreview(null);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(generatePreview, 500);
    return () => clearTimeout(timeoutId);
  }, [code]);

  if (isBuilding) {
    return (
      <div className="h-full flex items-center justify-center bg-background/50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Building preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="h-full p-6 flex flex-col items-center justify-center border-destructive">
        <p className="text-sm text-destructive whitespace-pre-wrap mb-4">{error}</p>
        <Button 
          variant="outline" 
          size="sm"
          onClick={generatePreview}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Try Again
        </Button>
      </Card>
    );
  }

  if (!preview) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">No preview available</p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={generatePreview}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Generate Preview
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <iframe
        srcDoc={preview}
        className="w-full h-full border-0 rounded-lg bg-white"
        sandbox="allow-scripts allow-popups allow-same-origin allow-forms"
        title="Live Preview"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={generatePreview}
        disabled={isRefreshing}
        className="absolute top-2 right-2 flex items-center gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}