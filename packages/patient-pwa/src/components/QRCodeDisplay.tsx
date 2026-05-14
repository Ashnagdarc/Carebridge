"use client";
// CareBridge: Reusable UI component implementation.

import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "./Button";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  title?: string;
  onDownload?: () => void;
}

/**
 * QR Code Display Component
 * Displays a QR code with download and share options
 */
export function QRCodeDisplay({
  value,
  size = 256,
  title = "QR Code",
  onDownload,
}: QRCodeDisplayProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    // Convert SVG to PNG
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `qr-code-${Date.now()}.png`;
      link.click();

      if (onDownload) {
        onDownload();
      }
    };

    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleShare = async () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    try {
      // Convert SVG to PNG
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();

      img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(async (blob) => {
          if (!blob) return;

          if (
            typeof navigator !== "undefined" &&
            "share" in navigator &&
            typeof navigator.share === "function"
          ) {
            try {
              const file = new File([blob], `qr-code-${Date.now()}.png`, {
                type: "image/png",
              });

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (navigator as any).share({
                files: [file],
                title: "My QR Code",
              });
            } catch (error) {
              console.error("Share failed:", error);
            }
          } else {
            // Fallback: download
            handleDownload();
          }
        });
      };

      img.src =
        "data:image/svg+xml;base64," +
        btoa(unescape(encodeURIComponent(svgData)));
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {title && (
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      )}

      <div
        ref={qrRef}
        className="p-4 bg-white rounded-lg border-2 border-secondary"
      >
        <QRCodeSVG
          value={value}
          size={size}
          level="H"
          includeMargin={true}
          fgColor="#000000"
          bgColor="#FFFFFF"
        />
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        <Button variant="secondary" size="sm" onClick={handleDownload}>
          Download QR
        </Button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <Button variant="secondary" size="sm" onClick={handleShare}>
            Share QR
          </Button>
        )}
      </div>
    </div>
  );
}
