import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';

export function roleGuard(requiredRole: 'viewer' | 'editor') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'No user in request' });
      return;
    }

    // Editor can do everything viewer can do
    if (requiredRole === 'viewer') {
      next();
      return;
    }

    // Only editor can access editor-only routes
    if (requiredRole === 'editor' && req.user.role !== 'editor') {
      res.status(403).json({ error: 'Forbidden', message: 'Editor role required' });
      return;
    }

    next();
  };
}
