import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";

import { ApiError } from "../services/apiClient";
import {
  listSessionAttendance,
  syncSessionAttendance,
  type BackendAttendanceSource,
  type BackendAttendanceStatus,
  type SessionAttendanceRow,
  upsertAttendance,
} from "../services/attendanceService";
import {
  listClasses,
  listSessions,
  type BackendClass,
  type BackendSession,
  type BackendSessionStatus,
} from "../services/classService";

type SessionWithAttendance = {
  session: BackendSession;
  className: string;
  attendance: SessionAttendanceRow[];
};

const ATTENDANCE_OPTIONS: Array<{ value: BackendAttendanceStatus; label: string }> = [
  { value: "present", label: "Có mặt" },
  { value: "absent_excused", label: "Vắng có lý do" },
  { value: "absent_unexcused", label: "Vắng không lý do" },
];

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Đã có lỗi xảy ra";
}

function formatLocalDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(date: Date, yyyyMmDd: string): boolean {
  const target = new Date(`${yyyyMmDd}T00:00:00`);
  return (
    date.getFullYear() === target.getFullYear()
    && date.getMonth() === target.getMonth()
    && date.getDate() === target.getDate()
  );
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("vi-VN");
}

function statusBadge(status: BackendSessionStatus) {
  if (status === "completed") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "in_progress") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (status === "scheduled") {
    return "bg-sky-50 text-sky-700 border-sky-200";
  }

  return "bg-zinc-100 text-zinc-600 border-zinc-200";
}

function statusText(status: BackendSessionStatus): string {
  if (status === "completed") {
    return "completed";
  }

  if (status === "in_progress") {
    return "đang diễn ra";
  }

  if (status === "cancelled") {
    return "cancelled";
  }

  return "scheduled";
}

function StatusIcon({ status }: { status: BackendSessionStatus }) {
  const iconClassName = "h-4 w-4";
  const label = statusText(status);
  const icon = status === "completed"
    ? <CheckCircle2 className={iconClassName} />
    : status === "cancelled"
      ? <XCircle className={iconClassName} />
      : <Clock className={iconClassName} />;

  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${statusBadge(status)}`}
    >
      {icon}
    </span>
  );
}

function sourceText(source: BackendAttendanceSource | null): string {
  if (source === "manual") {
    return "Thủ công";
  }

  if (source === "bot") {
    return "Bot";
  }

  return "-";
}

function getAttendanceStatus(status: BackendAttendanceStatus | null): BackendAttendanceStatus {
  return status ?? "absent_unexcused";
}

function RequestError({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return (
    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {message}
    </div>
  );
}

async function loadSessionCards(selectedDate: string, selectedClassId: string): Promise<{
  classes: BackendClass[];
  sessions: SessionWithAttendance[];
}> {
  const [classList, sessionList] = await Promise.all([
    listClasses(),
    listSessions(selectedClassId === "all" ? undefined : { class_id: Number(selectedClassId) }),
  ]);

  const classNameById = new Map(classList.map((item) => [item.id, item.name]));
  const daySessions = sessionList.filter((session) => {
    const date = new Date(session.scheduled_at);
    return !Number.isNaN(date.getTime()) && isSameDay(date, selectedDate);
  });

  const attendanceBySession = await Promise.all(daySessions.map(async (session) => {
    const detail = await listSessionAttendance(session.id);
    return {
      session,
      className: classNameById.get(session.class_id) ?? `Lớp #${session.class_id}`,
      attendance: detail.attendance,
    };
  }));

  attendanceBySession.sort((a, b) => (
    new Date(a.session.scheduled_at).getTime() - new Date(b.session.scheduled_at).getTime()
  ));

  return {
    classes: classList,
    sessions: attendanceBySession,
  };
}

