import { useEffect, useMemo, useState } from "react";
import { Plus, Edit2, Archive, Users, Calendar, Trash2 } from "lucide-react";

import { ApiError } from "../services/apiClient";
import {
  type BackendClass,
  type BackendClassSchedule,
  archiveClass,
  createClass,
  createClassSchedule,
  deleteClassSchedule,
  listClassSchedules,
  listClasses,
  updateClass,
} from "../services/classService";
import { listStudents } from "../services/studentService";

type ClassCard = {
  id: number;
  name: string;
  schedule: string;
  feePerSession: number;
  status: "active" | "archived";
  studentCount: number;
};

const DAY_OPTIONS = [
  { value: 0, label: "Chủ nhật" },
  { value: 1, label: "Thứ 2" },
  { value: 2, label: "Thứ 3" },
  { value: 3, label: "Thứ 4" },
  { value: 4, label: "Thứ 5" },
  { value: 5, label: "Thứ 6" },
  { value: 6, label: "Thứ 7" },
] as const;

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

function formatScheduleItem(schedule: BackendClassSchedule): string {
  const dayLabel = DAY_OPTIONS.find((item) => item.value === schedule.day_of_week)?.label ?? `Thứ ${schedule.day_of_week}`;
  const timeLabel = `${schedule.start_time.slice(0, 5)}-${schedule.end_time.slice(0, 5)}`;
  return `${dayLabel} - ${timeLabel}`;
}

function formatScheduleSummary(schedules: BackendClassSchedule[]): string {
  if (schedules.length === 0) {
    return "Chưa thiết lập";
  }

  const rows = schedules.map((schedule) => {
    const dayLabel = DAY_OPTIONS.find((item) => item.value === schedule.day_of_week)?.label ?? `Thứ ${schedule.day_of_week}`;
    return `${dayLabel} ${schedule.start_time.slice(0, 5)}-${schedule.end_time.slice(0, 5)}`;
  });

  return Array.from(new Set(rows)).join(", ");
}

async function buildClassCards(rawClasses: BackendClass[]): Promise<ClassCard[]> {
  const [students, scheduleRows] = await Promise.all([
    listStudents({ status: "active" }),
    Promise.all(
      rawClasses.map(async (classItem) => ({
        class_id: classItem.id,
        schedules: await listClassSchedules(classItem.id),
      })),
    ),
  ]);

  const studentCountByClassId = new Map<number, number>();
  students.forEach((student) => {
    if (student.current_class_id === null) {
      return;
    }

    studentCountByClassId.set(
      student.current_class_id,
      (studentCountByClassId.get(student.current_class_id) ?? 0) + 1,
    );
  });

  const scheduleByClassId = new Map<number, string>(
    scheduleRows.map((row) => [row.class_id, formatScheduleSummary(row.schedules)]),
  );

  return rawClasses.map((classItem) => ({
    id: classItem.id,
    name: classItem.name,
    schedule: scheduleByClassId.get(classItem.id) ?? "Chưa thiết lập",
    feePerSession: parseAmount(classItem.fee_per_session),
    status: classItem.status,
    studentCount: studentCountByClassId.get(classItem.id) ?? 0,
  }));
}

