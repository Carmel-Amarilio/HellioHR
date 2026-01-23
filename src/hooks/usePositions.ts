import { useState, useEffect } from 'react';
import {
  fetchAllPositions,
  fetchPositionById,
} from '../services/positionService';
import type { Position } from '../types';

export function usePositions(): {
  positions: Position[];
  loading: boolean;
  updatePositionInList: (updatedPosition: Position) => void;
} {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllPositions()
      .then(setPositions)
      .finally(() => setLoading(false));
  }, []);

  const updatePositionInList = (updatedPosition: Position) => {
    setPositions((prev) =>
      prev.map((p) => (p.id === updatedPosition.id ? updatedPosition : p))
    );
  };

  return { positions, loading, updatePositionInList };
}

export function usePosition(id: string | undefined): { position: Position | undefined; loading: boolean } {
  const [position, setPosition] = useState<Position | undefined>(undefined);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    fetchPositionById(id)
      .then((result) => {
        if (!cancelled) setPosition(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { position, loading };
}

export function useOpenPositions(): {
  positions: Position[];
  loading: boolean;
  updatePositionInList: (updatedPosition: Position) => void;
} {
  // For now, all positions are "open"
  return usePositions();
}
