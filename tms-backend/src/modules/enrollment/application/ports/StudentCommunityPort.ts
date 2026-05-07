export interface StudentCommunityPort {
  onStudentTransferred(teacherId: number, studentId: number, newClassId: number): Promise<void>;
  onStudentWithdrawn(teacherId: number, studentId: number): Promise<void>;
}
