import type { Response } from 'express';

export function handleControllerError(error: unknown, res: Response): void {
  console.error('Controller error:', error);
  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: error.message });
    }
  } else {
    res.status(500).json({ message: 'An unknown error occurred' });
  }
}
