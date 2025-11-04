// services/davinciProjectService.ts
// DaVinci Project Service for SwarmUI to DaVinci Pipeline
// Handles DaVinci Resolve project structure creation and image organization

import { promises as fs } from 'fs';
import * as path from 'path';
import type { 
  EnhancedImagePath, 
  OrganizationResult, 
  OrganizedImage, 
  FailedImage,
  ProjectStructure,
  ProjectFolder
} from '../types';

/**
 * Get DaVinci projects base path from environment or default
 */
function getDaVinciProjectsPath(): string {
  return (typeof process !== 'undefined' && process.env?.DAVINCI_PROJECTS_PATH) || 
         (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DAVINCI_PROJECTS_PATH) ||
         'E:/DaVinci_Projects';
}

/**
 * Sanitize a string for use in Windows filenames
 * Removes/replaces invalid characters: < > : " | ? * \ /
 */
function sanitizeFilename(filename: string): string {
  // Replace invalid Windows filename characters
  let sanitized = filename
    .replace(/[<>:"|?*\\/]/g, '_')  // Replace invalid chars with underscore
    .replace(/:/g, '_')              // Replace colons with underscores (e.g., 16:9 -> 16_9)
    .replace(/\s+/g, '_')            // Replace spaces with underscores
    .replace(/_{2,}/g, '_')          // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '');        // Remove leading/trailing underscores
  
  // Ensure filename isn't empty and isn't a reserved Windows name
  if (!sanitized || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(sanitized)) {
    sanitized = 'episode_' + sanitized;
  }
  
  // Limit length (Windows max is 255, but we'll be conservative)
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }
  
  return sanitized;
}

/**
 * Format format type for filename (replace colons with underscores)
 */
function formatFormatForFilename(format: 'cinematic' | 'vertical'): string {
  if (format === 'cinematic') {
    return '16_9_cinematic';  // 16:9 -> 16_9
  } else {
    return '9_16_vertical';  // 9:16 -> 9_16
  }
}

/**
 * Generate episode folder name
 */
function generateEpisodeFolderName(episodeNumber: number, title: string): string {
  const paddedNumber = String(episodeNumber).padStart(2, '0');
  const sanitizedTitle = sanitizeFilename(title);
  return `Episode_${paddedNumber}_${sanitizedTitle}`;
}

/**
 * Create the complete DaVinci project folder structure for an episode
 * 
 * Structure:
 * Episode_{number}_{title}/
 * ├── 01_Assets/
 * │   ├── Images/
 * │   │   ├── LongForm/          # 16:9 cinematic
 * │   │   └── ShortForm/         # 9:16 vertical
 * │   ├── Audio/
 * │   └── Video/
 * ├── 02_Timelines/
 * └── 03_Exports/
 * 
 * @param episodeNumber - Episode number
 * @param title - Episode title (will be sanitized)
 * @returns Promise that resolves to the episode project path
 */
export async function createEpisodeProject(
  episodeNumber: number,
  title: string
): Promise<string> {
  const basePath = getDaVinciProjectsPath();
  const episodeFolderName = generateEpisodeFolderName(episodeNumber, title);
  const episodeProjectPath = path.join(basePath, episodeFolderName);

  // Create main episode folder
  await fs.mkdir(episodeProjectPath, { recursive: true });

  // Create folder structure
  const folders = [
    path.join(episodeProjectPath, '01_Assets'),
    path.join(episodeProjectPath, '01_Assets', 'Images'),
    path.join(episodeProjectPath, '01_Assets', 'Images', 'LongForm'),
    path.join(episodeProjectPath, '01_Assets', 'Images', 'ShortForm'),
    path.join(episodeProjectPath, '01_Assets', 'Audio'),
    path.join(episodeProjectPath, '01_Assets', 'Video'),
    path.join(episodeProjectPath, '02_Timelines'),
    path.join(episodeProjectPath, '03_Exports'),
  ];

  for (const folder of folders) {
    await fs.mkdir(folder, { recursive: true });
  }

  return episodeProjectPath;
}

/**
 * Organize SwarmUI images into DaVinci project structure
 * 
 * Groups images by scene and format, generates descriptive filenames,
 * and copies them to the appropriate folders.
 * 
 * @param images - Array of enhanced image paths with metadata
 * @param episodeNumber - Episode number for project path
 * @param episodeTitle - Optional episode title (if provided, will use exact folder name)
 * @returns Promise that resolves to organization result
 */
export async function organizeSwarmUIImages(
  images: EnhancedImagePath[],
  episodeNumber: number,
  episodeTitle?: string
): Promise<OrganizationResult> {
  const basePath = getDaVinciProjectsPath();
  
  let episodeProjectPath: string;
  
  if (episodeTitle) {
    // Use exact folder name if title is provided
    const episodeFolderName = generateEpisodeFolderName(episodeNumber, episodeTitle);
    episodeProjectPath = path.join(basePath, episodeFolderName);
    
    // Verify folder exists
    if (!(await folderExists(episodeProjectPath))) {
      throw new Error(
        `Episode project folder not found: ${episodeProjectPath}\n\n` +
        `Troubleshooting:\n` +
        `1. Create the episode project folder first using createEpisodeProject()\n` +
        `2. Verify DaVinci projects path is correct: ${basePath}\n` +
        `3. Check folder permissions (must be writable)\n` +
        `4. Ensure episode number and title match the expected format`
      );
    }
  } else {
    // Find episode project folder by number
    const episodeFolders = await fs.readdir(basePath);
    const episodeFolder = episodeFolders.find(folder => 
      folder.startsWith(`Episode_${String(episodeNumber).padStart(2, '0')}_`)
    );

    if (!episodeFolder) {
      throw new Error(
        `Episode project folder not found for episode ${episodeNumber}\n\n` +
        `Searched in: ${basePath}\n\n` +
        `Troubleshooting:\n` +
        `1. Create the episode project folder first using createEpisodeProject()\n` +
        `2. Verify episode number is correct: ${episodeNumber}\n` +
        `3. Check DaVinci projects path: ${basePath}\n` +
        `4. Ensure folder naming follows format: Episode_${String(episodeNumber).padStart(2, '0')}_*`
      );
    }

    episodeProjectPath = path.join(basePath, episodeFolder);
  }
  const organizedImages: OrganizedImage[] = [];
  const failedImages: FailedImage[] = [];

  // Group images by scene, beat, and format for version numbering
  const imageGroups = new Map<string, EnhancedImagePath[]>();
  
  for (const image of images) {
    if (!image.exists) {
      failedImages.push({
        originalPath: image.normalizedPath,
        error: 'Source image does not exist',
        sceneNumber: image.sceneNumber,
        beatId: image.beatId,
        format: image.format,
      });
      continue;
    }

    const groupKey = `${image.sceneNumber}-${image.beatId}-${image.format}`;
    if (!imageGroups.has(groupKey)) {
      imageGroups.set(groupKey, []);
    }
    imageGroups.get(groupKey)!.push(image);
  }

  // Process each group and copy images
  for (const [groupKey, groupImages] of imageGroups) {
    const [sceneNum, beatId, format] = groupKey.split('-');
    const sceneNumber = parseInt(sceneNum, 10);
    const imageFormat = format as 'cinematic' | 'vertical';

    // Determine destination folder based on format
    const formatFolder = imageFormat === 'cinematic' ? 'LongForm' : 'ShortForm';
    const sceneFolderName = `Scene_${String(sceneNumber).padStart(2, '0')}`;
    const destinationScenePath = path.join(
      episodeProjectPath,
      '01_Assets',
      'Images',
      formatFolder,
      sceneFolderName
    );

    // Create scene folder if it doesn't exist
    await fs.mkdir(destinationScenePath, { recursive: true });

    // Copy each image with version number
    for (let version = 0; version < groupImages.length; version++) {
      const image = groupImages[version];
      const formatStr = formatFormatForFilename(imageFormat);
      const versionStr = `v${String(version + 1).padStart(2, '0')}`;
      const newFilename = `${beatId}_${formatStr}_${versionStr}.png`;
      const destinationPath = path.join(destinationScenePath, newFilename);

      try {
        // Copy file
        await fs.copyFile(image.normalizedPath, destinationPath);
        
        organizedImages.push({
          originalPath: image.normalizedPath,
          destinationPath: destinationPath,
          sceneNumber: sceneNumber,
          beatId: beatId,
          format: imageFormat,
          version: version + 1,
          filename: newFilename,
        });
      } catch (error) {
        failedImages.push({
          originalPath: image.normalizedPath,
          error: error instanceof Error ? error.message : 'Unknown error',
          sceneNumber: sceneNumber,
          beatId: beatId,
          format: imageFormat,
        });
      }
    }
  }

  // Log organization summary
  if (failedImages.length > 0) {
    const failedSummary = failedImages.map((f, i) => {
      const formatStr = f.format === 'cinematic' ? 'cinematic' : 'vertical';
      return `  ${i + 1}. Scene ${f.sceneNumber}, Beat ${f.beatId} (${formatStr}): ${f.error}`;
    });
    
    console.warn(
      `[DaVinci] Organization completed with ${failedImages.length} failures out of ${images.length} images:\n` +
      failedSummary.join('\n')
    );
  } else {
    console.log(`[DaVinci] All ${organizedImages.length} images organized successfully`);
  }

  return {
    success: failedImages.length === 0,
    episodeProjectPath: episodeProjectPath,
    organizedImages: organizedImages,
    failedImages: failedImages,
    summary: {
      totalImages: images.length,
      successfulCopies: organizedImages.length,
      failedCopies: failedImages.length,
    },
  };
}

/**
 * Get and validate the directory structure for a given episode
 * 
 * @param episodeNumber - Episode number
 * @returns Promise that resolves to project structure
 */
export async function getProjectDirectoryStructure(
  episodeNumber: number
): Promise<ProjectStructure> {
  const basePath = getDaVinciProjectsPath();
  
  // Find episode project folder
  const episodeFolders = await fs.readdir(basePath);
  const episodeFolder = episodeFolders.find(folder => 
    folder.startsWith(`Episode_${String(episodeNumber).padStart(2, '0')}_`)
  );

  if (!episodeFolder) {
    return {
      episodeProjectPath: '',
      episodeNumber: episodeNumber,
      episodeTitle: '',
      folders: [],
      isValid: false,
      errors: [`Episode project folder not found for episode ${episodeNumber}`],
    };
  }

  const episodeProjectPath = path.join(basePath, episodeFolder);
  const episodeTitle = episodeFolder.replace(`Episode_${String(episodeNumber).padStart(2, '0')}_`, '').replace(/_/g, ' ');
  
  const folders: ProjectFolder[] = [];
  const errors: string[] = [];

  // Check main folders
  const mainFolders = [
    { name: '01_Assets', type: 'assets' as const },
    { name: '02_Timelines', type: 'timelines' as const },
    { name: '03_Exports', type: 'exports' as const },
  ];

  for (const mainFolder of mainFolders) {
    const folderPath = path.join(episodeProjectPath, mainFolder.name);
    const exists = await folderExists(folderPath);
    
    folders.push({
      path: folderPath,
      name: mainFolder.name,
      type: mainFolder.type,
      exists: exists,
    });

    if (!exists) {
      errors.push(`Missing folder: ${mainFolder.name}`);
    }
  }

  // Check Assets subfolders
  const assetsPath = path.join(episodeProjectPath, '01_Assets');
  if (await folderExists(assetsPath)) {
    const assetsSubfolders = [
      { name: 'Images', type: 'images' as const },
      { name: 'Audio', type: 'audio' as const },
      { name: 'Video', type: 'video' as const },
    ];

    for (const subfolder of assetsSubfolders) {
      const subfolderPath = path.join(assetsPath, subfolder.name);
      const exists = await folderExists(subfolderPath);
      
      folders.push({
        path: subfolderPath,
        name: subfolder.name,
        type: subfolder.type,
        exists: exists,
      });

      if (!exists) {
        errors.push(`Missing folder: 01_Assets/${subfolder.name}`);
      }
    }

    // Check Images subfolders
    const imagesPath = path.join(assetsPath, 'Images');
    if (await folderExists(imagesPath)) {
      const imageSubfolders = [
        { name: 'LongForm', type: 'longform' as const },
        { name: 'ShortForm', type: 'shortform' as const },
      ];

      for (const imageSubfolder of imageSubfolders) {
        const imageSubfolderPath = path.join(imagesPath, imageSubfolder.name);
        const exists = await folderExists(imageSubfolderPath);
        
        folders.push({
          path: imageSubfolderPath,
          name: imageSubfolder.name,
          type: imageSubfolder.type,
          exists: exists,
        });

        if (!exists) {
          errors.push(`Missing folder: 01_Assets/Images/${imageSubfolder.name}`);
        }

        // Check for scene folders
        if (exists) {
          try {
            const sceneFolders = await fs.readdir(imageSubfolderPath, { withFileTypes: true });
            for (const sceneFolder of sceneFolders) {
              if (sceneFolder.isDirectory() && sceneFolder.name.startsWith('Scene_')) {
                folders.push({
                  path: path.join(imageSubfolderPath, sceneFolder.name),
                  name: sceneFolder.name,
                  type: 'scene',
                  exists: true,
                });
              }
            }
          } catch (error) {
            // Ignore read errors
          }
        }
      }
    }
  }

  return {
    episodeProjectPath: episodeProjectPath,
    episodeNumber: episodeNumber,
    episodeTitle: episodeTitle,
    folders: folders,
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Helper function to check if a folder exists
 */
async function folderExists(folderPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(folderPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get DaVinci projects base path
 */
export function getDaVinciProjectsBasePath(): string {
  return getDaVinciProjectsPath();
}

