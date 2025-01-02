import { useMutation, useQueryClient } from "@tanstack/react-query";

export async function createFile(path: string, name: string): Promise<void> {
  const response = await fetch("/api/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, name, type: "file" }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export async function createFolder(path: string, name: string): Promise<void> {
  const response = await fetch("/api/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, name, type: "folder" }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export async function deleteFile(path: string): Promise<void> {
  const response = await fetch(`/api/files/${encodeURIComponent(path)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}
