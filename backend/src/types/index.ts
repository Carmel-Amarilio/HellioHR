import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'viewer' | 'editor';
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// Frontend contract types (must match frontend exactly)
export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  positionIds: string[];
  cvUrl: string;
  status: 'active' | 'inactive';
}

export interface Position {
  id: string;
  title: string;
  department: string;
  description: string;
  candidateIds: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: 'viewer' | 'editor';
  };
}

export interface MeResponse {
  id: string;
  email: string;
  role: 'viewer' | 'editor';
}

export interface ApiError {
  error: string;
  message: string;
}
