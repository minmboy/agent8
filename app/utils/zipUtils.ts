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

export function stripTopLevelDirectory(fileMap: FileMap): FileMap {
  const allPaths = Object.keys(fileMap);

  // Extract top level entries (directories or files)
  const topLevelEntries = new Set<string>();

  for (const path of allPaths) {
    const firstSlashIndex = path.indexOf('/');

    if (firstSlashIndex === -1) {
      // If top level file exists, do not remove it
      return fileMap;
    }

    topLevelEntries.add(path.substring(0, firstSlashIndex));
  }

  // If not a single top level directory, return original
  if (topLevelEntries.size !== 1) {
    return fileMap;
  }

  // Remove single top level directory
  const wrapperDir = Array.from(topLevelEntries)[0];
  const wrapperPrefix = `${wrapperDir}/`;
  const normalizedFileMap: FileMap = {};

  for (const [path, fileData] of Object.entries(fileMap)) {
    if (path.startsWith(wrapperPrefix)) {
      const normalizedPath = path.substring(wrapperPrefix.length);
      normalizedFileMap[normalizedPath] = fileData;
    }
  }

  return normalizedFileMap;
}
