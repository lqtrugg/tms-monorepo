import { ServiceError } from '../../../../shared/errors/service.error.js';
import type { UpsertTopicStandingInput } from '../dto/TopicDto.js';
import type { TopicWriteRepository } from '../../infrastructure/persistence/typeorm/TopicWriteRepository.js';

export class UpsertTopicStandingUseCase {
  constructor(private readonly topicWriteRepository: TopicWriteRepository) {}

  async execute(teacherId: number, topicId: number, input: UpsertTopicStandingInput) {
    const topic = await this.topicWriteRepository.findOwnedTopic(teacherId, topicId);
    if (!topic) {
      throw new ServiceError('topic not found', 404);
    }

    const student = await this.topicWriteRepository.findOwnedStudent(teacherId, input.student_id);
    if (!student) {
      throw new ServiceError('student not found', 404);
    }

    const problem = await this.topicWriteRepository.findOwnedTopicProblem(
      teacherId,
      topicId,
      input.problem_id,
    );
    if (!problem) {
      throw new ServiceError('topic problem not found', 404);
    }

    const existing = await this.topicWriteRepository.findTopicStanding(
      teacherId,
      topic.id,
      input.student_id,
      input.problem_id,
    );

    if (existing) {
      existing.solved = input.solved;
      existing.penalty_minutes = input.penalty_minutes ?? null;
      existing.pulled_at = input.pulled_at ?? new Date();
      return this.topicWriteRepository.saveTopicStanding(existing);
    }

    const standing = this.topicWriteRepository.createTopicStanding({
      teacher_id: teacherId,
      topic_id: topic.id,
      student_id: input.student_id,
      problem_id: input.problem_id,
      solved: input.solved,
      penalty_minutes: input.penalty_minutes ?? null,
      pulled_at: input.pulled_at ?? new Date(),
    });

    return this.topicWriteRepository.saveTopicStanding(standing);
  }
}
