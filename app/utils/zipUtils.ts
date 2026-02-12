import JSZip from 'jszip';
import type { FileMap } from '~/lib/stores/files';
import { isBinaryPathByExtension, shouldIncludeFile } from './fileUtils';
import { MAX_PROJECT_SIZE_BYTES, MAX_PROJECT_SIZE_MB } from './constants';
import { AppError } from './errors';

// ZIP 파일을 받아서 FileMap 형식으로 변환
export async function extractZipTemplate(zipBuffer: ArrayBuffer): Promise<FileMap> {
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(zipBuffer);

    const fileMap: FileMap = {};

    let totalExtractedSize = 0;
    const chunkSize = 20;

    // 처리할 파일 목록 필터링
    const filesToProcess = Object.keys(contents.files).filter((filename) => {
      const zipEntry = contents.files[filename];
      return !zipEntry.dir && shouldIncludeFile(filename);
    });

    // Process in chunks in parallel
    for (let i = 0; i < filesToProcess.length; i += chunkSize) {
      const chunk = filesToProcess.slice(i, i + chunkSize);

      // Extract files in chunks in parallel
      const extractedFiles = await Promise.all(
        chunk.map(async (filename) => {
          const zipEntry = contents.files[filename];

          try {
            const filePath = `${filename}`;

            if (isBinaryPathByExtension(filename)) {
              // Binary file
              const buffer = await zipEntry.async('uint8array');
              return {
                filePath,
                fileSize: buffer.length,
                fileData: {
                  type: 'file' as const,
                  content: '',
                  isBinary: true,
                  buffer,
                },
              };
            } else {
              // Text file
              const content = await zipEntry.async('string');
              const contentSize = new Blob([content]).size;

              return {
                filePath,
                fileSize: contentSize,
                fileData: {
                  type: 'file' as const,
                  content,
                  isBinary: false,
                },
              };
            }
          } catch (error) {
            console.error(`Error extracting file ${filename}:`, error);
            return null;
          }
        }),
      );

      // After chunk extraction, check size and add to fileMap
      for (const extracted of extractedFiles) {
        if (!extracted) {
          continue;
        }

        totalExtractedSize += extracted.fileSize;

        if (totalExtractedSize > MAX_PROJECT_SIZE_BYTES) {
          throw new AppError(`Project size exceeds ${MAX_PROJECT_SIZE_MB}MB limit. Please reduce the file size.`, {
            sendChatError: false,
          });
        }

        fileMap[extracted.filePath] = extracted.fileData;
      }
    }

    return fileMap;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    console.error(`Error extracting ZIP file: ${error}`);
    throw new Error('Failed to extract ZIP file');
  }
}

export function stripTopLevelDirectory(fileMap: FileMap): FileMap {
  const paths = Object.keys(fileMap);

  if (paths.length === 0) {
    return fileMap;
  }

  const topLevelEntries = new Set<string>();
  const pathData: Array<[string, string, any]> = []; // [path, topFolder, fileData]

  for (const path in fileMap) {
    const fileData = fileMap[path];
    const firstSlashIndex = path.indexOf('/');

    if (firstSlashIndex === -1) {
      // If top-level file exists, do not remove it
      return fileMap;
    }

    const topFolder = path.substring(0, firstSlashIndex);
    topLevelEntries.add(topFolder);
    pathData.push([path, topFolder, fileData]);
  }

  // If not a single top-level directory, return original
  if (topLevelEntries.size !== 1) {
    return fileMap;
  }

  // Remove single top-level directory (reuse collected data)
  const wrapperDir = Array.from(topLevelEntries)[0];
  const wrapperPrefix = `${wrapperDir}/`;
  const normalizedFileMap: FileMap = {};

  for (const [path, topFolder, fileData] of pathData) {
    if (topFolder === wrapperDir) {
      const normalizedPath = path.substring(wrapperPrefix.length);
      normalizedFileMap[normalizedPath] = fileData;
    }
  }

  return normalizedFileMap;
}
