import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle, DollarSign } from "lucide-react";

import { ApiError } from "../services/apiClient";
import { archiveStudent, listStudents, type BackendStudentSummary } from "../services/studentService";

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

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + " ₫";
}

export function PendingArchive() {
  const [pendingStudents, setPendingStudents] = useState<BackendStudentSummary[]>([]);
  const [requestError, setRequestError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingStudentId, setSubmittingStudentId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    setRequestError("");

    try {
      const students = await listStudents({ status: "pending_archive" });
      setPendingStudents(students);
    } catch (error) {
      setRequestError(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const needCollect = useMemo(
    () => pendingStudents.filter((student) => parseAmount(student.balance) < 0),
    [pendingStudents],
  );
  const needRefund = useMemo(
    () => pendingStudents.filter((student) => parseAmount(student.balance) > 0),
    [pendingStudents],
  );
  const zeroBalance = useMemo(
    () => pendingStudents.filter((student) => parseAmount(student.balance) === 0),
    [pendingStudents],
  );

  const handleSettleAndArchive = async (student: BackendStudentSummary) => {
    setSubmittingStudentId(student.id);
    setRequestError("");

    try {
      await archiveStudent(student.id, { settle_finance: true });
      await loadData();
    } catch (error) {
      setRequestError(toErrorMessage(error));
    } finally {
      setSubmittingStudentId(null);
    }
  };

  const handleArchiveZeroBalance = async (student: BackendStudentSummary) => {
    setSubmittingStudentId(student.id);
    setRequestError("");

    try {
      await archiveStudent(student.id);
      await loadData();
    } catch (error) {
      setRequestError(toErrorMessage(error));
    } finally {
      setSubmittingStudentId(null);
    }
  };

  const totalDebt = needCollect.reduce((sum, student) => sum + Math.abs(parseAmount(student.balance)), 0);
  const totalRefund = needRefund.reduce((sum, student) => sum + parseAmount(student.balance), 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-zinc-900 mb-2">Học sinh chờ xử lý</h1>
        <p className="text-zinc-600">
          {loading ? "Đang tải..." : `${pendingStudents.length} học sinh đang chờ xử lý`}
        </p>
      </div>

      {requestError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {requestError}
        </div>
      )}

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
            Tổng nợ: <span className="text-zinc-900 font-semibold">{formatMoney(totalDebt)}</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-zinc-900" />
            </div>
            <div>
              <p className="text-zinc-600 text-sm">Cần hoàn trả</p>
              <p className="text-2xl font-semibold text-zinc-900">{needRefund.length}</p>
            </div>
          </div>
          <div className="text-sm text-zinc-600">
            Tổng dư: <span className="text-zinc-900 font-semibold">{formatMoney(totalRefund)}</span>
          </div>
        </div>
      </div>

      <PendingTable
        title="Cần đòi nợ"
        students={needCollect}
        amountLabel="Số nợ"
        actionLabel="Đã thu nợ"
        submittingStudentId={submittingStudentId}
        onAction={handleSettleAndArchive}
      />

      <PendingTable
        title="Cần hoàn trả"
        students={needRefund}
        amountLabel="Số dư"
        actionLabel="Đã hoàn trả"
        submittingStudentId={submittingStudentId}
        onAction={handleSettleAndArchive}
      />

      <PendingTable
        title="Không còn tồn đọng"
        students={zeroBalance}
        amountLabel="Số dư"
        actionLabel="Archive"
        submittingStudentId={submittingStudentId}
        onAction={handleArchiveZeroBalance}
      />

      {!loading && pendingStudents.length === 0 && (
        <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center">
          <CheckCircle className="w-12 h-12 text-zinc-900 mx-auto mb-4" />
          <p className="text-zinc-900 font-medium mb-2">Không có học sinh nào chờ xử lý</p>
          <p className="text-zinc-600 text-sm">Tất cả học sinh đã được xử lý xong</p>
        </div>
      )}
    </div>
  );
}

function PendingTable({
  title,
  students,
  amountLabel,
  actionLabel,
  submittingStudentId,
  onAction,
}: {
  title: string;
  students: BackendStudentSummary[];
  amountLabel: string;
  actionLabel: string;
  submittingStudentId: number | null;
  onAction: (student: BackendStudentSummary) => Promise<void>;
}) {
  if (students.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">{title}</h2>
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-100 border-b border-zinc-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Học sinh</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Lớp hiện tại</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">{amountLabel}</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-zinc-600">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {students.map((student) => {
              const amount = parseAmount(student.balance);
              return (
                <tr key={student.id} className="hover:bg-zinc-100/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-zinc-900 font-medium">{student.full_name}</p>
                    {student.discord_username && (
                      <p className="text-sm text-zinc-600">{student.discord_username}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {student.current_class_id ? `#${student.current_class_id}` : "Không còn lớp"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-zinc-900 font-semibold">{formatMoney(Math.abs(amount))}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => void onAction(student)}
                        disabled={submittingStudentId === student.id}
                        className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-60"
                      >
                        {submittingStudentId === student.id ? "Đang xử lý..." : actionLabel}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
