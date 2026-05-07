export interface StudentReportReadRepository {
  countActiveStudents(teacherId: number): Promise<number>;
  countActiveClasses(teacherId: number): Promise<number>;
  getStudentLearningProfileSource(teacherId: number, studentId: number): Promise<{
    student: unknown;
    standings: Array<{
      topic_id: number;
      problem_id: number;
      solved: boolean;
      penalty_minutes: number | null;
      pulled_at: Date;
    }>;
    topics: Array<{
      id: number;
      title: string;
      class_id: number;
      gym_link: string | null;
      gym_id: string | null;
      closed_at: Date | null;
    }>;
    problems: Array<{
      id: number;
      problem_index: string;
      problem_name: string | null;
    }>;
    classes: Array<{
      id: number;
      name: string;
    }>;
  }>;
}
