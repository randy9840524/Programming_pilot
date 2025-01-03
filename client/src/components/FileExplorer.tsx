import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  Plus,
  Trash2,
  Upload,
  FileType,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";
import { createFile, createFolder, deleteFile } from "@/lib/files";
import { useToast } from "@/hooks/use-toast";
import FileUploadZone from "./FileUploadZone";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface FileExplorerProps {
  onFileSelect: (file: string) => void;
  selectedFile: string | null;
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
}

const ALLOWED_FILE_TYPES = {
  "image/*": ["jpeg", "png", "gif"],
  "application/pdf": ["pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/msword": ["doc"],
  "application/vnd.ms-excel": ["xls"],
};

export default function FileExplorer({ onFileSelect, selectedFile }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([""]));
  const [newItemPath, setNewItemPath] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [uploadPath, setUploadPath] = useState<string>("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const { toast } = useToast();

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

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", uploadPath);
    formData.append("processOCR", (file.type === "application/pdf").toString());

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to upload file');
      }

      toast({
        title: "Success",
        description: "File uploaded successfully",
      });

      await refetch();
      setShowUploadDialog(false);
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  const startUpload = (path: string = "") => {
    setUploadPath(path);
    setShowUploadDialog(true);
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
      toast({
        title: "Error",
        description: `Failed to create ${type}`,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (path: string) => {
    try {
      await deleteFile(path);
      refetch();
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete:", error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    switch (ext) {
      case "pdf":
        return "file-text";
      case "doc":
      case "docx":
        return "file-text";
      case "xls":
      case "xlsx":
        return "file-spreadsheet";
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return "image";
      default:
        return "file";
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
            <FileType className="h-4 w-4" />
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
                  onClick={() => startUpload(fullPath)}
                >
                  <Upload className="h-3 w-3" />
                </Button>
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
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => startUpload()}
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => startNewItem("", "folder")}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
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

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <FileUploadZone
            onUpload={handleUpload}
            path={uploadPath}
            allowedTypes={Object.keys(ALLOWED_FILE_TYPES)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}