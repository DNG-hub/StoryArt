// services/imagePathTracker.ts
// Image Path Tracker Service for SwarmUI to DaVinci Pipeline
// Handles normalization of image paths from SwarmUI and midnight rollover scenarios

import { promises as fs } from 'fs';
import * as path from 'path';
import type { EnhancedImagePath, ImageMetadata } from '../types';

/**
 * Get SwarmUI output path from environment or default
 */
function getSwarmUIOutputPathConfig(): string {
  return (typeof process !== 'undefined' && process.env?.SWARMUI_OUTPUT_PATH) || 
         (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SWARMUI_OUTPUT_PATH) ||
         'E:/FLUX_models_Auto_Downloaders_v7/SwarmUI/Output';
}

/**
 * Get SwarmUI raw output path
 */
function getSwarmUIRawOutputPathConfig(): string {
  return path.join(getSwarmUIOutputPathConfig(), 'local', 'raw');
}

/**
 * Date format used by SwarmUI for folder naming
 */
const DATE_FORMAT = 'YYYY-MM-DD';

/**
 * Normalize a date to YYYY-MM-DD format
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get yesterday's date formatted as YYYY-MM-DD
 */
function getYesterdayDate(date: Date): string {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDate(yesterday);
}

/**
 * Check if a file exists at the given path
 */
async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path is absolute (Windows or Unix)
 */
function isAbsolutePath(filePath: string): boolean {
  // Check for Windows absolute paths (e.g., "E:\" or "E:/")
  if (/^[A-Za-z]:[\\/]/.test(filePath)) {
    return true;
  }
  // Check for Unix absolute paths (e.g., "/")
  if (path.isAbsolute(filePath)) {
    return true;
  }
  return false;
}

/**
 * Normalize image path from SwarmUI response.
 * 
 * SwarmUI returns paths in various formats:
 * - Filename only: "1332001-(frontal view13), (facing camera12),-flux1-dev-fp8.png"
 * - Relative: "Output/local/raw/2025-01-03/image.png"
 * - Absolute: "E:/FLUX_models_Auto_Downloaders_v7/SwarmUI/Output/local/raw/2025-01-03/image.png"
 * 
 * This function normalizes all formats to absolute paths.
 * 
 * @param imagePath - The path returned by SwarmUI (filename, relative, or absolute)
 * @param generationStartDate - The date when generation started (for midnight rollover handling)
 * @returns Promise that resolves to normalized absolute path
 * @throws Error if path cannot be normalized or file doesn't exist
 */
export async function normalizeImagePath(
  imagePath: string,
  generationStartDate: Date
): Promise<string> {
  // 1. Check if path is already absolute → use as-is
  if (isAbsolutePath(imagePath)) {
    const normalized = path.normalize(imagePath);
    if (await pathExists(normalized)) {
      return normalized;
    }
    throw new Error(`Absolute path does not exist: ${normalized}`);
  }

  // 2. If relative → resolve against SwarmUI output path
  if (imagePath.includes(path.sep) || imagePath.includes('/') || imagePath.includes('\\')) {
    // Path contains separators, treat as relative
    const resolved = path.resolve(getSwarmUIOutputPathConfig(), imagePath);
    if (await pathExists(resolved)) {
      return path.normalize(resolved);
    }
    throw new Error(`Relative path does not exist: ${resolved}`);
  }

  // 3. If filename only → search date folders (today, start_date, yesterday)
  const foundPath = await findImageByFilename(imagePath, generationStartDate);
  if (foundPath) {
    return foundPath;
  }

  throw new Error(`Image not found: ${imagePath} (searched in date folders)`);
}

/**
 * Find an image by filename in date-based folders.
 * 
 * Searches in the following order:
 * 1. Today's date folder
 * 2. Generation start date folder
 * 3. Yesterday's folder (midnight rollover fallback)
 * 
 * @param filename - The filename to search for
 * @param startDate - The date when generation started
 * @returns Promise that resolves to absolute path if found, null otherwise
 */
