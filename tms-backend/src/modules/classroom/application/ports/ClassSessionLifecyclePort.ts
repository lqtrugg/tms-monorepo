export interface ClassSessionLifecyclePort {
  cancelUpcomingScheduledSessions(teacherId: number, classId: number, archivedAt: Date): Promise<void>;
}
