"use client";

import * as React from "react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExportButtonProps {
  targetRef: React.RefObject<HTMLElement | null>;
  filename?: string;
  className?: string;
}

/**
 * Export button component that generates a 16:9 PNG image of the target element
 */
export function ExportButton({
  targetRef,
  filename = "commitline-chart",
  className,
}: ExportButtonProps) {
  const [exporting, setExporting] = React.useState(false);

  const handleExport = async () => {
    if (!targetRef.current) {
      toast.error("Export failed", {
        description: "Chart element not found",
      });
      return;
    }

    setExporting(true);

    try {
      // Capture the target element
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: null,
        scale: 2, // Higher resolution for better quality
        logging: false,
        useCORS: true,
      });

      // Create a new canvas with 16:9 aspect ratio
      const targetWidth = 1920;
      const targetHeight = 1080; // 16:9 aspect ratio

      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = targetWidth;
      exportCanvas.height = targetHeight;

      const ctx = exportCanvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      // Fill with dark background (matches dark mode card bg)
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Calculate scaling to fit the captured content while maintaining aspect ratio
      const sourceWidth = canvas.width;
      const sourceHeight = canvas.height;
      const sourceAspect = sourceWidth / sourceHeight;
      const targetAspect = targetWidth / targetHeight;

      let drawWidth, drawHeight, drawX, drawY;

      if (sourceAspect > targetAspect) {
        // Source is wider, fit to width
        drawWidth = targetWidth;
        drawHeight = targetWidth / sourceAspect;
        drawX = 0;
        drawY = (targetHeight - drawHeight) / 2;
      } else {
        // Source is taller, fit to height
        drawHeight = targetHeight;
        drawWidth = targetHeight * sourceAspect;
        drawX = (targetWidth - drawWidth) / 2;
        drawY = 0;
      }

      // Draw the captured content centered in the 16:9 canvas
      ctx.drawImage(canvas, drawX, drawY, drawWidth, drawHeight);

      // Convert to PNG and download
      const dataUrl = exportCanvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("Export successful", {
        description: "Your chart has been downloaded as a PNG image",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export failed", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while exporting",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={exporting}
      className={className}
    >
      {exporting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Export PNG
    </Button>
  );
}
