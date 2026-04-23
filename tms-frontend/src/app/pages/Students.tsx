import { useEffect, useMemo, useState } from "react";
import { Plus, Search, UserX, ArrowRightLeft, Eye, AlertCircle, DollarSign, CheckCircle } from "lucide-react";

import { ApiError } from "../services/apiClient";
import { listClasses } from "../services/classService";
import {
  archiveStudent,
  buildStudentNote,
  createStudent,
  expelStudent,
  listStudents,
  transferStudent,
  type BackendStudentSummary,
} from "../services/studentService";

type StudentView = {
  id: number;
  name: string;
  email: string;
  classId: number | null;
  className: string;
  status: "active" | "pending_archive" | "archived";
  balance: number;
  joinedDate: string;
  codeforcesHandle?: string;
};

type ActiveClassOption = {
  id: number;
  name: string;
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

function parseAmount(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseEmailFromNote(note: string | null): string {
  if (!note) {
    return "";
  }

  const match = /^email:(.+)$/im.exec(note);
  return match ? match[1].trim() : "";
}

function toStudentView(
  student: BackendStudentSummary,
  classNameById: Map<number, string>,
): StudentView {
  return {
    id: student.id,
    name: student.full_name,
    email: parseEmailFromNote(student.note),
    classId: student.current_class_id,
    className: student.current_class_id !== null
      ? classNameById.get(student.current_class_id) ?? "N/A"
      : "N/A",
    status: student.status,
    balance: parseAmount(student.balance),
    joinedDate: student.created_at.slice(0, 10),
    codeforcesHandle: student.codeforces_handle ?? undefined,
  };
}

export function Students() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "pending_archive" | "archived">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentView | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [students, setStudents] = useState<StudentView[]>([]);
  const [activeClasses, setActiveClasses] = useState<ActiveClassOption[]>([]);
  const [requestError, setRequestError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async (): Promise<void> => {
    setRequestError("");
    try {
      const [classList, studentList] = await Promise.all([
        listClasses("active"),
        listStudents(),
      ]);

      const classNameById = new Map(classList.map((item) => [item.id, item.name]));
      setActiveClasses(classList.map((item) => ({ id: item.id, name: item.name })));
      setStudents(studentList.map((student) => toStudentView(student, classNameById)));
    } catch (error) {
      setRequestError(toErrorMessage(error));
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredStudents = useMemo(
    () => students.filter((student) => {
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase())
        || student.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || student.status === filterStatus;
      return matchesSearch && matchesStatus;
    }),
    [students, searchTerm, filterStatus],
  );

  const pendingStudents = useMemo(
    () => students.filter((student) => student.status === "pending_archive"),
    [students],
  );

  const needCollect = useMemo(
    () => pendingStudents.filter((student) => student.balance < 0),
    [pendingStudents],
  );

  const needRefund = useMemo(
    () => pendingStudents.filter((student) => student.balance > 0),
    [pendingStudents],
  );

  const readyToArchive = useMemo(
    () => pendingStudents.filter((student) => student.balance === 0),
    [pendingStudents],
  );

  const getStatusBadge = (status: StudentView["status"]) => {
    switch (status) {
      case "active":
        return <span className="px-3 py-1 bg-zinc-900 text-white rounded-full text-sm">Đang học</span>;
      case "pending_archive":
        return <span className="px-3 py-1 bg-zinc-300 text-zinc-700 rounded-full text-sm">Chờ xử lý</span>;
      case "archived":
        return <span className="px-3 py-1 bg-zinc-200 text-zinc-600 rounded-full text-sm">Đã lưu trữ</span>;
      default:
        return null;
    }
  };

  const getBalanceColor = (balance: number) => {
    if (balance < 0) {
      return "text-zinc-700";
    }

    if (balance > 0) {
      return "text-zinc-600";
    }

    return "text-zinc-500";
  };

  const handleCreateStudent = async (payload: {
    full_name: string;
    class_id: number;
    codeforces_handle: string | null;
    note: string | null;
  }) => {
    setSubmitting(true);
    setRequestError("");

    try {
      await createStudent(payload);
      setShowAddModal(false);
      await loadData();
    } catch (error) {
      setRequestError(toErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferStudent = async (payload: {
    student_id: number;
    to_class_id: number;
  }) => {
    setSubmitting(true);
    setRequestError("");

    try {
      await transferStudent(payload);
      setShowTransferModal(false);
      setSelectedStudent(null);
      await loadData();
    } catch (error) {
      setRequestError(toErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpelStudent = async (student: StudentView) => {
    setSubmitting(true);
    setRequestError("");

    try {
      await expelStudent(student.id);
      setShowArchiveModal(false);
      setSelectedStudent(null);
      await loadData();
    } catch (error) {
      setRequestError(toErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchivePendingStudent = async (student: StudentView) => {
    setSubmitting(true);
    setRequestError("");

    try {
      await archiveStudent(student.id);
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
          <h1 className="text-3xl font-semibold text-zinc-900 mb-2">Quản lý học sinh</h1>
          <p className="text-zinc-600">
            {filteredStudents.length} học sinh
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-3 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Thêm học sinh
        </button>
      </div>

      {requestError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {requestError}
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
            <input
              type="text"
              placeholder="Tìm kiếm học sinh..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "active", "pending_archive", "archived"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  filterStatus === status
                    ? "bg-zinc-200 text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {status === "all" ? "Tất cả" : status === "active" ? "Đang học" : status === "pending_archive" ? "Chờ xử lý" : "Đã lưu"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filterStatus === "pending_archive" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white border border-zinc-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-zinc-900" />
                </div>
                <div>
                  <p className="text-zinc-600 text-sm">Cần đòi nợ</p>
                  <p className="text-2xl font-semibold text-zinc-900">{needCollect.length}</p>
                </div>
              </div>
              <div className="text-sm text-zinc-600">
                Tổng nợ: <span className="text-zinc-900 font-semibold">
                  {(needCollect.reduce((sum, student) => sum + Math.abs(student.balance), 0) / 1000).toFixed(0)}K
                </span>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-zinc-600" />
                </div>
                <div>
                  <p className="text-zinc-600 text-sm">Cần hoàn trả</p>
                  <p className="text-2xl font-semibold text-zinc-900">{needRefund.length}</p>
                </div>
              </div>
              <div className="text-sm text-zinc-600">
                Tổng dư: <span className="text-zinc-600 font-semibold">
                  {(needRefund.reduce((sum, student) => sum + student.balance, 0) / 1000).toFixed(0)}K
                </span>
              </div>
            </div>
          </div>

          {needCollect.length > 0 && (
            <PendingTable
              title="Cần đòi nợ"
              students={needCollect}
              amountLabel="Số nợ"
              actionLabel="Đã thu đủ nợ"
              submitting={submitting}
              onAction={handleArchivePendingStudent}
            />
          )}

          {needRefund.length > 0 && (
            <PendingTable
              title="Cần hoàn trả"
              students={needRefund}
              amountLabel="Số dư"
              actionLabel="Đã hoàn trả"
              submitting={submitting}
              onAction={handleArchivePendingStudent}
            />
          )}

          {readyToArchive.length > 0 && (
            <PendingTable
              title="Sẵn sàng lưu trữ"
              students={readyToArchive}
              amountLabel="Số dư"
              actionLabel="Lưu trữ"
              submitting={submitting}
              onAction={handleArchivePendingStudent}
            />
          )}

          {pendingStudents.length === 0 && (
            <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center">
              <CheckCircle className="w-12 h-12 text-zinc-900 mx-auto mb-4" />
              <p className="text-zinc-900 font-medium mb-2">Không có học sinh nào chờ xử lý</p>
              <p className="text-zinc-600 text-sm">Tất cả học sinh đã được xử lý xong</p>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-100 border-b border-zinc-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Học sinh</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Lớp</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Trạng thái</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Số dư</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-zinc-600">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-zinc-200/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-zinc-900 font-medium">{student.name}</p>
                      <p className="text-sm text-zinc-600">{student.email || "N/A"}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-700">{student.className}</td>
                  <td className="px-6 py-4">{getStatusBadge(student.status)}</td>
                  <td className="px-6 py-4">
                    <span className={`font-semibold ${getBalanceColor(student.balance)}`}>
                      {student.balance < 0 ? "-" : student.balance > 0 ? "+" : ""}
                      {(Math.abs(student.balance) / 1000).toFixed(0)}K
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="p-2 hover:bg-zinc-200 rounded-lg transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4 text-zinc-600" />
                      </button>
                      {student.status === "active" && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedStudent(student);
                              setShowTransferModal(true);
                            }}
                            className="p-2 hover:bg-zinc-200 rounded-lg transition-colors"
                            title="Chuyển lớp"
                          >
                            <ArrowRightLeft className="w-4 h-4 text-zinc-600" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedStudent(student);
                              setShowArchiveModal(true);
                            }}
                            className="p-2 hover:bg-zinc-200 rounded-lg transition-colors"
                            title="Đuổi học"
                          >
                            <UserX className="w-4 h-4 text-zinc-600" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <AddStudentModal
          classes={activeClasses}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateStudent}
          submitting={submitting}
          error={requestError}
        />
      )}

      {showTransferModal && selectedStudent && (
        <TransferClassModal
          student={selectedStudent}
          classes={activeClasses}
          onClose={() => {
            setShowTransferModal(false);
            setSelectedStudent(null);
          }}
          onSubmit={handleTransferStudent}
          submitting={submitting}
          error={requestError}
        />
      )}

      {showArchiveModal && selectedStudent && (
        <ArchiveStudentModal
          student={selectedStudent}
          onClose={() => {
            setShowArchiveModal(false);
            setSelectedStudent(null);
          }}
          onConfirm={handleExpelStudent}
          submitting={submitting}
          error={requestError}
        />
      )}
    </div>
  );
}

function PendingTable({
  title,
  students,
  amountLabel,
  actionLabel,
  submitting,
  onAction,
}: {
  title: string;
  students: StudentView[];
  amountLabel: string;
  actionLabel: string;
  submitting: boolean;
  onAction: (student: StudentView) => Promise<void>;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">{title}</h2>
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-100 border-b border-zinc-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Học sinh</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Lớp cũ</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">{amountLabel}</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-zinc-600">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-zinc-100/50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-zinc-900 font-medium">{student.name}</p>
                    <p className="text-sm text-zinc-600">{student.email || "N/A"}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-700">{student.className || "N/A"}</td>
                <td className="px-6 py-4">
                  <span className="text-zinc-900 font-semibold">
                    {(Math.abs(student.balance) / 1000).toFixed(0)}K
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => void onAction(student)}
                      className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-60"
                      disabled={submitting}
                    >
                      {actionLabel}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddStudentModal({
  classes,
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  classes: ActiveClassOption[];
  onClose: () => void;
  onSubmit: (payload: {
    full_name: string;
    class_id: number;
    codeforces_handle: string | null;
    note: string | null;
  }) => Promise<void>;
  submitting: boolean;
  error: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [classId, setClassId] = useState("");
  const [codeforcesHandle, setCodeforcesHandle] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError("");

    const classIdValue = Number(classId);

    if (!name.trim()) {
      setLocalError("Họ tên là bắt buộc");
      return;
    }

    if (!Number.isInteger(classIdValue) || classIdValue <= 0) {
      setLocalError("Vui lòng chọn lớp hợp lệ");
      return;
    }

    await onSubmit({
      full_name: name.trim(),
      class_id: classIdValue,
      codeforces_handle: codeforcesHandle.trim() || null,
      note: buildStudentNote(email),
    });
  };

  return (
    <div className="fixed inset-0 bg-white/80 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-zinc-900 mb-6">Thêm học sinh mới</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm text-zinc-600 mb-2">Họ tên</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="Nguyễn Văn A"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-600 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-600 mb-2">Lớp</label>
            <select
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              <option value="">Chọn lớp</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-zinc-600 mb-2">Codeforces Handle (tùy chọn)</label>
            <input
              type="text"
              value={codeforcesHandle}
              onChange={(event) => setCodeforcesHandle(event.target.value)}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="username"
            />
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
              className="flex-1 px-4 py-3 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors font-medium disabled:opacity-60"
            >
              {submitting ? "Đang thêm..." : "Thêm học sinh"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TransferClassModal({
  student,
  classes,
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  student: StudentView;
  classes: ActiveClassOption[];
  onClose: () => void;
  onSubmit: (payload: { student_id: number; to_class_id: number }) => Promise<void>;
  submitting: boolean;
  error: string;
}) {
  const [toClassId, setToClassId] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError("");

    const classId = Number(toClassId);
    if (!Number.isInteger(classId) || classId <= 0) {
      setLocalError("Vui lòng chọn lớp mới hợp lệ");
      return;
    }

    await onSubmit({
      student_id: student.id,
      to_class_id: classId,
    });
  };

  return (
    <div className="fixed inset-0 bg-white/80 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Chuyển lớp</h2>
        <p className="text-zinc-600 mb-6">Học sinh: {student.name}</p>

        <div className="bg-zinc-100 border border-zinc-700 rounded-lg p-4 mb-6">
          <p className="text-zinc-700 text-sm">
            ⚠️ Học sinh phải trả toàn bộ số nợ của lớp cũ trước khi chuyển lớp
          </p>
          <p className="text-zinc-600 text-sm mt-2">
            Số nợ hiện tại: <span className="text-zinc-900 font-semibold">-{(Math.abs(student.balance) / 1000).toFixed(0)}K</span>
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm text-zinc-600 mb-2">Lớp mới</label>
            <select
              value={toClassId}
              onChange={(event) => setToClassId(event.target.value)}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              <option value="">Chọn lớp</option>
              {classes
                .filter((cls) => cls.id !== student.classId)
                .map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
            </select>
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
              className="flex-1 px-4 py-3 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors font-medium disabled:opacity-60"
            >
              {submitting ? "Đang chuyển..." : "Chuyển lớp"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ArchiveStudentModal({
  student,
  onClose,
  onConfirm,
  submitting,
  error,
}: {
  student: StudentView;
  onClose: () => void;
  onConfirm: (student: StudentView) => Promise<void>;
  submitting: boolean;
  error: string;
}) {
  const action = student.balance < 0 ? "collect" : student.balance > 0 ? "refund" : "archive";

  return (
    <div className="fixed inset-0 bg-white/80 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Đuổi học</h2>
        <p className="text-zinc-600 mb-6">Học sinh: {student.name}</p>

        <div className="bg-zinc-100 border border-zinc-700 rounded-lg p-4 mb-6">
          {action === "collect" && (
            <>
              <p className="text-zinc-900 font-semibold mb-2">Học sinh còn nợ</p>
              <p className="text-zinc-600 text-sm">
                Số nợ: <span className="text-zinc-900 font-semibold">-{(Math.abs(student.balance) / 1000).toFixed(0)}K</span>
              </p>
              <p className="text-zinc-600 text-sm mt-2">
                Học sinh sẽ được chuyển sang trạng thái "Chờ đòi nợ"
              </p>
            </>
          )}
          {action === "refund" && (
            <>
              <p className="text-zinc-900 font-semibold mb-2">Học sinh dư tiền</p>
              <p className="text-zinc-600 text-sm">
                Số dư: <span className="text-zinc-900 font-semibold">+{(student.balance / 1000).toFixed(0)}K</span>
              </p>
              <p className="text-zinc-600 text-sm mt-2">
                Học sinh sẽ được chuyển sang trạng thái "Chờ hoàn trả"
              </p>
            </>
          )}
          {action === "archive" && (
            <>
              <p className="text-zinc-700 font-semibold mb-2">Không nợ, không dư</p>
              <p className="text-zinc-600 text-sm">
                Học sinh sẽ được lưu trữ ngay lập tức
              </p>
            </>
          )}
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-900 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void onConfirm(student)}
            disabled={submitting}
            className="flex-1 px-4 py-3 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-600 transition-colors font-medium disabled:opacity-60"
          >
            {submitting ? "Đang xử lý..." : "Xác nhận đuổi học"}
          </button>
        </div>
      </div>
    </div>
  );
}
