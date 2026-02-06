import ignore from 'ignore';
import { z } from 'zod';
import type { TemplateSelectionResponse, TemplateSelection } from '~/types/template';
import { extractZipTemplate } from './zipUtils';
import type { FileMap } from '~/lib/stores/files';
import { TEMPLATE_BASIC, TEMPLATE_MAP } from '~/constants/template';
import { FetchError } from './errors';
import { getTurnstileHeaders } from '~/lib/turnstile/client';

// Zod schema for template selection - API 검증용
export const TEMPLATE_SELECTION_SCHEMA = z.object({
  templateName: z.string().min(1, 'Template name cannot be empty').describe('The selected template name'),
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .describe('A proper title for the project')
    .default('Untitled Project'),
  projectRepo: z
    .string()
    .min(1, 'Project repository name cannot be empty')
    .describe('The name of the new project repository'),
  nextActionSuggestion: z.string().describe('Suggestions for the next action').optional(),
}) satisfies z.ZodType<TemplateSelection>;

export const selectStarterTemplate = async (options: { message: string; signal?: AbortSignal }) => {
  const { message, signal } = options;

  const requestBody = {
    message,
  };

  const turnstileHeaders = await getTurnstileHeaders();

  const response = await fetch('/api/startcall', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...turnstileHeaders,
    },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    const serverMessage = await response.text();
    throw new FetchError((serverMessage ?? 'unknown error').trim(), response.status, 'select_starter_template');
  }

  const selectedTemplate = (await response.json()) as TemplateSelectionResponse;

  if (!selectedTemplate.templateName) {
    console.log('No template selected, using blank template');
    return {};
  }

  const template = selectedTemplate.template;

  if (template) {
    return {
      template,
      title: selectedTemplate.title,
      projectRepo: selectedTemplate.projectRepo,
      nextActionSuggestion: selectedTemplate.nextActionSuggestion,
    };
  }

  return {};
};

/**
 * Download GitHub repo as ZIP archive and extract to FileMap.
 * Public repos don't require a token. Single request instead of per-file API calls.
 */
const getGitHubRepoContent = async (repoName: string, path: string = '', env?: Env): Promise<FileMap> => {
  const ref = env?.VITE_USE_PRODUCTION_TEMPLATE === 'true' ? 'production' : 'main';
  const archiveUrl = `https://github.com/${repoName}/archive/${ref}.zip`;

  const response = await fetch(archiveUrl, { redirect: 'follow' });

  if (!response.ok) {
    throw new Error(`Failed to download GitHub archive: ${response.status} ${response.statusText}`);
  }

  const zipBuffer = await response.arrayBuffer();
  const rawFileMap = await extractZipTemplate(zipBuffer);

  /*
   * GitHub archive extracts to {repo-name}-{ref}/ folder, strip the prefix
   * e.g., "agent8-templates-main/basic-3d-freeview/..." -> "basic-3d-freeview/..."
   */
  const fileMap: FileMap = {};
  const prefixPattern = /^[^/]+\//; // Matches first directory level

  // Exclude git-related files (same as container-agent)
  const GIT_ENTRIES = new Set(['.git', '.gitmodules', '.gitattributes', '.gitkeep']);

  for (const [filePath, fileData] of Object.entries(rawFileMap)) {
    const strippedPath = filePath.replace(prefixPattern, '');

    // Skip git-related files
    const fileName = strippedPath.split('/').pop() || '';

    if (GIT_ENTRIES.has(fileName)) {
      continue;
    }

    // If path is specified, only include files under that path and strip the path prefix
    if (path) {
      if (strippedPath.startsWith(path + '/')) {
        const relativePath = strippedPath.slice(path.length + 1);
        fileMap[relativePath] = fileData;
      }
    } else {
      fileMap[strippedPath] = fileData;
    }
  }

  return fileMap;
};

async function getTemplateFileMap(githubRepo: string, path: string, env?: Env): Promise<FileMap | undefined> {
  try {
    const files = await getGitHubRepoContent(githubRepo, path, env);

    const fileMap: FileMap = {};

    if (path) {
      for (const key in files) {
        fileMap[key.replace(path + '/', '')] = files[key];
      }
    }

    return fileMap;
  } catch (error) {
    console.log('[Template] GitHub fetch failed, using fallback:', path, error);

    return TEMPLATE_MAP[path];
  }
}

