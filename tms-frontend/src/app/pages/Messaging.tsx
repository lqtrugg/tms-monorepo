import { useEffect, useMemo, useState } from "react";
import {
  Server,
  Settings,
  Eye,
  Send,
  CircleDollarSign,
  BookOpenCheck,
  TriangleAlert,
  Search,
  ListChecks,
  X,
  type LucideIcon,
} from "lucide-react";

import { ApiError } from "../services/apiClient";
import { listClasses, listSessions } from "../services/classService";
import { listSessionAttendance } from "../services/attendanceService";
import { listStudentBalances } from "../services/financeService";
import {
  listDiscordServers,
  listMessages,
  sendChannelPost,
  sendBulkDm,
  upsertDiscordServerByClass,
  type BackendDiscordServer,
  type BackendMessageListRow,
} from "../services/messagingService";
import { getStudentLearningProfile } from "../services/reportingService";
import { listStudents } from "../services/studentService";

type MessageFilter = "all" | "auto_notification" | "channel_post" | "bulk_dm";
type BulkRecipientFilter = "debt" | "incomplete_topic" | "recent_absence";

type ClassOption = {
  id: number;
  name: string;
};

type StudentOption = {
  id: number;
  name: string;
  class_id: number | null;
  has_debt: boolean;
  has_incomplete_topic: boolean;
  absent_in_recent_session: boolean;
};

const BULK_DM_TEMPLATES = [
  {
    id: "debt_reminder",
    label: "Gửi đến người còn nợ tiền",
    icon: CircleDollarSign,
    content: "Chào bạn, hiện bạn còn nợ học phí. Vui lòng hoàn tất thanh toán trước buổi học tiếp theo. Nếu đã chuyển khoản, hãy phản hồi lại tin nhắn này.",
  },
  {
    id: "topic_progress",
    label: "Nhắc tiến độ chuyên đề",
    icon: BookOpenCheck,
    content: "Chào bạn, chuyên đề tuần này còn bài chưa hoàn thành. Bạn vui lòng kiểm tra và hoàn thành các bài còn lại để được ghi nhận đầy đủ.",
  },
  {
    id: "attendance_warning",
    label: "Nhắc nhở chuyên cần",
    icon: TriangleAlert,
    content: "Chào bạn, buổi học gần đây bạn vắng mặt. Vui lòng phản hồi lý do và sắp xếp tham gia đầy đủ các buổi tiếp theo.",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  icon: LucideIcon;
  content: string;
}>;

const BULK_RECIPIENT_FILTERS = [
  {
    id: "debt",
    label: "Còn nợ",
    icon: CircleDollarSign,
  },
  {
    id: "incomplete_topic",
    label: "Chưa hoàn thành bài tập",
    icon: BookOpenCheck,
  },
  {
    id: "recent_absence",
    label: "Vắng buổi gần đây",
    icon: TriangleAlert,
  },
] as const satisfies ReadonlyArray<{
  id: BulkRecipientFilter;
  label: string;
  icon: LucideIcon;
}>;

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Đã có lỗi xảy ra";
}

