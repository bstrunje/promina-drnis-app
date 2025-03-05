import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = express.Router();

// Debug endpoint to check if file exists
router.get('/file-exists/:subdirectory/:filename', async (req, res) => {
  try {
    const { subdirectory, filename } = req.params;
    const filePath = path.join(__dirname, '..', '..', 'uploads', subdirectory, filename);
    
    console.log('Checking if file exists:', filePath);
    
    try {
      const stats = await fs.stat(filePath);
      res.json({
        exists: true,
        size: stats.size,
        isFile: stats.isFile(),
        lastModified: stats.mtime
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      res.status(404).json({
        exists: false,
        error: errorMessage,
        checkedPath: filePath
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