export function Classes() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassCard | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditScheduleModal, setShowEditScheduleModal] = useState(false);
  const [viewMode, setViewMode] = useState<"classes" | "schedules">("classes");
  const [classes, setClasses] = useState<ClassCard[]>([]);
  const [requestError, setRequestError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refreshClasses = async (): Promise<void> => {
    const rawClasses = await listClasses();
    const classCards = await buildClassCards(rawClasses);
    setClasses(classCards);
  };

  useEffect(() => {
    const loadClasses = async () => {
      try {
        setRequestError("");
        await refreshClasses();
      } catch (error) {
        setRequestError(toErrorMessage(error));
      }
    };

    void loadClasses();
  }, []);

  const activeClasses = useMemo(
    () => classes.filter((classItem) => classItem.status === "active"),
    [classes],
  );
  const archivedClasses = useMemo(
    () => classes.filter((classItem) => classItem.status === "archived"),
    [classes],
  );

  const handleCreateClass = async (payload: { name: string; feePerSession: number }) => {
    setSubmitting(true);
    setRequestError("");

    try {
      await createClass({
        name: payload.name,
        fee_per_session: payload.feePerSession,
      });

      await refreshClasses();
      setShowAddModal(false);
    } catch (error) {
      setRequestError(toErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateClass = async (payload: { classId: number; name: string; feePerSession: number }) => {
    setSubmitting(true);
    setRequestError("");

    try {
      await updateClass(payload.classId, {
        name: payload.name,
        fee_per_session: payload.feePerSession,
      });
      await refreshClasses();
      setShowEditModal(false);
      setSelectedClass(null);
    } catch (error) {
      setRequestError(toErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveClass = async (classId: number) => {
    setSubmitting(true);
    setRequestError("");

    try {
      await archiveClass(classId);
      await refreshClasses();
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
          <h1 className="text-3xl font-semibold text-zinc-900 mb-2">Quản lý lớp học</h1>
          <p className="text-zinc-600">
            {activeClasses.length} lớp đang mở
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-3 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Tạo lớp mới
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("classes")}
            className={`px-4 py-3 rounded-lg font-medium transition-colors ${
              viewMode === "classes"
                ? "bg-zinc-200 text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Lớp học
          </button>
          <button
            onClick={() => setViewMode("schedules")}
            className={`px-4 py-3 rounded-lg font-medium transition-colors ${
              viewMode === "schedules"
                ? "bg-zinc-200 text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Lịch học
          </button>
        </div>
      </div>

      {requestError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {requestError}
        </div>
      )}

      {viewMode === "classes" ? (
        <>
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">Lớp đang mở</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeClasses.map((cls) => (
                <div key={cls.id} className="bg-white border border-zinc-200 rounded-xl p-6 hover:border-zinc-700 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-zinc-900 mb-1">{cls.name}</h3>
                      <div className="flex items-center gap-2 text-zinc-600 text-sm">
                        <Users className="w-4 h-4" />
                        <span>{cls.studentCount} học sinh</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedClass(cls);
                        setShowEditModal(true);
                      }}
                      className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-zinc-600" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-zinc-100 rounded-lg">
                      <span className="text-zinc-600 text-sm">Lịch học</span>
                      <span className="text-zinc-900 text-sm">{cls.schedule}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-zinc-100 rounded-lg">
                      <span className="text-zinc-600 text-sm">Học phí/buổi</span>
                      <span className="text-zinc-900 font-semibold">
                        {(cls.feePerSession / 1000).toFixed(0)}K
                      </span>
                    </div>
                  </div>

                  <button
                    className="w-full mt-4 px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    onClick={() => void handleArchiveClass(cls.id)}
                    disabled={submitting}
                  >
                    <Archive className="w-4 h-4" />
                    Đóng lớp
                  </button>
                </div>
              ))}
            </div>
          </div>

          {archivedClasses.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Lớp đã đóng</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {archivedClasses.map((cls) => (
                  <div key={cls.id} className="bg-white border border-zinc-200 rounded-xl p-6 opacity-60">
                    <h3 className="text-xl font-semibold text-zinc-900 mb-1">{cls.name}</h3>
                    <p className="text-zinc-600 text-sm mb-4">{cls.schedule}</p>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-sm">
                        Đã đóng
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Lịch học recurring</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeClasses.map((cls) => (
              <div key={cls.id} className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-zinc-900" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900">{cls.name}</h3>
                      <span className="text-xs text-zinc-600">Đang hoạt động</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedClass(cls);
                      setShowEditScheduleModal(true);
                    }}
                    className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-zinc-600" />
                  </button>
                </div>

                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                  <p className="text-sm text-zinc-600 mb-1">Lịch học recurring</p>
                  <p className="text-zinc-900 font-medium">{cls.schedule}</p>
                </div>

                <div className="mt-4 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                  <p className="text-xs text-zinc-600">
                    💡 Buổi học sẽ tự động tạo theo lịch này. Bạn có thể thêm buổi ngoài lịch tại trang Buổi học.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddModal && (
        <AddClassModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateClass}
          submitting={submitting}
          error={requestError}
        />
      )}

      {showEditModal && selectedClass && (
        <EditClassModal
          classData={selectedClass}
          onClose={() => {
            setShowEditModal(false);
            setSelectedClass(null);
          }}
          onSubmit={handleUpdateClass}
          submitting={submitting}
          error={requestError}
        />
      )}

      {showEditScheduleModal && selectedClass && (
        <EditScheduleModal
          classData={selectedClass}
          onSaved={async () => {
            await refreshClasses();
          }}
          onClose={() => {
            setShowEditScheduleModal(false);
            setSelectedClass(null);
          }}
        />
      )}
    </div>
  );
}

function AddClassModal({
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  onClose: () => void;
  onSubmit: (payload: { name: string; feePerSession: number }) => Promise<void>;
  submitting: boolean;
  error: string;
}) {
  const [name, setName] = useState("");
  const [feePerSession, setFeePerSession] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError("");

    const normalizedName = name.trim();
    const parsedFee = Number(feePerSession);

    if (!normalizedName) {
      setLocalError("Tên lớp là bắt buộc");
      return;
    }

    if (!Number.isInteger(parsedFee) || parsedFee < 0) {
      setLocalError("Học phí/buổi phải là số nguyên không âm");
      return;
    }

    await onSubmit({
      name: normalizedName,
      feePerSession: parsedFee,
    });
  };

  return (
    <div className="fixed inset-0 bg-white/80 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-6 w-full max-w-md">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm text-zinc-600 mb-2">Tên lớp</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="Lớp Cơ Bản"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-600 mb-2">Học phí/buổi (VNĐ)</label>
            <input
              type="number"
              min={0}
              value={feePerSession}
              onChange={(event) => setFeePerSession(event.target.value)}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="150000"
            />
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg p-3">
            <p className="text-sm text-zinc-700">
              💡 Sau khi tạo lớp, vào tab "Lịch học" để thêm lịch recurring theo thứ và giờ cụ thể.
            </p>
          </div>

          {(localError || error) && <p className="text-sm text-red-600">{localError || error}</p>}

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
              className="flex-1 px-4 py-3 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors font-medium"
            >
              {submitting ? "Đang tạo..." : "Tạo lớp"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditClassModal({
  classData,
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  classData: ClassCard;
  onClose: () => void;
  onSubmit: (payload: { classId: number; name: string; feePerSession: number }) => Promise<void>;
  submitting: boolean;
  error: string;
}) {
  const [name, setName] = useState(classData.name);
  const [feePerSession, setFeePerSession] = useState(String(classData.feePerSession));
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError("");

    const parsedFee = Number(feePerSession);
    const normalizedName = name.trim();

    if (!normalizedName) {
      setLocalError("Tên lớp là bắt buộc");
      return;
    }

    if (!Number.isInteger(parsedFee) || parsedFee < 0) {
      setLocalError("Học phí/buổi phải là số nguyên không âm");
      return;
    }

    await onSubmit({
      classId: classData.id,
      name: normalizedName,
      feePerSession: parsedFee,
    });
  };

  return (
    <div className="fixed inset-0 bg-white/80 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-zinc-900 mb-6">Chỉnh sửa lớp</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm text-zinc-600 mb-2">Tên lớp</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-600 mb-2">Học phí/buổi (VNĐ)</label>
            <input
              type="number"
              value={feePerSession}
              onChange={(event) => setFeePerSession(event.target.value)}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
            <p className="text-xs text-zinc-600 mt-2">
              ⚠️ Thay đổi chỉ áp dụng từ buổi tiếp theo
            </p>
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg p-3">
            <p className="text-sm text-zinc-700">
              💡 Lịch học recurring được quản lý trong tab "Lịch học" của lớp.
            </p>
          </div>

          {(localError || error) && <p className="text-sm text-red-600">{localError || error}</p>}

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
              {submitting ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditScheduleModal({
  classData,
  onClose,
  onSaved,
}: {
  classData: ClassCard;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [schedules, setSchedules] = useState<BackendClassSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const classId = classData.id;

  const loadSchedules = async () => {
    setLoadingSchedules(true);
    setError("");

    try {
      const scheduleList = await listClassSchedules(classId);
      setSchedules(scheduleList);
    } catch (requestError) {
      setError(toErrorMessage(requestError));
    } finally {
      setLoadingSchedules(false);
    }
  };

  useEffect(() => {
    void loadSchedules();
  }, [classId]);

  const handleCreateSchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    const parsedDay = Number(dayOfWeek);
    if (!Number.isInteger(parsedDay) || parsedDay < 0 || parsedDay > 6) {
      setError("Thứ học không hợp lệ");
      return;
    }

    if (!startTime) {
      setError("Vui lòng chọn giờ học");
      return;
    }

    if (!endTime) {
      setError("Vui lòng chọn giờ kết thúc");
      return;
    }

    if (endTime <= startTime) {
      setError("Giờ kết thúc phải lớn hơn giờ bắt đầu");
      return;
    }

    setSubmitting(true);

    try {
      const result = await createClassSchedule(classId, {
        day_of_week: parsedDay,
        start_time: startTime,
        end_time: endTime,
      });

      await loadSchedules();
      await onSaved();
      setStartTime("");
      setEndTime("");
      setSuccessMessage(`Đã thêm lịch học. Tạo mới ${result.sessions_created} buổi học.`);
    } catch (requestError) {
      setError(toErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    setSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      await deleteClassSchedule(classId, scheduleId);
      await loadSchedules();
      await onSaved();
      setSuccessMessage("Đã xóa lịch học.");
    } catch (requestError) {
      setError(toErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-zinc-200 rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-semibold text-zinc-900 mb-6">Thiết lập lịch học</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-700 mb-2">Lớp</label>
            <input
              type="text"
              value={classData.name}
              disabled
              className="w-full px-4 py-3 bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-600 cursor-not-allowed"
            />
          </div>

          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
            <p className="text-sm text-zinc-700 mb-2 font-medium">Lịch đang áp dụng</p>
            {loadingSchedules ? (
              <p className="text-sm text-zinc-600">Đang tải lịch học...</p>
            ) : schedules.length === 0 ? (
              <p className="text-sm text-zinc-600">Chưa có lịch học recurring.</p>
            ) : (
              <div className="space-y-2">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="flex items-center justify-between bg-white border border-zinc-200 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm text-zinc-900 font-medium">{formatScheduleItem(schedule)}</p>
                      <p className="text-xs text-zinc-600">Recurring theo tuần</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteSchedule(schedule.id)}
                      disabled={submitting}
                      className="p-2 rounded-md text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
                      title="Xóa lịch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form className="space-y-4" onSubmit={handleCreateSchedule}>
            <div>
              <label className="block text-sm text-zinc-700 mb-2">Thứ học</label>
              <select
                value={dayOfWeek}
                onChange={(event) => setDayOfWeek(event.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                {DAY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-zinc-700 mb-2">Giờ bắt đầu</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-700 mb-2">Giờ kết thúc</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
              </div>
            </div>

            {(error || successMessage) && (
              <p className={`text-sm ${error ? "text-red-600" : "text-emerald-700"}`}>
                {error || successMessage}
              </p>
            )}

            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
              <p className="text-sm text-zinc-700">
                💡 Lịch mới sẽ tự động tạo các buổi học trong tương lai.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
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
                className="flex-1 px-4 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors font-medium disabled:opacity-60"
              >
                {submitting ? "Đang lưu..." : "Thêm lịch"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
