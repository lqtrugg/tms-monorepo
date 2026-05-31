import { HttpError } from '../../../../shared/errors/HttpError.js';
import {
  exchangeDiscordOAuthCode,
  fetchDiscordCurrentUser,
} from '../../../../infrastructure/external/discord/discord.js';
import { discordApiUrl, discordFrontendUrl } from '../../../../infrastructure/security/discord-oauth.js';
import type { DiscordBotCredentialStore } from '../../infrastructure/persistence/typeorm/Writer.js';
import type { TypeOrmTeacherWriter } from '../../infrastructure/persistence/typeorm/Writer.js';

async function exchangeDiscordCode(input: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<string> {
  const payload = await exchangeDiscordOAuthCode(input);
  if (!payload.access_token || payload.token_type?.toLowerCase() !== 'bearer') {
    throw new HttpError('invalid Discord OAuth token response', 502);
  }

  return payload.access_token;
}

export class VerifyTeacherDiscord {
  constructor(
    private readonly teacherWriter: TypeOrmTeacherWriter,
    private readonly credentialStore: DiscordBotCredentialStore,
  ) {}

  async buildAuthorizeUrl(teacherId: number): Promise<string> {
    const credential = await this.credentialStore.findDefault();
    if (!credential?.client_id || !credential.client_secret) {
      throw new HttpError('discord is not available right now', 503);
    }

    const search = new URLSearchParams({
      client_id: credential.client_id,
      response_type: 'code',
      redirect_uri: discordApiUrl('/discord/verification/callback'),
      scope: 'identify',
      state: String(teacherId),
    });

    return `https://discord.com/oauth2/authorize?${search.toString()}`;
  }

  async handleCallback(input: { code?: string; state?: string; error?: string }): Promise<string> {
    if (input.error) {
      return discordFrontendUrl('/settings?discord_verification=cancelled');
    }

    const teacherId = Number(input.state);
    if (!input.code || !Number.isInteger(teacherId) || teacherId <= 0) {
      return discordFrontendUrl('/settings?discord_verification=failed');
    }

    const credential = await this.credentialStore.findDefault();
    if (!credential?.client_id || !credential.client_secret) {
      return discordFrontendUrl('/settings?discord_verification=failed');
    }

    const teacher = await this.teacherWriter.findById(teacherId);
    if (!teacher) {
      return discordFrontendUrl('/settings?discord_verification=failed');
    }

    const redirectUri = discordApiUrl('/discord/verification/callback');
    let discordUser: Awaited<ReturnType<typeof fetchDiscordCurrentUser>>;

    try {
      const accessToken = await exchangeDiscordCode({
        code: input.code,
        clientId: credential.client_id,
        clientSecret: credential.client_secret,
        redirectUri,
      });
      discordUser = await fetchDiscordCurrentUser(accessToken);
    } catch (error) {
      console.error('[teacher-discord-verification] failed to complete OAuth callback', {
        error: error instanceof Error ? error.message : String(error),
        redirectUri,
      });
      return discordFrontendUrl('/settings?discord_verification=failed');
    }

    if (teacher.discord_user_id && teacher.discord_user_id !== discordUser.id) {
      await this.teacherWriter.clearDiscordWorkspaceData(teacher.id, teacher.discord_user_id);
    }

    teacher.discord_user_id = discordUser.id;
    teacher.discord_username = discordUser.username;
    teacher.discord_verified_at = new Date();
    await this.teacherWriter.save(teacher);

    return discordFrontendUrl('/settings?discord_verification=success');
  }
}
