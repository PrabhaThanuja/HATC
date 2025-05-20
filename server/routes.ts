import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import { insertRequestSchema } from "@shared/schema";
import { setupAuth } from "./auth";

// Connected WebSocket clients
const clients = new Map<string, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Set up authentication
  setupAuth(app);
  
  // Set up WebSocket server on /ws path
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // Implement a heartbeat mechanism to keep connections alive
  function heartbeat(this: WebSocket) {
    (this as any).isAlive = true;
  }
  
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if ((ws as any).isAlive === false) {
        return ws.terminate();
      }
      
      (ws as any).isAlive = false;
      try {
        ws.ping();
      } catch (error) {
        console.error("Error sending ping:", error);
      }
    });
  }, 10000); // 10-second heartbeat
  
  wss.on("connection", (ws) => {
    const clientId = Math.random().toString(36).substring(2, 15);
    clients.set(clientId, ws);
    console.log(`WebSocket client connected: ${clientId}`);
    
    // Set up heartbeat
    (ws as any).isAlive = true;
    ws.on("pong", heartbeat);

    // Send initial data to client
    sendInitialData(ws);

    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleWebSocketMessage(data, clientId);
      } catch (error) {
        console.error("Error parsing websocket message:", error);
      }
    });

    ws.on("close", () => {
      console.log(`WebSocket client disconnected: ${clientId}`);
      clients.delete(clientId);
    });
    
    ws.on("error", (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
    });
  });
  
  // Clear heartbeat interval when server closes
  httpServer.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  // Bay routes
  app.get("/api/bays", async (req: Request, res: Response) => {
    try {
      const bays = await storage.getBays();
      res.json(bays);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bays" });
    }
  });

  app.get("/api/bays/:id", async (req: Request, res: Response) => {
    try {
      const bay = await storage.getBay(parseInt(req.params.id));
      if (!bay) {
        return res.status(404).json({ message: "Bay not found" });
      }
      res.json(bay);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bay" });
    }
  });
  
  // Regular bay update endpoint
  app.patch("/api/bays/:id", async (req: Request, res: Response) => {
    try {
      const bayId = parseInt(req.params.id);
      const bay = await storage.getBay(bayId);
      
      if (!bay) {
        return res.status(404).json({ message: "Bay not found" });
      }
      
      const updatedBay = await storage.updateBay(bayId, req.body);
      
      // Broadcast the update to all connected clients
      broadcastMessage({
        type: 'BAY_UPDATE',
        payload: updatedBay
      });
      
      res.json(updatedBay);
    } catch (error) {
      console.error('Error updating bay:', error);
      res.status(500).json({ message: "Failed to update bay" });
    }
  });

  // Request routes
  app.get("/api/requests", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      let requests;
      
      if (userId) {
        requests = await storage.getRequestsByUser(userId);
      } else {
        requests = await storage.getRequests();
      }
      
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

  app.get("/api/requests/pending", async (req: Request, res: Response) => {
    try {
      const requests = await storage.getPendingRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending requests" });
    }
  });

  app.post("/api/requests", async (req: Request, res: Response) => {
    try {
      const validatedData = insertRequestSchema.parse(req.body);
      const request = await storage.createRequest(validatedData);
      
      // Broadcast the new request to all clients
      broadcastMessage({
        type: "NEW_REQUEST",
        payload: request
      });
      
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create request" });
    }
  });

  app.patch("/api/requests/:id", async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.id);
      const request = await storage.getRequest(requestId);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      const updatedRequest = await storage.updateRequest(requestId, req.body);
      
      // Broadcast the updated request to all clients
      broadcastMessage({
        type: "REQUEST_RESPONSE",
        payload: updatedRequest
      });
      
      // If status changed to approved, update the bay status and broadcast
      if (req.body.status === 'approved') {
        // Get the bay and update its status to occupied
        const bay = await storage.getBay(request.requestedBayId);
        if (bay) {
          // Update bay to occupied status with the flight callsign
          const updatedBay = await storage.updateBay(request.requestedBayId, {
            status: 'occupied',
            currentFlight: request.flightCallsign
          });
          
          // Broadcast the updated bay to all clients
          broadcastMessage({
            type: "BAY_UPDATE",
            payload: updatedBay
          });
        }
      } else if (req.body.status === 'denied') {
        // Just broadcast the bay to update UI if request was denied
        const bay = await storage.getBay(request.requestedBayId);
        if (bay) {
          broadcastMessage({
            type: "BAY_UPDATE",
            payload: bay
          });
        }
      }
      
      res.json(updatedRequest);
    } catch (error) {
      res.status(500).json({ message: "Failed to update request" });
    }
  });

  app.post("/api/requests/:id/suggest", async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.id);
      const { suggestedBayId, notes } = req.body;
      
      if (!suggestedBayId) {
        return res.status(400).json({ message: "Suggested bay ID is required" });
      }
      
      const request = await storage.getRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      const updatedRequest = await storage.updateRequest(requestId, {
        suggestedBayId,
        responseNotes: notes
      });
      
      // Broadcast the alternative suggestion to all clients
      broadcastMessage({
        type: "REQUEST_ALTERNATIVE",
        payload: updatedRequest
      });
      
      res.json(updatedRequest);
    } catch (error) {
      res.status(500).json({ message: "Failed to suggest alternative bay" });
    }
  });

  app.delete("/api/requests/:id", async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.id);
      const success = await storage.deleteRequest(requestId);
      
      if (!success) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete request" });
    }
  });

  // Update bay status (for ATC to free up blocked bays)
  app.patch("/api/bays/:id/free", async (req: Request, res: Response) => {
    try {
      // Only allow ATC users to update bay status
      if (!req.isAuthenticated() || req.user.role !== 'atc') {
        return res.status(403).json({ message: "Unauthorized - only ATC can free bays" });
      }

      const bayId = parseInt(req.params.id);
      
      // Only allow changing from occupied (blocked) to free
      const bay = await storage.getBay(bayId);
      if (!bay) {
        return res.status(404).json({ message: "Bay not found" });
      }
      
      if (bay.status !== 'occupied') {
        return res.status(400).json({ message: "Can only free bays that are currently blocked" });
      }
      
      const updatedBay = await storage.updateBay(bayId, { 
        status: 'free', 
        currentFlight: null 
      });
      
      // Broadcast the bay update to all connected clients
      broadcastMessage({
        type: 'BAY_UPDATE',
        payload: updatedBay
      });
      
      res.json(updatedBay);
    } catch (error) {
      console.error('Error updating bay status:', error);
      res.status(500).json({ message: "Failed to free bay" });
    }
  });


  return httpServer;
}

// Helper functions for WebSocket communication
async function sendInitialData(ws: WebSocket) {
  try {
    const bays = await storage.getBays();
    const requests = await storage.getRequests();
    
    ws.send(JSON.stringify({
      type: "INITIAL_DATA",
      payload: { bays, requests }
    }));
  } catch (error) {
    console.error("Error sending initial data:", error);
  }
}

function handleWebSocketMessage(data: any, clientId: string) {
  // Route WebSocket messages to appropriate handlers
  switch (data.type) {
    case "BAY_UPDATE":
      broadcastMessage(data);
      break;
    case "REQUEST_UPDATE":
      broadcastMessage(data);
      break;
    case "NEW_REQUEST":
      broadcastMessage(data);
      break;
    case "PING":
      // Just acknowledge pings, no need to do anything
      console.log(`Received ping from client ${clientId}`);
      break;
    default:
      console.log("Unknown message type:", data.type);
  }
}

function broadcastMessage(data: any) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
