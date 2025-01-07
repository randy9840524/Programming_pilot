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
    const generatePreview = async () => {
      try {
        setError(null);

        const response = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code || '' }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = await response.json();
        if (data.preview) {
          setPreview(data.preview);
        } else {
          setError('No preview content received');
        }
      } catch (err: any) {
        setError(err.message);
        setPreview(null);
      }
    };

    // Only generate preview if we have code
    if (code && code.trim()) {
      generatePreview();
    } else {
      setPreview(null);
      setError(null);
    }
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
        <p className="text-sm text-muted-foreground">Enter code to see preview</p>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={preview}
      className="w-full h-full border-0 rounded-lg bg-background"
      sandbox="allow-scripts allow-pointer-lock allow-same-origin"
      title="Live Preview"
    />
  );
}