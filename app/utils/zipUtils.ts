import JSZip from 'jszip';
import type { FileMap } from '~/lib/stores/files';
import { isBinaryPathByExtension, shouldIncludeFile } from './fileUtils';

// ZIP 파일을 받아서 FileMap 형식으로 변환
export async function extractZipTemplate(zipBuffer: ArrayBuffer): Promise<FileMap> {
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(zipBuffer);

    const fileMap: FileMap = {};

    // ZIP 파일 내의 모든 파일 처리
    const promises = Object.keys(contents.files).map(async (filename) => {
      const zipEntry = contents.files[filename];

      if (!shouldIncludeFile(filename)) {
        return;
      }

      if (zipEntry.dir) {
        return;
      }

      try {
        // Create file path
        const filePath = `${filename}`;

        // Check if the file is a binary file
        if (isBinaryPathByExtension(filename)) {
          // Read the file as a binary file
          const buffer = await zipEntry.async('uint8array');
          fileMap[filePath] = {
            type: 'file',
            content: '',
            isBinary: true,
            buffer,
          };
        } else {
          // Read the file as a text file
          const content = await zipEntry.async('string');
          fileMap[filePath] = {
            type: 'file',
            content,
            isBinary: false,
          };
        }
      } catch (error) {
        console.error(`Error extracting file ${filename}:`, error);
      }
    });

    await Promise.all(promises);

    return fileMap;
  } catch (error) {
    console.error('Error extracting ZIP file:', error);
    throw new Error('Failed to extract ZIP file');
  }
}

/**
 * Remove the top-level directory from FileMap if there is only one
 * Normalize in advance for consistency, as mount performs the same processing
 */
export function stripTopLevelDirectory(fileMap: FileMap): FileMap {
  const topLevelDirs = new Set<string>();
  const allPaths = Object.keys(fileMap);

  // Collect top-level directories
  allPaths.forEach((path) => {
    const firstSlash = path.indexOf('/');

    if (firstSlash > 0) {
      topLevelDirs.add(path.substring(0, firstSlash));
    } else {
      // Do not remove if there is a file at the top level
      topLevelDirs.add('__root__');
    }
  });

  // Remove if there is only one top-level directory
  if (topLevelDirs.size === 1 && !topLevelDirs.has('__root__')) {
    const topLevelDir = Array.from(topLevelDirs)[0];
    const normalizedFileMap: FileMap = {};

    Object.entries(fileMap).forEach(([path, fileData]) => {
      if (path.startsWith(topLevelDir + '/')) {
        const normalizedPath = path.substring(topLevelDir.length + 1);
        normalizedFileMap[normalizedPath] = fileData;
      } else {
        // Exception case: keep paths that do not match the top-level directory as is
        normalizedFileMap[path] = fileData;
      }
    });

    return normalizedFileMap;
  }

  return fileMap;
}