export async function getTemplates(githubRepo: string, path: string, title?: string, env?: Env) {
  let isFallback = false;
  let fileMap = await getTemplateFileMap(githubRepo, path, env);

  if (!fileMap) {
    fileMap = TEMPLATE_BASIC;
    isFallback = true;
  }

  const messages = generateTemplateMessages(fileMap, title);

  return { fileMap, messages, isFallback };
}

export async function getZipTemplates(zipFile: File, title?: string) {
  const fileMap = await extractZipTemplate(await zipFile.arrayBuffer());
  return { fileMap, messages: generateTemplateMessages(fileMap, title) };
}

function generateTemplateMessages(fileMap: FileMap, title?: string) {
  const files = [];

  for (const key in fileMap) {
    if (fileMap[key]!.type === 'file') {
      files.push({
        name: key,
        path: key,
        content: fileMap[key]!.content,
      });
    }
  }

  let filteredFiles = files;

  /*
   * ignoring common unwanted files
   * exclude    .git
   */
  filteredFiles = filteredFiles.filter((x) => x.path.startsWith('.git') == false);

  // exclude    lock files
  const comminLockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
  filteredFiles = filteredFiles.filter((x) => comminLockFiles.includes(x.name) == false);

  // exclude    .bolt
  filteredFiles = filteredFiles.filter((x) => x.path.startsWith('.bolt') == false);

  // check for ignore file in .bolt folder
  const templateIgnoreFile = files.find((x) => x.path.startsWith('.bolt') && x.name == 'ignore');

  const filesToImport = {
    files: filteredFiles,
    ignoreFile: [] as typeof filteredFiles,
  };

  if (templateIgnoreFile) {
    // redacting files specified in ignore file
    const ignorepatterns = templateIgnoreFile.content.split('\n').map((x) => x.trim());
    const ig = ignore().add(ignorepatterns);

    // filteredFiles = filteredFiles.filter(x => !ig.ignores(x.path))
    const ignoredFiles = filteredFiles.filter((x) => ig.ignores(x.path));

    filesToImport.files = filteredFiles;
    filesToImport.ignoreFile = ignoredFiles;
  }

  const assistantMessage = `
<boltArtifact id="imported-files" title="${title || 'Importing Starter Files'}" type="bundled">
${filesToImport.files
  .map(
    (file) =>
      `<boltAction type="file" filePath="${file.path}">
${file.content}
</boltAction>`,
  )
  .join('\n')}
</boltArtifact>
`;
  let userMessage = ``;
  const templatePromptFile = files.filter((x) => x.path.startsWith('.bolt')).find((x) => x.name == 'prompt');

  if (templatePromptFile) {
    userMessage = `
TEMPLATE INSTRUCTIONS:
${templatePromptFile.content}

IMPORTANT: Dont Forget to install the dependencies before running the app
---
`;
  }

  if (filesToImport.ignoreFile.length > 0) {
    userMessage =
      userMessage +
      `
STRICT FILE ACCESS RULES - READ CAREFULLY:

The following files are READ-ONLY and must never be modified:
${filesToImport.ignoreFile.map((file) => `- ${file.path}`).join('\n')}

Permitted actions:
✓ Import these files as dependencies
✓ Read from these files
✓ Reference these files

Strictly forbidden actions:
❌ Modify any content within these files
❌ Delete these files
❌ Rename these files
❌ Move these files
❌ Create new versions of these files
❌ Suggest changes to these files

Any attempt to modify these protected files will result in immediate termination of the operation.

If you need to make changes to functionality, create new files instead of modifying the protected ones listed above.
---
`;
  }

  userMessage += `
---
template import is done, and you can now use the imported files,
edit only the files that need to be changed, and you can create new files as needed.
NO NOT EDIT/WRITE ANY FILES THAT ALREADY EXIST IN THE PROJECT AND DOES NOT NEED TO BE MODIFIED
---
Now that the Template is imported please continue with my original request
`;

  return {
    assistantMessage,
    userMessage,
  };
}
