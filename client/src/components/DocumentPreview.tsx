import { useState } from "react";
import { Document, Page } from "react-pdf";
import { read as readXLSX } from "xlsx";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface DocumentPreviewProps {
  file: string;
  type: string;
}

export default function DocumentPreview({ file, type }: DocumentPreviewProps) {
  const [numPages, setNumPages] = useState<number>(1);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  const renderPreview = () => {
    const extension = file.split(".").pop()?.toLowerCase();

    switch (extension) {
      case "pdf":
        return (
          <Document
            file={`/api/files/${encodeURIComponent(file)}`}
            onLoadSuccess={({ numPages }) => {
              setNumPages(numPages);
              setLoading(false);
            }}
            loading={<Loader2 className="h-6 w-6 animate-spin" />}
          >
            <Page pageNumber={pageNumber} />
          </Document>
        );

      case "docx":
      case "doc":
        return (
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
              window.location.origin + "/api/files/" + encodeURIComponent(file)
            )}`}
            width="100%"
            height="600px"
            frameBorder="0"
          />
        );

      case "xlsx":
      case "xls":
        return (
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
              window.location.origin + "/api/files/" + encodeURIComponent(file)
            )}`}
            width="100%"
            height="600px"
            frameBorder="0"
          />
        );

      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
        return (
          <img
            src={`/api/files/${encodeURIComponent(file)}`}
            alt="Preview"
            className="max-w-full h-auto"
            onLoad={() => setLoading(false)}
          />
        );

      default:
        return (
          <div className="p-4 text-muted-foreground">
            Preview not available for this file type
          </div>
        );
    }
  };

  return (
    <Card className="h-full">
      <ScrollArea className="h-full">
        <div className="p-4">
          {loading && <Loader2 className="h-6 w-6 animate-spin mx-auto" />}
          {renderPreview()}
        </div>
      </ScrollArea>
    </Card>
  );
}
