import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface LivePreviewProps {
  code: string;
  isBuilding: boolean;
}

// Default Pong game code if none is provided
const DEFAULT_GAME_CODE = `
// Game is already initialized with canvas and context
// Just start the game loop
const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

// Game state is already set up in game object
// You can access: game.ball, game.leftPaddle, game.rightPaddle
// Controls are already set up for arrow keys
// Just start the game loop
game.running = true;
gameLoop();
`;

export default function LivePreview({ code, isBuilding }: LivePreviewProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generatePreview = async () => {
      try {
        const response = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code || DEFAULT_GAME_CODE }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = await response.json();
        setPreview(data.preview);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setPreview(null);
      }
    };

    generatePreview();
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
        <p className="text-sm text-muted-foreground">Initializing game preview...</p>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={preview}
      className="w-full h-full border-0 rounded-lg bg-black"
      sandbox="allow-scripts"
      title="Live Preview"
    />
  );
}