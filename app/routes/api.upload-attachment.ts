import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { v4 as uuidv4 } from 'uuid';
import { withV8AuthUser, type ContextUser } from '~/lib/verse8/middleware';
import { ATTACHMENT_EXTS } from '~/utils/constants';

const CHAT_UPLOADS_PATH = 'chat-uploads';

export const action = withV8AuthUser(imageUploadAction, { checkCredit: true });

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

async function uploadAttachment(
  file: File,
  path: string,
  verse: string,
  accessToken: string,
  endpoint: string,
): Promise<string> {
  const fileName = file.name;
  const fileExt = `.${fileName.split('.').pop()?.toLowerCase()}`;
  const uniqueFileName = `${uuidv4().slice(0, 16)}${fileExt}`;

  if (!ATTACHMENT_EXTS.includes(fileExt)) {
    throw new Error('Only image files are allowed');
  }

  const externalFormData = new FormData();
  externalFormData.append('file', new File([await file.arrayBuffer()], uniqueFileName, { type: file.type }));
  externalFormData.append('path', path);

  const signature = 'bolt-verse-signature';
  const response = await fetch(`${endpoint}/verses/${verse}/files`, {
    method: 'POST',
    headers: {
      'X-Signature': signature,
      Authorization: `Bearer ${accessToken}`,
    },
    body: externalFormData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} ${errorText}`);
  }

  return `https://agent8-games.verse8.io/${verse}/${path}/${uniqueFileName}`;
}

export function isBase64Image(base64String: string): boolean {
  if (!base64String || !base64String.startsWith('data:')) {
    return false;
  }

  const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);

  if (!matches || matches.length !== 3) {
    return false;
  }

  return true;
}

async function imageUploadAction({ context, request }: ActionFunctionArgs) {
  try {
    const env = { ...context.cloudflare?.env, ...process.env } as Env;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;
    const verse = formData.get('verse') as string;

    if (!file || !path) {
      throw new Response('Missing required fields: file, path', { status: 400, statusText: 'Bad Request' });
    }

    const { accessToken, walletAddress } = context.user as ContextUser;

    if (!accessToken) {
      throw new Response('Unauthorized (no access token)', { status: 401, statusText: 'Unauthorized' });
    }

    const isChatUpload = path === CHAT_UPLOADS_PATH;
    const verseId = isChatUpload ? walletAddress : verse;

    if (!verseId) {
      throw new Response(isChatUpload ? 'User wallet address is not available' : 'Missing required field: verse', {
        status: 400,
        statusText: 'Bad Request',
      });
    }

    const endpoint = env.V8_GAMESERVER_ENDPOINT;

    if (!endpoint) {
      throw new Response('Game server endpoint is not configured', {
        status: 500,
        statusText: 'Internal Server Error',
      });
    }

    const url = await uploadAttachment(file, path, verseId, accessToken, endpoint);

    return new Response(
      JSON.stringify({
        success: true,
        url,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error: any) {
    console.error('Error uploading image:', error);

    if (error instanceof Response) {
      throw error;
    }

    throw new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error during upload',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
