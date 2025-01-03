import { useEffect, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";

interface FileSyncProps {
  fileId: string;
  content: string;
  onContentChange: (content: string) => void;
}

export default function FileSync({ fileId, content, onContentChange }: FileSyncProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize WebSocket connection
    const ws = new WebSocket(`ws://${window.location.host}/ws/sync/${fileId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to sync server');
      // Send initial content
      if (content) {
        ws.send(JSON.stringify({ type: 'init', content }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'update' && data.content !== content) {
          onContentChange(data.content);
        }
      } catch (error) {
        console.error('Failed to process sync message:', error);
      }
    };

    ws.onerror = () => {
      toast({
        title: "Sync Error",
        description: "Failed to connect to sync server",
        variant: "destructive",
      });
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [fileId, content, onContentChange, toast]);

  return null; // This is a non-visual component
}
