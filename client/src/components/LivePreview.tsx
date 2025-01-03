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
        // Convert the code to a self-contained React component
        const componentCode = `
          ${code}
          // Make sure the component is the default export
          export default function PreviewComponent() {
            return ${code};
          }
        `;

        const response = await fetch('/api/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: componentCode }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const result = await response.json();
        setPreview(result.preview);
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