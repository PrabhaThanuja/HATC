import { useEffect, useRef, useState, useCallback } from "react";
import { WebSocketMessage } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;
    
    // Determine WebSocket protocol and path
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log("Connecting to WebSocket server at:", wsUrl);
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    
    // Set up a ping interval to keep the connection alive
    let pingInterval: number | null = null;
    
    socket.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      options.onOpen?.();
      
      // Start sending pings to keep the connection alive
      pingInterval = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          // Send a ping message - this can be any small message
          socket.send(JSON.stringify({ type: "PING" }));
        }
      }, 15000); // Send a ping every 15 seconds
    };
    
    socket.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      options.onClose?.();
      
      // Clear ping interval when connection closes
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
      
      // Attempt to reconnect after a delay
      setTimeout(() => {
        connect();
      }, 2000);
    };
    
    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      options.onError?.(error);
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket message received:", data);
        
        // Handle notification messages
        handleNotifications(data);
        
        // Pass all messages to onMessage callback
        options.onMessage?.(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
  }, [options]);
  
  const handleNotifications = (data: WebSocketMessage) => {
    // Get current user ID from localStorage (set during login)
    const currentUserId = localStorage.getItem('userId');
    
    console.log(`WebSocket message received (${data.type}). Current user ID: ${currentUserId}`);
    
    // Show notifications for certain message types
    switch (data.type) {
      case "NEW_REQUEST":
        toast({
          title: "New Request",
          description: `New bay request received for bay ${(data.payload as any).requestedBayId}`,
          variant: "default",
        });
        break;
      case "REQUEST_RESPONSE":
        const status = (data.payload as any).status;
        if (status === "approved" || status === "denied") {
          toast({
            title: `Request ${status}`,
            description: `Your request has been ${status}`,
            variant: status === "approved" ? "default" : "destructive",
          });
        }
        break;
      case "REQUEST_ALTERNATIVE":
        toast({
          title: "Alternative Suggested",
          description: "An alternative bay has been suggested for your request",
          variant: "default",
        });
        break;
      case "CALL_ATC":
        // Check if this call is directed at the current user
        console.log("CALL_ATC message received:", data.payload);
        const callPayload = data.payload as any;
        
        // Debugging
        console.log(`Call payload userId: ${callPayload.userId}, current userId: ${currentUserId}, match: ${callPayload.userId === currentUserId}`);
        
        // For stakeholder view (userId = 2)
        if (currentUserId === "2") {
          toast({
            title: "ATC Call Request",
            description: callPayload.message || "Air Traffic Control has requested you to give them a call",
            variant: "destructive",
          });
          
          // Force update notification banner in stakeholder dashboard
          window.dispatchEvent(new CustomEvent('atc-call', { 
            detail: { message: callPayload.message || "Please call ATC" } 
          }));
        } 
        // For ATC view (userId = 1)
        else if (currentUserId === "1") {
          toast({
            title: "Call Request",
            description: "A stakeholder is requesting a call with ATC",
            variant: "destructive",
          });
        }
        break;
    }
  };
  
  const send = useCallback((data: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    } else {
      console.error("WebSocket not connected");
    }
  }, []);
  
  // Connect on component mount
  useEffect(() => {
    connect();
    
    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);
  
  return { isConnected, send };
}
