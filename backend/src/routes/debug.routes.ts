import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
import util from 'util';
import { promises as fsPromises } from 'fs';

const execPromise = util.promisify(exec);

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

// Define file info type
interface FileInfo {
  path: string;
  size: number;
  modified: Date;
}

// Define path info types
interface PathInfoBase {
  name: string;
  path: string;
  exists: boolean;
  canWrite: boolean;
}

interface PathInfoSuccess extends PathInfoBase {
  exists: true;
  isDirectory: boolean;
  permissions: string;
  writeTest?: string;
}

interface PathInfoError extends PathInfoBase {
  exists: false;
  error: string;
}

type PathInfo = PathInfoSuccess | PathInfoError;

// List all files in uploads directory and subdirectories
router.get('/fs/list-files', async (req, res) => {
  try {
    const basePath = process.env.NODE_ENV === 'production' 
      ? '/app/uploads' 
      : path.join(__dirname, '..', '..', 'uploads');
    
    // Function to recursively list files with their sizes
    async function listFilesRecursive(dir: string, baseDir = ''): Promise<FileInfo[]> {
      const files = await fsPromises.readdir(dir, { withFileTypes: true });
      let results: FileInfo[] = [];
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        const relativePath = path.join(baseDir, file.name);
        
        if (file.isDirectory()) {
          const subResults = await listFilesRecursive(fullPath, relativePath);
          results = [...results, ...subResults];
        } else {
          const stats = await fsPromises.stat(fullPath);
          results.push({
            path: relativePath,
            size: stats.size,
            modified: stats.mtime
          });
        }
      }
      
      return results;
    }
    
    // Create base directory if it doesn't exist
    await fsPromises.mkdir(basePath, { recursive: true });
    
    // List all files recursively
    const fileList = await listFilesRecursive(basePath);
    
    // Get disk usage information
    const { stdout: diskUsage } = await execPromise('df -h');
    
    // Check directory permissions
    const { stdout: permissions } = await execPromise(`ls -la ${basePath}`);
    
    res.json({
      basePath,
      files: fileList,
      diskUsage: diskUsage.trim().split('\n'),
      permissions: permissions.trim().split('\n'),
      fileCount: fileList.length,
      totalSize: fileList.reduce((sum: number, file: FileInfo) => sum + file.size, 0)
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// Test writing a file and reading it back
router.post('/fs/test-write', async (req, res) => {
  try {
    const basePath = process.env.NODE_ENV === 'production' 
      ? '/app/uploads' 
      : path.join(__dirname, '..', '..', 'uploads');
    
    const testFileName = `test-file-${Date.now()}.txt`;
    const testFilePath = path.join(basePath, testFileName);
    const content = `Test file created at ${new Date().toISOString()}`;
    
    // Ensure directory exists
    await fsPromises.mkdir(basePath, { recursive: true });
    
    // Write test file
    await fsPromises.writeFile(testFilePath, content, 'utf8');
    console.log(`Test file written to ${testFilePath}`);
    
    // Read it back
    const readContent = await fsPromises.readFile(testFilePath, 'utf8');
    
    // Get file stats
    const stats = await fsPromises.stat(testFilePath);
    
    res.json({
      success: true,
      file: {
        name: testFileName,
        path: testFilePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        contentMatches: readContent === content,
        content: readContent
      }
    });
  } catch (error) {
    console.error('Error in file write test:', error);
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// Test all paths involved in image uploads
router.get('/fs/image-paths', async (req, res) => {
  try {
    const basePath = process.env.NODE_ENV === 'production' 
      ? '/app/uploads' 
      : path.join(__dirname, '..', '..', 'uploads');
    
    const profileImagesDir = path.join(basePath, 'profile_images');
    
    // Information about all relevant directories
    const pathInfo = [
      { name: 'Base uploads', path: basePath },
      { name: 'Profile images', path: profileImagesDir },
    ];
    
    // Check all paths
    const results: PathInfo[] = [];
    for (const info of pathInfo) {
      try {
        await fsPromises.mkdir(info.path, { recursive: true });
        const stats = await fsPromises.stat(info.path);
        const { stdout } = await execPromise(`ls -la "${info.path}"`);
        
        results.push({
          ...info,
          exists: true,
          isDirectory: stats.isDirectory(),
          permissions: stdout.trim().split('\n')[0],
          canWrite: true
        });
      } catch (error) {
        results.push({
          ...info,
          exists: false,
          error: error instanceof Error ? error.message : String(error),
          canWrite: false
        });
      }
    }
    
    // Test writing to each directory
    for (const result of results) {
      if (result.exists && 'isDirectory' in result && result.isDirectory) {
        try {
          const testFile = path.join(result.path, `test-${Date.now()}.txt`);
          await fsPromises.writeFile(testFile, 'test', 'utf8');
          await fsPromises.unlink(testFile);
          (result as PathInfoSuccess).writeTest = 'success';
        } catch (error) {
          (result as PathInfoSuccess).writeTest = `failed: ${error instanceof Error ? error.message : String(error)}`;
          result.canWrite = false;
        }
      }
    }
    
    res.json({
      paths: results,
      summary: {
        allPathsExist: results.every(r => r.exists),
        allPathsWritable: results.every(r => r.canWrite),
      }
    });
  } catch (error) {
    console.error('Error checking image paths:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
