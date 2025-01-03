import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Progress } from "@/components/ui/progress";
import { FileType, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface FileUploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  path?: string;
  allowedTypes?: string[];
}

export default function FileUploadZone({ onUpload, path = "", allowedTypes }: FileUploadZoneProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewFile, setPreviewFile] = useState<{ file: File; preview: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) {
      toast({
        title: "Error",
        description: "No file selected",
        variant: "destructive",
      });
      return;
    }

    // Validate file type if allowedTypes is provided
    if (allowedTypes && allowedTypes.length > 0) {
      const isValidType = allowedTypes.some(type => {
        if (type.includes('*')) {
          const [mainType] = type.split('/');
          return file.type.startsWith(mainType);
        }
        return file.type === type;
      });

      if (!isValidType) {
        toast({
          title: "Error",
          description: "Invalid file type. Please upload a supported file type.",
          variant: "destructive",
        });
        return;
      }
    }

    // Create preview
    if (file.type.startsWith('image/')) {
      const preview = URL.createObjectURL(file);
      setPreviewFile({ file, preview });
    } else {
      setPreviewFile({ file, preview: '' });
    }

    setIsUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);

    try {
      await onUpload(file);
      setUploadProgress(100);
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      clearInterval(interval);
      setIsUploading(false);
      setTimeout(() => {
        setPreviewFile(null);
        setUploadProgress(0);
      }, 1000);
    }
  }, [onUpload, allowedTypes, toast]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: allowedTypes ? allowedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}) : undefined,
    maxFiles: 1,
    disabled: isUploading,
  });

  const removeFile = () => {
    if (previewFile?.preview) {
      URL.revokeObjectURL(previewFile.preview);
    }
    setPreviewFile(null);
    setUploadProgress(0);
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer",
          isDragActive && !isDragReject && "border-primary bg-primary/10",
          isDragReject && "border-destructive bg-destructive/10",
          !isDragActive && !isDragReject && "border-muted hover:border-muted-foreground/50",
          isUploading && "pointer-events-none opacity-50",
          previewFile && "border-none"
        )}
      >
        <input {...getInputProps()} />
        {previewFile ? (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              {previewFile.preview ? (
                <img
                  src={previewFile.preview}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded-lg"
                />
              ) : (
                <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                  <FileType className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{previewFile.file.name}</span>
                  {!isUploading && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile();
                      }}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {(previewFile.file.size / 1024 / 1024).toFixed(2)} MB
                </span>
                {isUploading && (
                  <Progress value={uploadProgress} className="mt-2" />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-8">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              {isDragActive
                ? "Drop the file here..."
                : "Drag and drop file here, or click to select file"}
            </p>
            {isDragReject && (
              <p className="mt-2 text-sm text-destructive">
                This file type is not supported
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}