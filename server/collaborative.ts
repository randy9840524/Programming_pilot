import { WebSocket, WebSocketServer } from 'ws';
import { type Server } from 'http';
import { db } from "@db";
import { files } from "@db/schema";
import { eq } from "drizzle-orm";

interface Client {
  ws: WebSocket;
  id: string;
  file?: string;
}

interface CursorPosition {
  line: number;
  column: number;
}

interface CollaborationMessage {
  type: 'cursor' | 'selection' | 'edit';
  file: string;
  userId: string;
  data: {
    position?: CursorPosition;
    selection?: { start: CursorPosition; end: CursorPosition };
    content?: string;
  };
}

export function setupCollaborativeEditing(server: Server) {
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Map<string, Client>();

  server.on('upgrade', (request, socket, head) => {
    if (request.url === '/ws/collaborative') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        const clientId = Math.random().toString(36).substr(2, 9);
        const client: Client = { ws, id: clientId };
        clients.set(clientId, client);

        ws.on('message', async (message: string) => {
          try {
            const data: CollaborationMessage = JSON.parse(message);
            client.file = data.file;

            // Broadcast to all clients viewing the same file
            Array.from(clients.entries()).forEach(([id, otherClient]) => {
              if (id !== clientId && otherClient.file === data.file) {
                otherClient.ws.send(JSON.stringify({
                  ...data,
                  userId: clientId
                }));
              }
            });

            // If it's an edit, update the file in the database
            if (data.type === 'edit' && data.data.content) {
              await db.update(files)
                .set({ content: data.data.content })
                .where(eq(files.path, data.file));
            }
          } catch (error) {
            console.error('Failed to handle collaborative message:', error);
          }
        });

        ws.on('close', () => {
          clients.delete(clientId);
          // Notify other clients that this user has left
          Array.from(clients.entries()).forEach(([, otherClient]) => {
            if (otherClient.file === client.file) {
              otherClient.ws.send(JSON.stringify({
                type: 'user_left',
                userId: clientId,
                file: client.file
              }));
            }
          });
        });
      });
    }
  });

  return wss;
}