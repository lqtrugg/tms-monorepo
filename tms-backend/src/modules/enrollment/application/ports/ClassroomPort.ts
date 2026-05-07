export interface ClassroomPort {
  ensureActiveClass(classId: number): Promise<void>;
}
