import { useMemo } from 'react';
import {
  getAllPositions,
  getPositionById,
  getOpenPositions,
} from '../services/positionService';
import type { Position } from '../types';

export function usePositions(): Position[] {
  return useMemo(() => getAllPositions(), []);
}

export function usePosition(id: string | undefined): Position | undefined {
  return useMemo(() => {
    if (!id) return undefined;
    return getPositionById(id);
  }, [id]);
}

export function useOpenPositions(): Position[] {
  return useMemo(() => getOpenPositions(), []);
}
