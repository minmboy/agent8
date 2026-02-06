import React, { useState, useEffect } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import type { ChatAttachment } from './BaseChat';

interface FilePreviewProps {
  attachmentUrlList: string[];
  attachments?: ChatAttachment[];
  onRemove?: (index: number) => void;
  compact?: boolean; // Compact mode for screens smaller than xl
}

const FilePreview: React.FC<FilePreviewProps> = ({ attachmentUrlList, attachments, onRemove, compact = false }) => {
  if (!attachmentUrlList || attachmentUrlList.length === 0) {
    return null;
  }

  // Check file type
  const getFileType = (url: string): 'image' | 'audio' | 'video' | '3d' | 'text' | 'other' | 'uploading' | 'error' => {
    // Check special protocols
    if (url.startsWith('uploading://')) {
      return 'uploading';
    }

    if (url.startsWith('error://')) {
      return 'error';
    }

    const lowerUrl = url.toLowerCase();

    // Check image
    if (
      lowerUrl.endsWith('.png') ||
      lowerUrl.endsWith('.jpg') ||
      lowerUrl.endsWith('.jpeg') ||
      lowerUrl.endsWith('.gif') ||
      lowerUrl.endsWith('.svg') ||
      lowerUrl.endsWith('.webp')
    ) {
      return 'image';
    }

    // Check audio
    if (
      lowerUrl.endsWith('.mp3') ||
      lowerUrl.endsWith('.wav') ||
      lowerUrl.endsWith('.ogg') ||
      lowerUrl.endsWith('.m4a')
    ) {
      return 'audio';
    }

    // Check video
    if (lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.mov')) {
      return 'video';
    }

    // Check 3D model
    if (lowerUrl.endsWith('.glb') || lowerUrl.endsWith('.gltf') || lowerUrl.endsWith('.vrm')) {
      return '3d';
    }

    // Check text file
    if (
      lowerUrl.endsWith('.txt') ||
      lowerUrl.endsWith('.json') ||
      lowerUrl.endsWith('.md') ||
      lowerUrl.endsWith('.csv') ||
      lowerUrl.endsWith('.xml') ||
      lowerUrl.endsWith('.yaml') ||
      lowerUrl.endsWith('.yml')
    ) {
      return 'text';
    }

    // Other files
    return 'other';
  };

  // Extract filename
  const getFileName = (url: string): string => {
    const parts = url.split('/');
    return parts[parts.length - 1].split('?')[0]; // Remove URL parameters
  };

  // Extract file extension
  const getFileExtension = (url: string): string => {
    const fileName = getFileName(url);
    const parts = fileName.split('.');

    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
  };

  // Find attachment metadata by URL
  const getAttachmentByUrl = (url: string): ChatAttachment | undefined => {
    if (!attachments) {
      return undefined;
    }

    return attachments.find((attachment) => attachment.url === url);
  };

  const Model3dPreview = ({ url, fileName }: { url: string; fileName: string }) => {
    return (
      <ClientOnly
        fallback={
          <div className="min-h-[100px] flex flex-col items-center justify-center p-2">
            <div className="i-ph:cube-duotone text-2xl text-bolt-elements-textHighlight"></div>
            <div className="text-xs text-bolt-elements-textSecondary mt-1 text-center">{fileName} (Loading...)</div>
          </div>
        }
      >
        {() => {
          // Dynamically import ModelViewer component
          const ModelViewerComponent = () => {
            const [ModelViewer, setModelViewer] = useState<any>(null);

            useEffect(() => {
              import('~/components/ui/ModelViewer').then((module) => {
                setModelViewer(() => module.ModelViewer);
              });
            }, []);

            if (!ModelViewer) {
              return (
                <div className="min-h-[100px] flex flex-col items-center justify-center p-2">
                  <div className="i-ph:cube-duotone text-2xl text-bolt-elements-textHighlight"></div>
                  <div className="text-xs text-bolt-elements-textSecondary mt-1 text-center">
                    {fileName} (Loading...)
                  </div>
                </div>
              );
            }

            return (
              <div className="min-h-[100px] w-[120px]">
                <ModelViewer url={url} width="100%" height="100px" />
                <div className="text-xs text-bolt-elements-textSecondary mt-1 text-center pb-2">{fileName}</div>
              </div>
            );
          };

          return <ModelViewerComponent />;
        }}
      </ClientOnly>
    );
  };

  // Render preview for each file type
  const renderPreview = (url: string, index: number) => {
    const fileType = getFileType(url);
    const fileName = getFileName(url);
    const fileExt = getFileExtension(url);

    // Apply consistent size to all preview containers
    const containerClass = compact
      ? 'mr-2 relative bg-bolt-elements-background-depth-3 rounded overflow-hidden min-w-[120px] max-h-[84px] max-w-[160px]'
      : 'mr-2 relative bg-bolt-elements-background-depth-3 rounded overflow-hidden min-w-[120px] min-h-[100px] max-w-[160px]';

    return (
      <div key={url} className={containerClass}>
        <div className="relative h-full flex flex-col justify-center items-center p-2">
          {fileType === 'uploading' && (
            <div className="flex flex-col items-center justify-center h-full w-full">
              <div className="i-svg-spinners:90-ring-with-bg text-xl animate-spin mb-2"></div>
              <div className="text-xs text-bolt-elements-textSecondary text-center">Uploading...</div>
              <div className="text-xs text-bolt-elements-textTertiary text-center mt-1 truncate max-w-[140px]">
                {fileName}
              </div>
            </div>
          )}

          {fileType === 'error' && (
            <div className="flex flex-col items-center justify-center h-full w-full">
              <div className="i-ph:warning-bold text-xl text-red-500 mb-2"></div>
              <div className="text-xs text-red-500 text-center">Upload failed</div>
              <div className="text-xs text-bolt-elements-textTertiary text-center mt-1 truncate max-w-[140px]">
                {fileName}
              </div>
            </div>
          )}

          {fileType === 'image' && (
            <div className="flex flex-col items-center justify-center h-full w-full">
              <img
                src={url}
                alt={fileName}
                className={compact ? 'max-h-[48px] max-w-full object-contain' : 'max-h-20 max-w-full object-contain'}
                loading="lazy"
              />
              <div
                className={`text-xs text-bolt-elements-textSecondary text-center truncate max-w-[140px] ${compact ? 'mt-1' : 'mt-2'}`}
              >
                {fileName}
              </div>
              {(() => {
                const attachment = getAttachmentByUrl(url);

                if (attachment?.metadata?.width && attachment?.metadata?.height) {
                  return (
                    <div className="text-xs text-bolt-elements-textTertiary text-center">
                      {attachment.metadata.width}x{attachment.metadata.height}
                    </div>
                  );
                }

                return null;
              })()}
            </div>
          )}

          {fileType === 'audio' && (
            <div className="flex flex-col items-center justify-center h-full w-full">
              <div className="i-ph:speaker-high-duotone text-2xl text-bolt-elements-textSecondary mb-1"></div>
              <audio controls className="max-w-full h-6">
                <source src={url} />
                Your browser does not support audio.
              </audio>
              <div className="text-xs text-bolt-elements-textSecondary mt-1 text-center truncate max-w-[140px]">
                {fileName}
              </div>
            </div>
          )}

          {fileType === 'video' && (
            <div className="flex flex-col items-center justify-center h-full w-full">
              <div className="i-ph:video-duotone text-2xl text-bolt-elements-textSecondary mb-1"></div>
              <div className="text-xs text-bolt-elements-textSecondary text-center truncate max-w-[140px]">
                {fileName}
              </div>
              <video controls className="max-h-16 max-w-full mt-1">
                <source src={url} />
                Your browser does not support video.
              </video>
            </div>
          )}

          {fileType === '3d' && <Model3dPreview url={url} fileName={fileName} />}

          {fileType === 'text' && (
            <div className="flex flex-col items-center justify-center h-full w-full">
              <div className="i-ph:file-text-duotone text-2xl text-bolt-elements-textSecondary"></div>
              <div className="text-xs text-bolt-elements-textSecondary mt-1 text-center truncate max-w-[140px]">
                {fileName}
              </div>
            </div>
          )}

          {fileType === 'other' && (
            <div className="flex flex-col items-center justify-center h-full w-full">
              <div className="i-ph:file-duotone text-2xl text-bolt-elements-textSecondary"></div>
              <div className="text-xs text-bolt-elements-textPrimary font-medium mt-1">{fileExt}</div>
              <div className="text-xs text-bolt-elements-textSecondary text-center truncate max-w-[140px]">
                {fileName}
              </div>
            </div>
          )}
          {onRemove && fileType !== 'uploading' && (
            <button
              onClick={() => onRemove(index)}
              className="absolute top-1 right-1 z-10 bg-black/70 rounded-full w-5 h-5 shadow-md hover:bg-gray-900 transition-colors flex items-center justify-center"
            >
              <div className="i-ph:x w-3 h-3 text-gray-200" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={
        compact ? 'flex flex-row overflow-x-auto gap-2 py-2 max-h-[100px]' : 'flex flex-row overflow-x-auto gap-2 py-2'
      }
    >
      {attachmentUrlList.map((url, index) => renderPreview(url, index))}
    </div>
  );
};

export default FilePreview;
