import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface LivePreviewProps {
  htmlContent?: string;
  isLoading?: boolean;
  code?: string;
  isBuilding?: boolean;
}

export default function LivePreview({ htmlContent, isLoading, code, isBuilding }: LivePreviewProps) {
  const [error, setError] = useState<string | null>(null);
  const [sanitizedContent, setSanitizedContent] = useState<string | null>(null);

  useEffect(() => {
    if (htmlContent) {
      try {
        setSanitizedContent(htmlContent);
        setError(null);
      } catch (err) {
        console.error('Error processing HTML:', err);
        setError('Error processing preview content');
      }
    } else if (code) {
      setSanitizedContent(code);
      setError(null);
    } else {
      setSanitizedContent(null);
    }
  }, [htmlContent, code]);

  if (isLoading || isBuilding) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {isBuilding ? "Building preview..." : "Generating preview..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="h-full p-4 flex items-center justify-center border-destructive">
        <p className="text-sm text-destructive">{error}</p>
      </Card>
    );
  }

  if (!sanitizedContent) {
    return (
      <div className="h-full flex items-center justify-center border-2 border-dashed border-muted rounded-lg">
        <div className="text-center p-4">
          <p className="text-sm text-muted-foreground mb-2">No preview available</p>
          <p className="text-xs text-muted-foreground">Upload a file to see the preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 w-full">
        <iframe
          srcDoc={sanitizedContent}
          className="w-full h-full border-0 rounded-lg bg-white"
          sandbox="allow-scripts allow-same-origin"
          title="Live Preview"
        />
      </div>
    </div>
  );
}