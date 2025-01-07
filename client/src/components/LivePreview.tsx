import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface LivePreviewProps {
  code: string;
  isBuilding: boolean;
}

export default function LivePreview({ code, isBuilding }: LivePreviewProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Default preview HTML to show when no code is provided
  const defaultPreview = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f5f5;
            color: #374151;
          }
          .preview-message {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .preview-heading {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 1rem;
          }
          .preview-text {
            font-size: 0.875rem;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="preview-message">
          <h2 class="preview-heading">Live Preview Ready</h2>
          <p class="preview-text">Enter your code in the editor to see it in action</p>
        </div>
      </body>
    </html>
  `;

  useEffect(() => {
    let isMounted = true;

    const generatePreview = async () => {
      if (!code || !code.trim()) {
        setPreview(defaultPreview);
        setError(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code.trim() }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = await response.json();

        if (isMounted) {
          setPreview(data.preview || defaultPreview);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Preview generation error:', err);
          setError(err.message || 'Failed to generate preview');
          setPreview(defaultPreview);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    generatePreview();

    return () => {
      isMounted = false;
    };
  }, [code, defaultPreview]);

  if (isBuilding || isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {isBuilding ? 'Building preview...' : 'Generating preview...'}
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

  return (
    <iframe
      srcDoc={preview || defaultPreview}
      className="w-full h-full border-0 rounded-lg bg-background"
      sandbox="allow-scripts allow-pointer-lock allow-same-origin"
      title="Live Preview"
    />
  );
}