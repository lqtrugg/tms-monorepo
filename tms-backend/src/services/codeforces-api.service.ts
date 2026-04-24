import { createHash, randomInt } from 'crypto';

import { ServiceError } from '../errors/service.error.js';

type CodeforcesPrimitive = string | number | boolean;

type CodeforcesApiEnvelope<T> = {
  status?: string;
  comment?: string;
  result?: T;
};

type ContestStandingsResult = {
  contest?: {
    id?: number;
    name?: string;
  };
};

export type CodeforcesCredentials = {
  apiKey: string;
  apiSecret: string;
};

function normalizeCredentialValue(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function buildSortedQuery(entries: Array<[string, string]>): string {
  return entries
    .slice()
    .sort((a, b) => {
      if (a[0] === b[0]) {
        return a[1].localeCompare(b[1]);
      }

      return a[0].localeCompare(b[0]);
    })
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

function buildCodeforcesRequestQuery(
  methodName: string,
  params: Record<string, CodeforcesPrimitive>,
  credentials: CodeforcesCredentials | null,
): string {
  const entries = Object.entries(params).map(([key, value]) => [key, String(value)] as [string, string]);

  if (!credentials) {
    return buildSortedQuery(entries);
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  entries.push(['apiKey', credentials.apiKey]);
  entries.push(['time', timestamp]);

  const sortedQuery = buildSortedQuery(entries);
  const randomPrefix = randomInt(100000, 1_000_000).toString();
  const signatureSource = `${randomPrefix}/${methodName}?${sortedQuery}#${credentials.apiSecret}`;
  const hash = createHash('sha512').update(signatureSource).digest('hex');
  const apiSig = `${randomPrefix}${hash}`;

  return `${sortedQuery}&apiSig=${apiSig}`;
}

function parseCodeforcesError(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  if ('comment' in payload && typeof payload.comment === 'string' && payload.comment.trim().length > 0) {
    return payload.comment.trim();
  }

  return null;
}

export function resolveCodeforcesCredentials(
  apiKey: string | null | undefined,
  apiSecret: string | null | undefined,
): CodeforcesCredentials | null {
  const normalizedKey = normalizeCredentialValue(apiKey);
  const normalizedSecret = normalizeCredentialValue(apiSecret);

  if (!normalizedKey || !normalizedSecret) {
    return null;
  }

  return {
    apiKey: normalizedKey,
    apiSecret: normalizedSecret,
  };
}

export async function callCodeforcesApi<T>(
  methodName: string,
  params: Record<string, CodeforcesPrimitive>,
  credentials: CodeforcesCredentials | null,
): Promise<T> {
  const queryString = buildCodeforcesRequestQuery(methodName, params, credentials);
  const requestUrl = `https://codeforces.com/api/${methodName}?${queryString}`;

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: 'GET',
    });
  } catch {
    throw new ServiceError('failed to connect to Codeforces API', 502);
  }

  if (!response.ok) {
    throw new ServiceError('failed to sync metadata from Codeforces', 502);
  }

  let payload: CodeforcesApiEnvelope<T>;
  try {
    payload = await response.json() as CodeforcesApiEnvelope<T>;
  } catch {
    throw new ServiceError('invalid response from Codeforces API', 502);
  }

  if (payload.status !== 'OK' || payload.result === undefined) {
    const detail = parseCodeforcesError(payload);
    throw new ServiceError(detail ? `Codeforces API error: ${detail}` : 'Codeforces API error', 400);
  }

  return payload.result;
}

export function extractGymIdFromLink(gymLink: string): string | null {
  const match = /\/gym\/(\d+)/i.exec(gymLink);
  return match ? match[1] : null;
}

export async function fetchCodeforcesGymMetadata(
  gymId: string,
  credentials: CodeforcesCredentials | null,
): Promise<{ gym_id: string; title: string }> {
  const result = await callCodeforcesApi<ContestStandingsResult>(
    'contest.standings',
    {
      contestId: gymId,
      from: 1,
      count: 1,
    },
    credentials,
  );

  if (!result.contest?.id || typeof result.contest.name !== 'string' || result.contest.name.trim().length === 0) {
    throw new ServiceError('invalid Codeforces gym metadata', 502);
  }

  return {
    gym_id: String(result.contest.id),
    title: result.contest.name.trim(),
  };
}