function AttendanceList() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(formatLocalDateInput(new Date()));
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [classes, setClasses] = useState<BackendClass[]>([]);
  const [sessions, setSessions] = useState<SessionWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState("");

  const loadData = async (): Promise<void> => {
    setLoading(true);
    setRequestError("");

    try {
      const data = await loadSessionCards(selectedDate, selectedClassId);
      setClasses(data.classes);
      setSessions(data.sessions);
    } catch (error) {
      setRequestError(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [selectedDate, selectedClassId]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-semibold text-zinc-900">Điểm danh</h1>
        <p className="text-zinc-600">Quản lý buổi học và điểm danh</p>
      </div>

      <RequestError message={requestError} />

      <div className="mb-6 flex w-full flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 md:w-fit">
        <label className="block w-full sm:w-64">
          <span className="mb-1 block text-xs font-medium text-zinc-600">Ngày</span>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-zinc-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
        </label>

        <label className="block w-full sm:w-64">
          <span className="mb-1 block text-xs font-medium text-zinc-600">Lớp</span>
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
          >
            <option value="all">Tất cả lớp</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
          <p className="text-zinc-600">Đang tải dữ liệu điểm danh...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
          <p className="text-zinc-600">Không có buổi học nào trong ngày đã chọn.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((row) => {
            const presentCount = row.attendance.filter((item) => item.attendance_status === "present").length;

            return (
              <div
                key={row.session.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/attendance/${row.session.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/attendance/${row.session.id}`);
                  }
                }}
                className="rounded-xl border border-zinc-200 bg-white p-5 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold text-zinc-900">{row.className}</h2>
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusBadge(row.session.status)}`}>
                        {statusText(row.session.status)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600">
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {formatTime(row.session.scheduled_at)}
                      </span>
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        {presentCount}/{row.attendance.length} học sinh có mặt
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AttendanceDetail() {
  const params = useParams();
  const sessionId = Number(params.session_id);
  const [classes, setClasses] = useState<BackendClass[]>([]);
  const [session, setSession] = useState<BackendSession | null>(null);
  const [attendance, setAttendance] = useState<SessionAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStudentId, setSavingStudentId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [requestError, setRequestError] = useState("");

  const loadData = async (): Promise<void> => {
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      setRequestError("session_id không hợp lệ");
      setLoading(false);
      return;
    }

    setLoading(true);
    setRequestError("");

    try {
      const [classList, detail] = await Promise.all([
        listClasses(),
        listSessionAttendance(sessionId),
      ]);
      setClasses(classList);
      setSession(detail.session);
      setAttendance(detail.attendance);
    } catch (error) {
      setRequestError(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [sessionId]);

  const className = useMemo(() => {
    if (!session) {
      return "";
    }

    return classes.find((item) => item.id === session.class_id)?.name ?? `Lớp #${session.class_id}`;
  }, [classes, session]);

  const latestBotPull: string | null = null;

  const readonly = session?.status === "cancelled";

  const handleSync = async () => {
    if (!session || readonly) {
      return;
    }

    setSyncing(true);
    setRequestError("");

    try {
      await syncSessionAttendance(session.id);
      await loadData();
    } catch (error) {
      setRequestError(toErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  };

  const updateRow = async (
    row: SessionAttendanceRow,
    payload: { status?: BackendAttendanceStatus; notes?: string | null },
  ) => {
    if (!session || readonly) {
      return;
    }

    const nextStatus = payload.status ?? getAttendanceStatus(row.attendance_status);
    const nextNotes = payload.notes === undefined ? row.notes : payload.notes;

    setSavingStudentId(row.student_id);
    setRequestError("");

    try {
      await upsertAttendance(session.id, row.student_id, {
        status: nextStatus,
        notes: nextNotes,
      });
      await loadData();
    } catch (error) {
      setRequestError(toErrorMessage(error));
    } finally {
      setSavingStudentId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
          <p className="text-zinc-600">Đang tải chi tiết điểm danh...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-8">
        <RequestError message={requestError || "Không tìm thấy buổi học."} />
        <Link to="/attendance" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 hover:text-zinc-900">
          <ArrowLeft className="h-4 w-4" />
          Quay lại điểm danh
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link to="/attendance" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900">
          <ArrowLeft className="h-4 w-4" />
          Quay lại điểm danh
        </Link>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="mb-2 flex flex-wrap items-center gap-3 text-3xl font-semibold text-zinc-900">
              <span>{className} - {formatDate(session.scheduled_at)}</span>
              <StatusIcon status={session.status} />
            </h1>
            {latestBotPull && (
              <p className="text-zinc-600">
                Cập nhật từ bot: {new Date(latestBotPull).toLocaleString("vi-VN")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSync()}
              disabled={readonly || syncing}
              className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Sync
            </button>
          </div>
        </div>
      </div>

      <RequestError message={requestError} />

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-600">
              <tr>
                <th className="px-5 py-3 font-medium">Học sinh</th>
                <th className="px-5 py-3 font-medium">Trạng thái</th>
                <th className="px-5 py-3 font-medium">Nguồn</th>
                <th className="px-5 py-3 font-medium">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {attendance.map((row) => {
                const saving = savingStudentId === row.student_id;
                return (
                  <tr key={row.student_id} className={readonly ? "bg-zinc-50" : "bg-white"}>
                    <td className="px-5 py-4 font-medium text-zinc-900">{row.student_name}</td>
                    <td className="px-5 py-4">
                      <select
                        value={getAttendanceStatus(row.attendance_status)}
                        disabled={readonly || saving}
                        onChange={(event) => void updateRow(row, {
                          status: event.target.value as BackendAttendanceStatus,
                        })}
                        className="h-9 w-44 rounded-lg border border-zinc-200 bg-white px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:bg-zinc-100 disabled:text-zinc-500"
                      >
                        {ATTENDANCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4 text-zinc-600">{sourceText(row.source)}</td>
                    <td className="px-5 py-4">
                      <input
                        type="text"
                        defaultValue={row.notes ?? ""}
                        disabled={readonly || saving}
                        onBlur={(event) => {
                          const nextNotes = event.target.value.trim() || null;
                          if (nextNotes !== (row.notes ?? null)) {
                            void updateRow(row, { notes: nextNotes });
                          }
                        }}
                        className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:bg-zinc-100 disabled:text-zinc-500"
                        placeholder="Nhập ghi chú"
                      />
                    </td>
                  </tr>
                );
              })}
              {attendance.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-zinc-500">
                    Chưa có học sinh để điểm danh trong buổi này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {readonly && (
          <div className="flex items-center gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-3 text-sm text-zinc-600">
            <XCircle className="h-4 w-4" />
            Buổi học đã huỷ, bảng điểm danh chỉ đọc.
          </div>
        )}
      </div>
    </div>
  );
}

export function Attendance() {
  const params = useParams();

  if (params.session_id) {
    return <AttendanceDetail />;
  }

  return <AttendanceList />;
}
