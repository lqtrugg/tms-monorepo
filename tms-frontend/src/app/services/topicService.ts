import { apiRequest } from "./apiClient";

export type BackendTopicStatus = "active" | "expired";

export interface BackendTopic {
  id: number;
  teacher_id: number;
  class_id: number;
  title: string;
  gym_link: string;
  gym_id: string | null;
  expires_at: string | null;
  pull_interval_minutes: number;
  last_pulled_at: string | null;
  created_at: string;
  status: BackendTopicStatus;
}

export interface BackendTopicProblem {
  id: number;
  teacher_id: number;
  topic_id: number;
  problem_index: string;
  problem_name: string | null;
}

export interface BackendTopicStandingCell {
  problem_id: number;
  problem_index: string;
  problem_name: string | null;
  solved: boolean;
  penalty_minutes: number | null;
  pulled_at: string | null;
}

export interface BackendTopicStandingRow {
  student_id: number;
  student_name: string;
  solved_count: number;
  problems: BackendTopicStandingCell[];
}

export interface BackendTopicStandingMatrix {
  topic: {
    id: number;
    class_id: number;
    title: string;
    gym_link: string;
    expires_at: string | null;
    last_pulled_at: string | null;
    created_at: string;
  };
  problems: BackendTopicProblem[];
  rows: BackendTopicStandingRow[];
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    query.set(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export async function listTopics(filters?: {
  class_id?: number;
  status?: BackendTopicStatus;
}): Promise<BackendTopic[]> {
  const data = await apiRequest<{ topics: BackendTopic[] }>(
    `/topics${buildQuery({
      class_id: filters?.class_id,
      status: filters?.status,
    })}`,
  );

  return data.topics;
}

export async function createTopic(payload: {
  class_id: number;
  title: string;
  gym_link: string;
  gym_id?: string | null;
  expires_at?: string | null;
  pull_interval_minutes?: number;
}): Promise<BackendTopic> {
  const data = await apiRequest<{ topic: BackendTopic }>("/topics", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return data.topic;
}

export async function addTopicProblem(
  topicId: number,
  payload: { problem_index: string; problem_name?: string | null },
): Promise<BackendTopicProblem> {
  const data = await apiRequest<{ problem: BackendTopicProblem }>(`/topics/${topicId}/problems`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return data.problem;
}

export async function upsertTopicStanding(
  topicId: number,
  payload: {
    student_id: number;
    problem_id: number;
    solved: boolean;
    penalty_minutes?: number | null;
    pulled_at?: string;
  },
) {
  const data = await apiRequest<{ standing: unknown }>(`/topics/${topicId}/standings`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return data.standing;
}

export async function getTopicStanding(topicId: number): Promise<BackendTopicStandingMatrix> {
  return apiRequest<BackendTopicStandingMatrix>(`/topics/${topicId}/standing`);
}
