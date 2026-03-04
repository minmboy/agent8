import type { ActionFunctionArgs } from '@remix-run/node';
import { withV8AuthUser } from '~/lib/verse8/middleware';
import { createScopedLogger } from '~/utils/logger';
import { GitlabService } from '~/lib/persistenceGitbase/gitlabService';
import { parseCookies } from '~/lib/api/cookies';

export interface UploadFileEntry {
  type: 'file';
  content: string;
  encoding: 'text' | 'base64';
}

export type UploadFileMap = Record<string, UploadFileEntry>;

const logger = createScopedLogger('api.upload-project');

export const action = withV8AuthUser(uploadProjectAction);

async function uploadProjectAction({ request, context }: ActionFunctionArgs) {
  const env = { ...context.cloudflare.env, ...process.env } as Env;
  const email = (context.user as { email: string }).email;

  const cookieHeader = request.headers.get('Cookie');
  const parsedCookies = parseCookies(cookieHeader || '');
  const temporaryMode = JSON.parse(parsedCookies.temporaryMode || 'false');

  if (!email) {
    return Response.json({ error: 'User email is required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, projectRepo, fileMap } = body as {
      title: string;
      projectRepo: string;
      fileMap: UploadFileMap;
    };

    if (!projectRepo) {
      return Response.json({ error: 'projectRepo is required' }, { status: 400 });
    }

    if (!fileMap) {
      return Response.json({ error: 'fileMap is required' }, { status: 400 });
    }

    const gitlabService = new GitlabService(env, temporaryMode);

    if (!gitlabService.enabled) {
      return Response.json({ error: 'GitLab service is not enabled' }, { status: 503 });
    }

    const files = [];

    for (const key in fileMap) {
      const entry = fileMap[key]!;
      files.push({
        path: key,
        content: entry.content,
        ...(entry.encoding === 'base64' ? { encoding: 'base64' } : {}),
      });
    }

    const gitlabUser = await gitlabService.getOrCreateUser(email);
    const project = await gitlabService.createProject(gitlabUser, projectRepo, title);
    const commit = await gitlabService.commitFiles(project.id, files, `Import project: ${projectRepo}`);

    return Response.json({
      project: {
        id: project.id,
        name: project.name,
        path: project.path_with_namespace,
        description: project.description,
      },
      commit: { id: commit.id },
    });
  } catch (error) {
    logger.error('Error uploading project:', error);
    return Response.json({ error: 'Failed to upload project', details: (error as Error).message }, { status: 500 });
  }
}