export async function findImageByFilename(
  filename: string,
  startDate: Date
): Promise<string | null> {
  const todayDate = formatDate(new Date());
  const startDateStr = formatDate(startDate);
  const yesterdayDate = getYesterdayDate(startDate);

  // Search order: today, start_date, yesterday
  const searchDates = [todayDate, startDateStr, yesterdayDate];
  
  // Remove duplicates (in case start_date is today or yesterday)
  const uniqueDates = [...new Set(searchDates)];

  const rawOutputPath = getSwarmUIRawOutputPathConfig();

  for (const dateStr of uniqueDates) {
    const dateFolder = path.join(rawOutputPath, dateStr);
    const filePath = path.join(dateFolder, filename);

    try {
      if (await pathExists(filePath)) {
        return path.normalize(filePath);
      }
    } catch (error) {
      // Continue searching if this folder doesn't exist or isn't accessible
      console.warn(`Could not access date folder ${dateFolder}:`, error);
    }
  }

  // Also search in the raw output folder directly (in case date folder structure changed)
  const directPath = path.join(rawOutputPath, filename);
  if (await pathExists(directPath)) {
    return path.normalize(directPath);
  }

  return null;
}

/**
 * Enhance image paths with scene/beat/format metadata.
 * 
 * Takes raw image paths from SwarmUI and adds metadata to create EnhancedImagePath objects
 * that can be used by the DaVinci Project Service for organization.
 * 
 * @param paths - Array of image paths (may be mixed formats)
 * @param metadata - Array of metadata objects corresponding to each path
 * @returns Promise that resolves to array of EnhancedImagePath objects
 */
export async function enhanceImagePathsWithMetadata(
  paths: string[],
  metadata: ImageMetadata[]
): Promise<EnhancedImagePath[]> {
  if (paths.length !== metadata.length) {
    throw new Error(`Path count (${paths.length}) does not match metadata count (${metadata.length})`);
  }

  const enhancedPaths: EnhancedImagePath[] = [];

  for (let i = 0; i < paths.length; i++) {
    const imagePath = paths[i];
    const imageMetadata = metadata[i];

    try {
      // Normalize the path
      const normalizedPath = await normalizeImagePath(
        imagePath,
        imageMetadata.generationStartDate
      );

      // Extract filename
      const filename = path.basename(normalizedPath);

      // Check if file exists
      const exists = await pathExists(normalizedPath);

      enhancedPaths.push({
        originalPath: imagePath,
        normalizedPath: normalizedPath,
        sceneNumber: imageMetadata.sceneNumber,
        beatId: imageMetadata.beatId,
        format: imageMetadata.format,
        filename: filename,
        exists: exists,
        metadata: imageMetadata,
      });
    } catch (error) {
      console.error(`Failed to enhance path ${imagePath}:`, error);
      // Create entry with error state
      enhancedPaths.push({
        originalPath: imagePath,
        normalizedPath: imagePath,
        sceneNumber: imageMetadata.sceneNumber,
        beatId: imageMetadata.beatId,
        format: imageMetadata.format,
        filename: path.basename(imagePath),
        exists: false,
        metadata: imageMetadata,
      });
    }
  }

  return enhancedPaths;
}

/**
 * Validate that all paths in an EnhancedImagePath array exist.
 * 
 * @param enhancedPaths - Array of enhanced image paths to validate
 * @returns Array of paths that exist
 */
export async function validateImagePaths(
  enhancedPaths: EnhancedImagePath[]
): Promise<EnhancedImagePath[]> {
  const validatedPaths: EnhancedImagePath[] = [];

  for (const enhancedPath of enhancedPaths) {
    if (await pathExists(enhancedPath.normalizedPath)) {
      enhancedPath.exists = true;
      validatedPaths.push(enhancedPath);
    } else {
      console.warn(`Image path does not exist: ${enhancedPath.normalizedPath}`);
      enhancedPath.exists = false;
    }
  }

  return validatedPaths;
}

/**
 * Get SwarmUI output path configuration.
 * 
 * @returns The configured SwarmUI output base path
 */
export function getSwarmUIOutputPath(): string {
  return getSwarmUIOutputPathConfig();
}

/**
 * Get SwarmUI raw output path (where date folders are located).
 * 
 * @returns The configured SwarmUI raw output path
 */
export function getSwarmUIRawOutputPath(): string {
  return getSwarmUIRawOutputPathConfig();
}

