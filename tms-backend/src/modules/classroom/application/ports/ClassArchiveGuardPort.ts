export interface ClassArchiveGuardPort {
  assertArchivable(teacherId: number, classId: number): Promise<void>;
}
