import { useEffect, useState } from "react";
import { Loader2, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LivePreviewProps {
  htmlContent?: string;
  isLoading?: boolean;
  code?: string;
  isBuilding?: boolean;
}

export default function LivePreview({ htmlContent, isLoading, code, isBuilding }: LivePreviewProps) {
  const [error, setError] = useState<string | null>(null);
  const [sanitizedContent, setSanitizedContent] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (htmlContent) {
      try {
        // Enhanced template with proper meta tags and viewport settings
        const contentWithMeta = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
              <meta http-equiv="X-UA-Compatible" content="IE=edge">
              <base target="_blank">
              <style>
                html, body {
                  margin: 0;
                  padding: 0;
                  width: 100%;
                  height: 100%;
                  overflow: auto;
                }
                /* Ensure all content is contained */
                img, video, iframe {
                  max-width: 100%;
                  height: auto;
                }
                /* Custom scrollbar for better UX */
                ::-webkit-scrollbar {
                  width: 8px;
                  height: 8px;
                }
                ::-webkit-scrollbar-track {
                  background: #f1f1f1;
                }
                ::-webkit-scrollbar-thumb {
                  background: #888;
                  border-radius: 4px;
                }
                ::-webkit-scrollbar-thumb:hover {
                  background: #555;
                }
              </style>
            </head>
            <body>
              ${htmlContent}
              <script>
                // Handle dynamic content loading
                document.addEventListener('DOMContentLoaded', function() {
                  // Ensure external resources load properly
                  const images = document.getElementsByTagName('img');
                  for (let img of images) {
                    img.onerror = function() {
                      this.style.display = 'none';
                    };
                  }
                });
              </script>
            </body>
          </html>
        `;
        setSanitizedContent(contentWithMeta);
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
      <div className="h-full flex items-center justify-center border-2 border-dashed border-muted rounded-lg p-8">
        <div className="text-center max-w-md">
          <p className="text-lg font-medium text-muted-foreground mb-2">No preview available</p>
          <p className="text-sm text-muted-foreground">
            Upload an image, document, or provide code to see the preview
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-background">
      {/* Controls */}
      <div className="p-2 border-b flex items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setScale(s => Math.max(0.25, s - 0.25))}
          disabled={scale <= 0.25}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setScale(s => Math.min(2, s + 0.25))}
          disabled={scale >= 2}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setScale(1)}
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground ml-2">
          {Math.round(scale * 100)}%
        </span>
      </div>

      {/* Preview Container */}
      <div className="flex-1 overflow-auto relative">
        <div 
          className="absolute inset-0 overflow-auto"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: `${100 / scale}%`,
            height: `${100 / scale}%`
          }}
        >
          <iframe
            srcDoc={sanitizedContent}
            className={cn(
              "w-full h-full border-0",
              "bg-white rounded-md shadow-sm"
            )}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title="Live Preview"
          />
        </div>
      </div>
    </div>
  );
}