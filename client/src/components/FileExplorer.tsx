import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { createFile, createFolder, deleteFile } from "@/lib/files";

interface FileExplorerProps {
  onFileSelect: (file: string) => void;
  selectedFile: string | null;
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
}

export default function FileExplorer({ onFileSelect, selectedFile }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([""]));
  const [newItemPath, setNewItemPath] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");

  const { data: files = [], refetch } = useQuery<FileNode[]>({
    queryKey: ["/api/files"],
  });

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const startNewItem = (path: string, type: "file" | "folder") => {
    setNewItemPath(path);
    setNewItemName("");
  };

  const handleCreate = async (type: "file" | "folder") => {
    if (!newItemPath || !newItemName) return;

    try {
      if (type === "file") {
        await createFile(newItemPath, newItemName);
      } else {
        await createFolder(newItemPath, newItemName);
      }
      setNewItemPath(null);
      setNewItemName("");
      refetch();
    } catch (error) {
      console.error("Failed to create:", error);
    }
  };

  const handleDelete = async (path: string) => {
    try {
      await deleteFile(path);
      refetch();
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const renderTree = (node: FileNode, path: string = "") => {
    const fullPath = path ? `${path}/${node.name}` : node.name;
    const isExpanded = expandedFolders.has(fullPath);

    return (
      <div key={fullPath}>
        <div
          className={cn(
            "flex items-center gap-2 p-1 hover:bg-accent rounded-sm group",
            selectedFile === fullPath && "bg-accent"
          )}
        >
          {node.type === "folder" ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4"
              onClick={() => toggleFolder(fullPath)}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="w-4" />
          )}
          
          {node.type === "folder" ? (
            <Folder className="h-4 w-4" />
          ) : (
            <File className="h-4 w-4" />
          )}

          <span
            className="flex-1 cursor-pointer"
            onClick={() => {
              if (node.type === "file") {
                onFileSelect(fullPath);
              } else {
                toggleFolder(fullPath);
              }
            }}
          >
            {node.name}
          </span>

          <div className="hidden group-hover:flex items-center gap-1">
            {node.type === "folder" && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => startNewItem(fullPath, "file")}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={() => handleDelete(fullPath)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {node.type === "folder" && isExpanded && (
          <div className="ml-4">
            {node.children?.map((child) => renderTree(child, fullPath))}
            {newItemPath === fullPath && (
              <div className="flex items-center gap-2 p-1">
                <Input
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreate("file");
                    } else if (e.key === "Escape") {
                      setNewItemPath(null);
                    }
                  }}
                  placeholder="New file name..."
                  className="h-6 text-sm"
                  autoFocus
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">Files</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => startNewItem("", "folder")}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="h-[calc(100vh-5rem)]">
        {files.map((node) => renderTree(node))}
        {newItemPath === "" && (
          <div className="flex items-center gap-2 p-1">
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreate("folder");
                } else if (e.key === "Escape") {
                  setNewItemPath(null);
                }
              }}
              placeholder="New folder name..."
              className="h-6 text-sm"
              autoFocus
            />
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
