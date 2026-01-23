import positionsData from '../data/positions.json';
import type { Position } from '../types';
import { apiClient } from './apiClient';

const positions = positionsData as Position[];

// Use API mode when authenticated, fallback to JSON for development
const shouldUseApi = () => apiClient.isAuthenticated();

// Synchronous functions (original - for backward compatibility)
export function getAllPositions(): Position[] {
  return positions;
}

export function getPositionById(id: string): Position | undefined {
  return positions.find((p) => p.id === id);
}

export function getPositionsByIds(ids: string[]): Position[] {
  return positions.filter((p) => ids.includes(p.id));
}

export function getOpenPositions(): Position[] {
  return positions;
}

// Async API functions
export async function fetchAllPositions(): Promise<Position[]> {
  if (!shouldUseApi()) {
    return positions;
  }
  return apiClient.get<Position[]>('/api/positions');
}

export async function fetchPositionById(id: string): Promise<Position | undefined> {
  if (!shouldUseApi()) {
    return positions.find((p) => p.id === id);
  }
  try {
    return await apiClient.get<Position>(`/api/positions/${id}`);
  } catch {
    return undefined;
  }
}

export async function fetchPositionsByIds(ids: string[]): Promise<Position[]> {
  if (!shouldUseApi()) {
    return positions.filter((p) => ids.includes(p.id));
  }
  // Fetch all and filter client-side
  const allPositions = await apiClient.get<Position[]>('/api/positions');
  return allPositions.filter((p) => ids.includes(p.id));
}

export interface UpdatePositionData {
  title?: string;
  department?: string;
  description?: string;
}

export async function updatePosition(id: string, data: UpdatePositionData): Promise<Position> {
  if (!shouldUseApi()) {
    throw new Error('Cannot update position without API connection');
  }
  return apiClient.patch<Position>(`/api/positions/${id}`, data);
}
