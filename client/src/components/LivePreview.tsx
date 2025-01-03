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

  useEffect(() => {
    if (!code) return;

    const updatePreview = async () => {
      try {
        // Create a proper React component from the code
        const preview = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body {
                margin: 0;
                padding: 1rem;
                min-height: 100vh;
                background: transparent;
              }
              #root {
                height: 100%;
              }
            </style>
          </head>
          <body>
            <div id="root"></div>
            <script type="module">
              import React from 'https://esm.sh/react@18.2.0';
              import ReactDOM from 'https://esm.sh/react-dom@18.2.0';
              import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';

              const Component = () => {
                try {
                  return ${code};
                } catch (error) {
                  return React.createElement('div', { style: { color: 'red' } }, error.message);
                }
              };

              const root = createRoot(document.getElementById('root'));
              root.render(React.createElement(Component));
            </script>
          </body>
          </html>
        `;
        setPreview(preview);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setPreview(null);
      }
    };

    const timeoutId = setTimeout(updatePreview, 500);
    return () => clearTimeout(timeoutId);
  }, [code]);

  if (isBuilding) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Building preview...</p>
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

  if (!preview) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No preview available</p>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={preview}
      className="w-full h-full border-0 bg-white rounded-lg"
      sandbox="allow-scripts"
      title="Live Preview"
    />
  );
}