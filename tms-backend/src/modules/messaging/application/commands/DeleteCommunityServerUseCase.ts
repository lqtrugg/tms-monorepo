import type { MessagingWriteRepository } from '../../infrastructure/persistence/typeorm/MessagingWriteRepository.js';

export class DeleteCommunityServerUseCase {
  constructor(private readonly messagingWriteRepository: MessagingWriteRepository) {}

  async execute(teacherId: number) {
    const existing = await this.messagingWriteRepository.findCommunityServerByTeacher(teacherId);
    if (!existing) {
      return { removed: false };
    }

    await this.messagingWriteRepository.removeCommunityServer(existing);
    return { removed: true };
  }
}
