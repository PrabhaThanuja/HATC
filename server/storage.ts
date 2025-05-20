import { 
  Bay, InsertBay, 
  Request, InsertRequest, 
  User, InsertUser, 
  bays, requests, users 
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // Bay operations
  getBays(): Promise<Bay[]>;
  getBay(id: number): Promise<Bay | undefined>;
  getBayByNumber(bayNumber: number): Promise<Bay | undefined>;
  createBay(bay: InsertBay): Promise<Bay>;
  updateBay(id: number, data: Partial<Bay>): Promise<Bay | undefined>;
  
  // Request operations
  getRequests(): Promise<Request[]>;
  getRequest(id: number): Promise<Request | undefined>;
  getRequestsByUser(userId: string): Promise<Request[]>;
  getPendingRequests(): Promise<Request[]>;
  createRequest(request: InsertRequest): Promise<Request>;
  updateRequest(id: number, data: Partial<Request>): Promise<Request | undefined>;
  deleteRequest(id: number): Promise<boolean>;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private bays: Map<number, Bay>;
  private requests: Map<number, Request>;
  private users: Map<number, User>;
  private currentBayId: number;
  private currentRequestId: number;
  private currentUserId: number;

  constructor() {
    this.bays = new Map();
    this.requests = new Map();
    this.users = new Map();
    this.currentBayId = 1;
    this.currentRequestId = 1;
    this.currentUserId = 1;
    
    // Initialize with some default bays for testing
    this.initializeBays();
    this.initializeUsers();
  }

  // Initialize 24 bays with specific free and occupied bays as requested
  private initializeBays() {
    // Create all bays as free first
    const initialBays: InsertBay[] = Array.from({ length: 24 }, (_, index) => {
      const bayNumber = index + 1;
      
      // Set specific bays to be occupied or pending as per request
      // Bays 2, 3, 5, 10, 12, 14, 17, 20, 22 should be selectable in the form
      if ([2, 3, 5, 10, 12, 14, 17, 20, 22].includes(bayNumber)) {
        return { bayNumber, status: 'free' };
      } else {
        return { bayNumber, status: 'free' };
      }
    });

    initialBays.forEach(bay => this.createBay(bay));
  }

  // Initialize default users for testing
  private initializeUsers() {
    const initialUsers: InsertUser[] = [
      { username: 'atc_user', password: 'password', role: 'atc', displayName: 'ATC Operator' },
      { username: 'stakeholder', password: 'password', role: 'stakeholder', displayName: 'Airline Operator' }
    ];

    initialUsers.forEach(user => this.createUser(user));
  }

  // Bay operations
  async getBays(): Promise<Bay[]> {
    return Array.from(this.bays.values());
  }

  async getBay(id: number): Promise<Bay | undefined> {
    return this.bays.get(id);
  }

  async getBayByNumber(bayNumber: number): Promise<Bay | undefined> {
    return Array.from(this.bays.values()).find(bay => bay.bayNumber === bayNumber);
  }

  async createBay(bay: InsertBay): Promise<Bay> {
    const id = this.currentBayId++;
    // Ensure default values are set
    const newBay: Bay = { 
      ...bay, 
      id, 
      status: bay.status || 'free',
      currentFlight: bay.currentFlight || null 
    };
    this.bays.set(id, newBay);
    return newBay;
  }

  async updateBay(id: number, data: Partial<Bay>): Promise<Bay | undefined> {
    const bay = this.bays.get(id);
    if (!bay) return undefined;

    const updatedBay = { ...bay, ...data };
    this.bays.set(id, updatedBay);
    return updatedBay;
  }

  // Request operations
  async getRequests(): Promise<Request[]> {
    return Array.from(this.requests.values());
  }

  async getRequest(id: number): Promise<Request | undefined> {
    return this.requests.get(id);
  }

  async getRequestsByUser(userId: string): Promise<Request[]> {
    return Array.from(this.requests.values()).filter(request => request.userId === userId);
  }

  async getPendingRequests(): Promise<Request[]> {
    return Array.from(this.requests.values()).filter(request => request.status === 'pending');
  }

  async createRequest(request: InsertRequest): Promise<Request> {
    const id = this.currentRequestId++;
    const now = new Date();
    // Ensure all required fields are set with default values
    const newRequest: Request = { 
      ...request, 
      id, 
      requestedAt: now,
      status: request.status || 'pending',
      suggestedBayId: request.suggestedBayId || null,
      notes: request.notes || null,
      responseNotes: request.responseNotes || null,
      respondedAt: null
    };
    this.requests.set(id, newRequest);
    
    // Update bay status to pending
    const bay = await this.getBay(request.requestedBayId);
    if (bay && bay.status === 'free') {
      await this.updateBay(bay.id, { status: 'pending' });
    }
    
    return newRequest;
  }

  async updateRequest(id: number, data: Partial<Request>): Promise<Request | undefined> {
    const request = this.requests.get(id);
    if (!request) return undefined;

    // If status is changing, update the respondedAt timestamp
    const updatedData: Partial<Request> = { ...data };
    if (data.status && data.status !== request.status) {
      updatedData.respondedAt = new Date();
    }

    const updatedRequest = { ...request, ...updatedData };
    this.requests.set(id, updatedRequest);

    // Update bay status based on request status change
    if (data.status) {
      const bay = await this.getBay(request.requestedBayId);
      if (bay) {
        if (data.status === 'approved') {
          await this.updateBay(bay.id, { 
            status: 'occupied', // Note: We're using 'occupied' value from database schema but displaying as 'blocked' in the UI
            currentFlight: request.flightCallsign 
          });
        } else if (data.status === 'denied') {
          // If the bay was pending and now the request is denied, set it back to free
          if (bay.status === 'pending') {
            await this.updateBay(bay.id, { status: 'free', currentFlight: null });
          }
        }
      }
    }

    return updatedRequest;
  }

  async deleteRequest(id: number): Promise<boolean> {
    return this.requests.delete(id);
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const newUser = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }
}

// Export storage instance
export const storage = new MemStorage();
