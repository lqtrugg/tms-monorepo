import { ServiceError } from '../../../../shared/errors/service.error.js';
import type { TopicWriteRepository } from '../../infrastructure/persistence/typeorm/TopicWriteRepository.js';

export class CloseTopicUseCase {
  constructor(private readonly topicWriteRepository: TopicWriteRepository) {}

  async execute(teacherId: number, topicId: number) {
    const topic = await this.topicWriteRepository.findOwnedTopic(teacherId, topicId);
    if (!topic) {
      throw new ServiceError('topic not found', 404);
    }

    topic.closed_at = new Date();
    return this.topicWriteRepository.saveTopic(topic);
  }
}
