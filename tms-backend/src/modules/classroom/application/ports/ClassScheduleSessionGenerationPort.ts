export interface ClassScheduleSessionGenerationPort {
  reconcileGeneratedSessionsForClass(
    teacherId: number,
    classId: number,
  ): Promise<{ sessions_created: number; sessions_removed: number }>;
}
