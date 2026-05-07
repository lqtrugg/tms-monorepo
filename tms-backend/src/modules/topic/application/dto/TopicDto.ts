export type TopicStatusFilter = 'active' | 'closed';

export type TopicListQuery = {
  class_id?: number;
  status?: TopicStatusFilter;
};

export type CreateTopicInput = {
  class_id: number;
  gym_link: string;
  pull_interval_minutes?: number;
};

export type AddTopicProblemInput = {
  problem_index: string;
  problem_name?: string | null;
};

export type UpsertTopicStandingInput = {
  student_id: number;
  problem_id: number;
  solved: boolean;
  penalty_minutes?: number | null;
  pulled_at?: Date;
};
