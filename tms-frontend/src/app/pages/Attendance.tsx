import { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle, XCircle, AlertCircle } from "lucide-react";

import { ApiError } from "../services/apiClient";
import {
  listSessionAttendance,
  type BackendAttendanceStatus,
  upsertAttendance,
} from "../services/attendanceService";
import { cancelSession, listClasses, listSessions, type BackendSession } from "../services/classService";

type SessionWithAttendance = {
  session: BackendSession;
  className: string;
  attendance: Array<{
    student_id: number;
    student_name: string;
    status: BackendAttendanceStatus | null;
    notes: string | null;
  }>;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Đã có lỗi xảy ra";
}

function isSameDay(date: Date, yyyyMmDd: string): boolean {
  const target = new Date(`${yyyyMmDd}T00:00:00`);
  return (
    date.getFullYear() === target.getFullYear()
    && date.getMonth() === target.getMonth()
    && date.getDate() === target.getDate()
  );
}

function statusLabel(status: BackendAttendanceStatus | null): "present" | "excused" | "absent" {
  if (status === "present") {
    return "present";
  }

  if (status === "absent_excused") {
    return "excused";
  }

  return "absent";
}

export function Attendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [sessions, setSessions] = useState<SessionWithAttendance[]>([]);

  const loadData = async (): Promise<void> => {
    setLoading(true);
    setRequestError("");

    try {
      const [classList, sessionList] = await Promise.all([
        listClasses(),
        listSessions(),
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
          attendance: detail.attendance.map((row) => ({
            student_id: row.student_id,
            student_name: row.student_name,
            status: row.attendance_status,
            notes: row.notes,
          })),
        };
      }));

      attendanceBySession.sort((a, b) => (
        new Date(a.session.scheduled_at).getTime() - new Date(b.session.scheduled_at).getTime()
      ));

      setSessions(attendanceBySession);
    } catch (error) {
      setRequestError(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [selectedDate]);

  const hasSessions = useMemo(() => sessions.length > 0, [sessions]);

  const handleUpdateAttendance = async (
    sessionId: number,
    studentId: number,
    nextStatus: BackendAttendanceStatus,
  ) => {
    setSubmitting(true);
    setRequestError("");

    try {
      await upsertAttendance(sessionId, studentId, { status: nextStatus });
      await loadData();
    } catch (error) {
      setRequestError(toErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSession = async (sessionId: number) => {
    setSubmitting(true);
    setRequestError("");

    try {
      await cancelSession(sessionId);
      await loadData();
    } catch (error) {
      setRequestError(toErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900 mb-2">Điểm danh</h1>
          <p className="text-zinc-600">Quản lý buổi học và điểm danh</p>
        </div>
      </div>

      {requestError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {requestError}
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-zinc-600" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center">
          <p className="text-zinc-600">Đang tải dữ liệu điểm danh...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sessions.map((row) => (
            <div key={row.session.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-zinc-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 mb-1">{row.className}</h3>
                    <p className="text-zinc-600 text-sm">
                      {new Date(row.session.scheduled_at).toLocaleDateString("vi-VN")} -{" "}
                      {new Date(row.session.scheduled_at).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {row.session.status === "completed" ? (
                      <span className="px-3 py-1 bg-white text-black rounded-full text-sm">
                        Đã hoàn thành
                      </span>
                    ) : row.session.status === "scheduled" ? (
                      <span className="px-3 py-1 bg-zinc-200 text-zinc-700 rounded-full text-sm">
                        Sắp diễn ra
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-sm">
                        Đã hủy
                      </span>
                    )}
                    {row.session.status === "scheduled" && (
                      <button
                        className="px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-60"
                        onClick={() => void handleCancelSession(row.session.id)}
                        disabled={submitting}
                      >
                        Hủy buổi học
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-2">
                  {row.attendance.map((att) => {
                    const current = statusLabel(att.status);
                    return (
                      <div key={att.student_id} className="flex items-center justify-between p-3 bg-zinc-100 rounded-lg">
                        <div className="flex items-center gap-3">
                          {current === "present" ? (
                            <CheckCircle className="w-5 h-5 text-zinc-900" />
                          ) : current === "excused" ? (
                            <AlertCircle className="w-5 h-5 text-zinc-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-zinc-600" />
                          )}
                          <span className="text-zinc-900">{att.student_name}</span>
                          {att.notes && (
                            <span className="text-sm text-zinc-600">- {att.notes}</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            className={`px-3 py-1 rounded-lg text-sm ${
                              current === "present"
                                ? "bg-white text-black"
                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                            }`}
                            disabled={submitting || row.session.status === "cancelled"}
                            onClick={() => void handleUpdateAttendance(row.session.id, att.student_id, "present")}
                          >
                            Có mặt
                          </button>
                          <button
                            className={`px-3 py-1 rounded-lg text-sm ${
                              current === "excused"
                                ? "bg-zinc-200 text-zinc-900"
                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                            }`}
                            disabled={submitting || row.session.status === "cancelled"}
                            onClick={() => void handleUpdateAttendance(row.session.id, att.student_id, "absent_excused")}
                          >
                            Nghỉ có lý do
                          </button>
                          <button
                            className={`px-3 py-1 rounded-lg text-sm ${
                              current === "absent"
                                ? "bg-zinc-300 text-zinc-900"
                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                            }`}
                            disabled={submitting || row.session.status === "cancelled"}
                            onClick={() => void handleUpdateAttendance(row.session.id, att.student_id, "absent_unexcused")}
                          >
                            Vắng
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {row.attendance.length === 0 && (
                    <p className="text-sm text-zinc-500">Chưa có học sinh để điểm danh trong buổi này.</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {!hasSessions && (
            <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center">
              <p className="text-zinc-600">Không có buổi học nào trong ngày đã chọn.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
