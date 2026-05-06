import { Attendance } from './classroom/domain/attendance.entity.js';
import { ClassSchedule } from './classroom/domain/class-schedule.entity.js';
import { Class } from './classroom/domain/class.entity.js';
import { Session } from './classroom/domain/session.entity.js';
import { Enrollment } from './enrollment/domain/enrollment.entity.js';
import { Student } from './enrollment/domain/student.entity.js';
import { FeeRecord } from './finance/domain/fee-record.entity.js';
import { TransactionAuditLog } from './finance/domain/transaction-audit-log.entity.js';
import { Transaction } from './finance/domain/transaction.entity.js';
import { Teacher } from './identity/domain/teacher.entity.js';
import { DiscordMessageRecipient } from './messaging/domain/discord-message-recipient.entity.js';
import { DiscordMessage } from './messaging/domain/discord-message.entity.js';
import { DiscordServer } from './messaging/domain/discord-server.entity.js';
import { TopicProblem } from './topic/domain/topic-problem.entity.js';
import { TopicStanding } from './topic/domain/topic-standing.entity.js';
import { Topic } from './topic/domain/topic.entity.js';

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
  Topic,
  TopicProblem,
  TopicStanding,
  TransactionAuditLog,
];

