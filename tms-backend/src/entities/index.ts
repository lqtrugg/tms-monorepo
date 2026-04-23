export { Attendance } from './attendance.entity.js';
export { Class } from './class.entity.js';
export { ClassSchedule } from './class-schedule.entity.js';
export { CodeforcesGroup } from './codeforces-group.entity.js';
export { DiscordMessageRecipient } from './discord-message-recipient.entity.js';
export { DiscordMessage } from './discord-message.entity.js';
export { DiscordServer } from './discord-server.entity.js';
export { Enrollment } from './enrollment.entity.js';
export { FeeRecord } from './fee-record.entity.js';
export { Session } from './session.entity.js';
export { Student } from './student.entity.js';
export { Teacher } from './teacher.entity.js';
export { TopicProblem } from './topic-problem.entity.js';
export { Topic } from './topic.entity.js';
export { TopicStanding } from './topic-standing.entity.js';
export { Transaction } from './transaction.entity.js';
export * from './enums.js';

import { Attendance } from './attendance.entity.js';
import { Class } from './class.entity.js';
import { ClassSchedule } from './class-schedule.entity.js';
import { CodeforcesGroup } from './codeforces-group.entity.js';
import { DiscordMessageRecipient } from './discord-message-recipient.entity.js';
import { DiscordMessage } from './discord-message.entity.js';
import { DiscordServer } from './discord-server.entity.js';
import { Enrollment } from './enrollment.entity.js';
import { FeeRecord } from './fee-record.entity.js';
import { Session } from './session.entity.js';
import { Student } from './student.entity.js';
import { Teacher } from './teacher.entity.js';
import { TopicProblem } from './topic-problem.entity.js';
import { Topic } from './topic.entity.js';
import { TopicStanding } from './topic-standing.entity.js';
import { Transaction } from './transaction.entity.js';

export const appEntities = [
  Teacher,
  Student,
  Class,
  ClassSchedule,
  Session,
  Enrollment,
  Attendance,
  FeeRecord,
  Transaction,
  DiscordServer,
  DiscordMessage,
  DiscordMessageRecipient,
  CodeforcesGroup,
  Topic,
  TopicProblem,
  TopicStanding,
];
