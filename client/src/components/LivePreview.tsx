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

  useEffect(() => {
    let isMounted = true;
    const generatePreview = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = await response.json();
        if (data.preview && isMounted) {
          setPreview(data.preview);
        } else if (isMounted) {
          setError('No preview content received');
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setPreview(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Generate preview when code changes and is not empty
    if (code && code.trim()) {
      generatePreview();
    } else {
      setPreview(null);
      setError(null);
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [code]);

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

  if (!code || !code.trim()) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Enter code in the editor to see preview</p>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Preparing preview...</p>
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