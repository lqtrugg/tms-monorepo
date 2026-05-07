import { ServiceError } from '../../../../shared/errors/service.error.js';
import type { MessagingWriteRepository } from '../../infrastructure/persistence/typeorm/MessagingWriteRepository.js';

export class DeleteDiscordServerUseCase {
  constructor(private readonly messagingWriteRepository: MessagingWriteRepository) {}

  async execute(teacherId: number, classId: number) {
    const existing = await this.messagingWriteRepository.findDiscordServerByClass(teacherId, classId);

    if (!existing) {
      throw new ServiceError('discord server not found for this class', 404);
    }

    await this.messagingWriteRepository.removeDiscordServer(existing);

    return { removed: true };
  }
}
