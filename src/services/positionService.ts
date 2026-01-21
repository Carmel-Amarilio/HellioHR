import positionsData from '../data/positions.json';
import type { Position } from '../types';

const positions = positionsData as Position[];

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
