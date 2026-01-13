import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { randomUUID } from "crypto";

// In-memory storage for export files (auto-expires after 5 minutes)
interface ExportFile {
  data: Buffer;
  filename: string;
  mimeType: string;
  createdAt: number;
}

const exportStore = new Map<string, ExportFile>();

// Cleanup expired exports every minute
setInterval(() => {
  const now = Date.now();
  const FIVE_MINUTES = 5 * 60 * 1000;
  const entries = Array.from(exportStore.entries());
  for (let i = 0; i < entries.length; i++) {
    const [token, file] = entries[i];
    if (now - file.createdAt > FIVE_MINUTES) {
      exportStore.delete(token);
    }
  }
}, 60000);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Export file upload endpoint - receives base64 data, stores temporarily
  app.post("/api/exports", (req: Request, res: Response) => {
    try {
      const { data, filename, mimeType } = req.body;
      
      if (!data || !filename) {
        return res.status(400).json({ error: "Missing data or filename" });
      }
      
      // Decode base64 data
      const buffer = Buffer.from(data, "base64");
      const token = randomUUID();
      
      exportStore.set(token, {
        data: buffer,
        filename,
        mimeType: mimeType || "application/octet-stream",
        createdAt: Date.now(),
      });
      
      res.json({ token, url: `/api/exports/${token}` });
    } catch (error) {
      console.error("Export upload error:", error);
      res.status(500).json({ error: "Failed to process export" });
    }
  });
  
  // Export file download endpoint - serves file with Content-Disposition
  app.get("/api/exports/:token", (req: Request, res: Response) => {
    const { token } = req.params;
    const file = exportStore.get(token);
    
    if (!file) {
      return res.status(404).json({ error: "Export not found or expired" });
    }
    
    // Set headers for file download
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    res.setHeader("Content-Length", file.data.length);
    
    // Send the file
    res.send(file.data);
    
    // Delete after download (one-time use)
    exportStore.delete(token);
  });

  return httpServer;
}
