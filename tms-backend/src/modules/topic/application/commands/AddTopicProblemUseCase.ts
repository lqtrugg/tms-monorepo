import { ServiceError } from '../../../../shared/errors/service.error.js';
import type { AddTopicProblemInput } from '../dto/TopicDto.js';
import type { TopicWriteRepository } from '../../infrastructure/persistence/typeorm/TopicWriteRepository.js';

export class AddTopicProblemUseCase {
  constructor(private readonly topicWriteRepository: TopicWriteRepository) {}

  async execute(teacherId: number, topicId: number, input: AddTopicProblemInput) {
    const topic = await this.topicWriteRepository.findOwnedTopic(teacherId, topicId);
    if (!topic) {
      throw new ServiceError('topic not found', 404);
    }

    const existing = await this.topicWriteRepository.findTopicProblemByIndex(topicId, input.problem_index);
    if (existing) {
      existing.problem_name = input.problem_name ?? null;
      return this.topicWriteRepository.saveTopicProblem(existing);
    }

    const problem = this.topicWriteRepository.createTopicProblem({
      teacher_id: teacherId,
      topic_id: topic.id,
      problem_index: input.problem_index,
      problem_name: input.problem_name ?? null,
    });

    return this.topicWriteRepository.saveTopicProblem(problem);
  }
}