function parseAmount(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function Messaging() {
  const [selectedTab, setSelectedTab] = useState<"servers" | "messages">("servers");
  const [showAddServerModal, setShowAddServerModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showChannelsModal, setShowChannelsModal] = useState(false);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [selectedServer, setSelectedServer] = useState<BackendDiscordServer | null>(null);
  const [messageFilter, setMessageFilter] = useState<MessageFilter>("all");
  const [requestError, setRequestError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [servers, setServers] = useState<BackendDiscordServer[]>([]);
  const [messages, setMessages] = useState<BackendMessageListRow[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);

  const loadData = async () => {
    setRequestError("");
    try {
      const [serverList, messageList, classList, studentList, balances, sessions] = await Promise.all([
        listDiscordServers(),
        listMessages(),
        listClasses("active"),
        listStudents({ status: "active" }),
        listStudentBalances({ status: "active", include_pending_archive: false }),
        listSessions(),
      ]);

      const debtStudentIds = new Set(
        balances
          .filter((balance) => parseAmount(balance.balance) < 0)
          .map((balance) => balance.student_id),
      );
      const incompleteTopicResults = await Promise.all(studentList.map(async (student) => {
        try {
          const profile = await getStudentLearningProfile(student.id);
          return {
            studentId: student.id,
            incomplete: profile.topics.some((topic) => topic.total_problems > topic.solved_count),
          };
        } catch {
          return {
            studentId: student.id,
            incomplete: false,
          };
        }
      }));
      const incompleteTopicStudentIds = new Set(
        incompleteTopicResults
          .filter((item) => item.incomplete)
          .map((item) => item.studentId),
      );
      const latestSession = sessions
        .filter((session) => session.status !== "cancelled" && new Date(session.scheduled_at).getTime() <= Date.now())
        .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())[0];
      const absentStudentIds = new Set<number>();
      if (latestSession) {
        try {
          const sessionAttendance = await listSessionAttendance(latestSession.id);
          sessionAttendance.attendance
            .filter((row) => row.attendance_status === "absent_excused" || row.attendance_status === "absent_unexcused")
            .forEach((row) => absentStudentIds.add(row.student_id));
        } catch {
          // Keep the messaging page usable even when recent attendance data is unavailable.
        }
      }

      setServers(serverList);
      setMessages(messageList);
      setClasses(classList.map((item) => ({ id: item.id, name: item.name })));
      setStudents(studentList.map((item) => ({
        id: item.id,
        name: item.full_name,
        class_id: item.current_class_id,
        has_debt: debtStudentIds.has(item.id),
        has_incomplete_topic: incompleteTopicStudentIds.has(item.id),
        absent_in_recent_session: absentStudentIds.has(item.id),
      })));
    } catch (error) {
      setRequestError(toErrorMessage(error));
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const classNameById = useMemo(
    () => new Map(classes.map((item) => [item.id, item.name])),
    [classes],
  );

  const filteredMessages = useMemo(
    () => messageFilter === "all" ? messages : messages.filter((item) => item.type === messageFilter),
    [messages, messageFilter],
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900 mb-2">Tin nhắn</h1>
          <p className="text-zinc-600">Quản lý Discord servers và tin nhắn tự động</p>
        </div>
        <button
          onClick={() => setShowSendMessageModal(true)}
          className="flex items-center gap-2 px-4 py-3 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors"
        >
          <Send className="w-5 h-5" />
          Gửi tin nhắn
        </button>
      </div>

      {requestError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {requestError}
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-xl mb-6">
        <div className="flex border-b border-zinc-200">
          <button
            onClick={() => setSelectedTab("servers")}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              selectedTab === "servers"
                ? "text-zinc-900 border-b-2 border-zinc-900"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Discord Servers
          </button>
          <button
            onClick={() => setSelectedTab("messages")}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              selectedTab === "messages"
                ? "text-zinc-900 border-b-2 border-zinc-900"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Lịch sử tin nhắn
          </button>
        </div>
      </div>

      {selectedTab === "servers" && (
        <div>
          {servers.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {servers.map((server) => (
                  <div key={server.id} className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center">
                        <Server className="w-6 h-6 text-zinc-900" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-zinc-900 mb-1">
                          {server.name || classNameById.get(server.class_id) || `Lớp #${server.class_id}`}
                        </h3>
                        <p className="text-sm text-zinc-600 font-mono mb-2">ID: {server.discord_server_id}</p>
                        <p className="text-sm text-zinc-600 mb-4">Lớp: {classNameById.get(server.class_id) ?? `#${server.class_id}`}</p>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedServer(server);
                              setShowConfigModal(true);
                            }}
                            className="px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors text-sm flex items-center gap-1"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            Cấu hình bot
                          </button>
                          <button
                            onClick={() => {
                              setSelectedServer(server);
                              setShowChannelsModal(true);
                            }}
                            className="px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors text-sm flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Xem channels
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowAddServerModal(true)}
                className="w-full p-4 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 transition-colors"
              >
                + Thêm server
              </button>
            </>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center">
              <Server className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Chưa có server nào</h3>
              <p className="text-zinc-600 mb-6">Hãy thêm Discord server đầu tiên để bắt đầu</p>
              <button
                onClick={() => setShowAddServerModal(true)}
                className="px-6 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors font-medium"
              >
                Thêm server đầu tiên
              </button>
            </div>
          )}
        </div>
      )}

      {selectedTab === "messages" && (
        <div>
          <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-6">
            <div className="flex gap-2">
              {(["all", "auto_notification", "channel_post", "bulk_dm"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setMessageFilter(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                    messageFilter === type
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {type === "all" ? "Tất cả" : type === "auto_notification" ? "Thông báo tự động" : type === "channel_post" ? "Channel chung" : "Bulk DM"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredMessages.map((msg) => (
              <div key={msg.id} className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      msg.type === "auto_notification"
                        ? "bg-zinc-100 text-zinc-700"
                        : msg.type === "channel_post"
                        ? "bg-zinc-200 text-zinc-900"
                        : "bg-zinc-900 text-white"
                    }`}>
                      {msg.type === "auto_notification" ? "Tự động" : msg.type === "channel_post" ? "Channel" : "Bulk DM"}
                    </span>
                    <span className="text-sm text-zinc-600">
                      {new Date(msg.created_at).toLocaleString("vi-VN")}
                    </span>
                  </div>
                  {msg.type === "bulk_dm" ? (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700">
                      {msg.recipients.sent}/{msg.recipients.total} gửi thành công
                    </span>
                  ) : msg.type === "channel_post" ? (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700">
                      Đã gửi vào channel chung
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700">
                      Thông báo tự động
                    </span>
                  )}
                </div>

                <p className="text-zinc-900 mb-2">{msg.content}</p>
                {msg.type === "bulk_dm" ? (
                  <p className="text-sm text-zinc-600">
                    Người nhận: {msg.recipients.total} học sinh
                  </p>
                ) : msg.type === "channel_post" ? (
                  <p className="text-sm text-zinc-600">Loại tin nhắn: Channel chung</p>
                ) : (
                  <p className="text-sm text-zinc-600">Loại tin nhắn: Thông báo tự động</p>
                )}

                {msg.type === "bulk_dm" && msg.failures.length > 0 && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="mb-2 text-sm font-medium text-red-700">Lý do gửi thất bại</p>
                    <div className="space-y-1">
                      {msg.failures.map((failure) => (
                        <p key={`${msg.id}-${failure.student_id}`} className="text-sm text-red-700">
                          <span className="font-medium">{failure.student_name}:</span> {failure.error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filteredMessages.length === 0 && (
              <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center">
                <p className="text-zinc-600">Chưa có tin nhắn nào.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showAddServerModal && (
        <ServerModal
          title="Thêm Discord Server"
          classes={classes}
          submitting={submitting}
          onClose={() => setShowAddServerModal(false)}
          onSubmit={async (payload) => {
            setSubmitting(true);
            setRequestError("");
            try {
              await upsertDiscordServerByClass(payload.class_id, payload);
              setShowAddServerModal(false);
              await loadData();
            } catch (error) {
              setRequestError(toErrorMessage(error));
            } finally {
              setSubmitting(false);
            }
          }}
        />
      )}

      {showConfigModal && selectedServer && (
        <ServerModal
          title="Cấu hình bot"
          classes={classes}
          initialValues={{
            class_id: selectedServer.class_id,
            discord_server_id: selectedServer.discord_server_id,
            bot_token: "",
            attendance_voice_channel_id: selectedServer.attendance_voice_channel_id ?? "",
            notification_channel_id: selectedServer.notification_channel_id ?? "",
          }}
          submitting={submitting}
          onClose={() => {
            setShowConfigModal(false);
            setSelectedServer(null);
          }}
          onSubmit={async (payload) => {
            setSubmitting(true);
            setRequestError("");
            try {
              await upsertDiscordServerByClass(payload.class_id, payload);
              setShowConfigModal(false);
              setSelectedServer(null);
              await loadData();
            } catch (error) {
              setRequestError(toErrorMessage(error));
            } finally {
              setSubmitting(false);
            }
          }}
        />
      )}

      {showChannelsModal && selectedServer && (
        <ChannelsModal
          server={selectedServer}
          onClose={() => {
            setShowChannelsModal(false);
            setSelectedServer(null);
          }}
        />
      )}

      {showSendMessageModal && (
        <SendMessageModal
          servers={servers}
          students={students}
          submitting={submitting}
          onClose={() => setShowSendMessageModal(false)}
          onSubmit={async (payload) => {
            setSubmitting(true);
            setRequestError("");
            try {
              if (payload.type === "channel_post") {
                await sendChannelPost({
                  content: payload.content,
                  server_ids: payload.server_ids,
                });
              } else {
                await sendBulkDm({
                  content: payload.content,
                  student_ids: payload.student_ids,
                });
              }
              setShowSendMessageModal(false);
              await loadData();
            } catch (error) {
              setRequestError(toErrorMessage(error));
            } finally {
              setSubmitting(false);
            }
          }}
        />
      )}
    </div>
  );
}

function ServerModal({
  title,
  classes,
  initialValues,
  submitting,
  onClose,
  onSubmit,
}: {
  title: string;
  classes: ClassOption[];
  initialValues?: {
    class_id: number;
    discord_server_id: string;
    bot_token: string;
    attendance_voice_channel_id: string;
    notification_channel_id: string;
  };
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    class_id: number;
    discord_server_id: string;
    bot_token?: string | null;
    attendance_voice_channel_id?: string | null;
    notification_channel_id?: string | null;
  }) => Promise<void>;
}) {
  const [classId, setClassId] = useState(initialValues ? String(initialValues.class_id) : "");
  const [serverId, setServerId] = useState(initialValues?.discord_server_id ?? "");
  const [botToken, setBotToken] = useState(initialValues?.bot_token ?? "");
  const [voiceChannelId, setVoiceChannelId] = useState(initialValues?.attendance_voice_channel_id ?? "");
  const [textChannelId, setTextChannelId] = useState(initialValues?.notification_channel_id ?? "");
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError("");

    const parsedClassId = Number(classId);
    if (!Number.isInteger(parsedClassId) || parsedClassId <= 0) {
      setLocalError("Vui lòng chọn lớp hợp lệ");
      return;
    }

    if (!serverId.trim()) {
      setLocalError("Discord Server ID là bắt buộc");
      return;
    }

    if (!initialValues && !botToken.trim()) {
      setLocalError("Bot token là bắt buộc khi thêm server");
      return;
    }

    await onSubmit({
      class_id: parsedClassId,
      discord_server_id: serverId.trim(),
      bot_token: botToken.trim() || null,
      attendance_voice_channel_id: voiceChannelId.trim() || null,
      notification_channel_id: textChannelId.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-zinc-200 rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-semibold text-zinc-900 mb-6">{title}</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm text-zinc-700 mb-2">Lớp liên kết</label>
            <select
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              <option value="">Chọn lớp</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-700 mb-2">Discord Server ID</label>
            <input
              type="text"
              value={serverId}
              onChange={(event) => setServerId(event.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="123456789012345678"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-700 mb-2">Bot token</label>
            <input
              type="password"
              value={botToken}
              onChange={(event) => setBotToken(event.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder={initialValues ? "Để trống nếu giữ token hiện tại" : "Nhập Discord bot token"}
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-700 mb-2">Voice channel ID (điểm danh)</label>
            <input
              type="text"
              value={voiceChannelId}
              onChange={(event) => setVoiceChannelId(event.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="voice-channel-id"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-700 mb-2">Text channel ID (thông báo)</label>
            <input
              type="text"
              value={textChannelId}
              onChange={(event) => setTextChannelId(event.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="text-channel-id"
            />
          </div>

          {localError && <p className="text-sm text-red-600">{localError}</p>}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-900 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors font-medium"
            >
              {submitting ? "Đang lưu..." : "Lưu cấu hình"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChannelsModal({ server, onClose }: { server: BackendDiscordServer; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-zinc-200 rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Thông tin channels</h2>
        <p className="text-zinc-600 mb-6">Server ID: {server.discord_server_id}</p>

        <div className="space-y-3 mb-6">
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-between">
            <span className="text-zinc-700">Voice channel (điểm danh)</span>
            <span className="text-sm text-zinc-900 font-mono">{server.attendance_voice_channel_id || "Chưa cấu hình"}</span>
          </div>
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-between">
            <span className="text-zinc-700">Text channel (thông báo)</span>
            <span className="text-sm text-zinc-900 font-mono">{server.notification_channel_id || "Chưa cấu hình"}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full px-4 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors font-medium"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}

function SendMessageModal({
  servers,
  students,
  submitting,
  onClose,
  onSubmit,
}: {
  servers: BackendDiscordServer[];
  students: StudentOption[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload:
    | { type: "channel_post"; content: string; server_ids: number[] }
    | { type: "bulk_dm"; content: string; student_ids: number[] }
  ) => Promise<void>;
}) {
  const [messageMode, setMessageMode] = useState<"channel_post" | "bulk_dm">("channel_post");
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [showBulkSelect, setShowBulkSelect] = useState(false);
  const [selectedServers, setSelectedServers] = useState<number[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [content, setContent] = useState("");
  const [localError, setLocalError] = useState("");

  const visibleStudents = useMemo(() => {
    const normalizedSearch = studentSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return students;
    }

    return students.filter((student) => student.name.toLowerCase().includes(normalizedSearch));
  }, [students, studentSearchTerm]);

  const getStudentsByBulkFilter = (filterId: BulkRecipientFilter) => {
    switch (filterId) {
      case "debt":
        return students.filter((student) => student.has_debt);
      case "incomplete_topic":
        return students.filter((student) => student.has_incomplete_topic);
      case "recent_absence":
        return students.filter((student) => student.absent_in_recent_session);
      default:
        return [];
    }
  };

  const selectStudentsByBulkFilter = (filterId: BulkRecipientFilter) => {
    const nextStudentIds = getStudentsByBulkFilter(filterId).map((student) => student.id);
    setSelectedStudents((current) => Array.from(new Set([...current, ...nextStudentIds])));
    setShowBulkSelect(false);
  };

  const toggleServer = (serverId: number) => {
    setSelectedServers((current) => (
      current.includes(serverId)
        ? current.filter((id) => id !== serverId)
        : [...current, serverId]
    ));
  };

  const toggleStudent = (studentId: number) => {
    setSelectedStudents((current) => (
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    ));
  };

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = BULK_DM_TEMPLATES.find((item) => item.id === templateId);
    if (template) {
      setContent(template.content);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError("");

    if (!content.trim()) {
      setLocalError("Nội dung tin nhắn là bắt buộc");
      return;
    }

    if (messageMode === "channel_post") {
      if (selectedServers.length === 0) {
        setLocalError("Vui lòng chọn ít nhất một server");
        return;
      }

      await onSubmit({
        type: "channel_post",
        content: content.trim(),
        server_ids: selectedServers,
      });
      return;
    }

    if (selectedStudents.length === 0) {
      setLocalError("Vui lòng chọn ít nhất một học sinh");
      return;
    }

    await onSubmit({
      type: "bulk_dm",
      content: content.trim(),
      student_ids: selectedStudents,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-zinc-200 rounded-xl p-6 w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-xl">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMessageMode("channel_post")}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                messageMode === "channel_post" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
              }`}
            >
              Channel chung
            </button>
            <button
              type="button"
              onClick={() => setMessageMode("bulk_dm")}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                messageMode === "bulk_dm" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
              }`}
            >
              Bulk DM
            </button>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm text-zinc-700">Nội dung</label>
              {messageMode === "bulk_dm" && (
                <div className="flex items-center gap-2">
                  {BULK_DM_TEMPLATES.map((template) => {
                    const TemplateIcon = template.icon;
                    const active = selectedTemplate === template.id;

                    return (
                      <button
                        key={template.id}
                        type="button"
                        title={template.label}
                        onClick={() => applyTemplate(template.id)}
                        className={`h-9 w-9 rounded-lg border transition-colors flex items-center justify-center ${
                          active
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                        }`}
                        aria-label={template.label}
                      >
                        <TemplateIcon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="Nhập nội dung tin nhắn..."
            />
          </div>

          {messageMode === "channel_post" ? (
            <div>
              <label className="block text-sm text-zinc-700 mb-2">Chọn server nhận tin</label>
              <div className="max-h-60 overflow-y-auto border border-zinc-200 rounded-lg bg-zinc-50 p-3 space-y-2">
                {servers.map((server) => (
                  <label
                    key={server.id}
                    className="flex items-center justify-between px-3 py-2 bg-white border border-zinc-200 rounded-lg cursor-pointer"
                  >
                    <div>
                      <p className="text-zinc-900">
                        {server.name || `Server #${server.id}`}
                      </p>
                      <p className="text-xs text-zinc-500 font-mono">{server.discord_server_id}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedServers.includes(server.id)}
                      onChange={() => toggleServer(server.id)}
                    />
                  </label>
                ))}
                {servers.length === 0 && (
                  <p className="text-sm text-zinc-500 px-1 py-2">Chưa có server Discord nào để gửi.</p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div>
                <label className="block text-sm text-zinc-700 mb-2">Chọn học sinh</label>
                <div className="mb-3 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={studentSearchTerm}
                      onChange={(event) => setStudentSearchTerm(event.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                      placeholder="Nhập tên học sinh..."
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowBulkSelect((current) => !current)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                        title="Chọn hàng loạt"
                        aria-label="Chọn hàng loạt"
                      >
                        <ListChecks className="h-4 w-4" />
                      </button>

                      {showBulkSelect && (
                        <div className="absolute right-0 z-10 mt-2 w-72 rounded-lg border border-zinc-200 bg-white p-2 shadow-xl">
                          {BULK_RECIPIENT_FILTERS.map((filter) => {
                            const FilterIcon = filter.icon;
                            const count = getStudentsByBulkFilter(filter.id).length;

                            return (
                              <button
                                key={filter.id}
                                type="button"
                                onClick={() => selectStudentsByBulkFilter(filter.id)}
                                className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100"
                              >
                                <span className="flex items-center gap-2">
                                  <FilterIcon className="h-4 w-4 text-zinc-500" />
                                  {filter.label}
                                </span>
                                <span className="text-xs text-zinc-500">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStudents([])}
                      disabled={selectedStudents.length === 0}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                      title="Bỏ chọn tất cả"
                      aria-label="Bỏ chọn tất cả"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto border border-zinc-200 rounded-lg bg-zinc-50 p-3 space-y-2">
                  {visibleStudents.map((student) => (
                    <label
                      key={student.id}
                      className="flex items-center justify-between px-3 py-2 bg-white border border-zinc-200 rounded-lg cursor-pointer"
                    >
                      <span className="text-zinc-900">{student.name}</span>
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => toggleStudent(student.id)}
                      />
                    </label>
                  ))}
                  {visibleStudents.length === 0 && (
                    <p className="text-sm text-zinc-500 px-1 py-2">Không có học sinh trong bộ lọc hiện tại.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {localError && <p className="text-sm text-red-600">{localError}</p>}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-900 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors font-medium"
            >
              {submitting ? "Đang gửi..." : "Gửi tin nhắn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
