import { useEffect, useMemo, useState } from "react";
import { Plus, Search, DollarSign, TrendingUp, TrendingDown } from "lucide-react";

import { ApiError } from "../services/apiClient";
import {
  createTransaction,
  listFeeRecords,
  listTransactions,
  type BackendTransactionType,
} from "../services/financeService";
import { listStudents } from "../services/studentService";

type TransactionFilterType = "all" | "fee" | "payment" | "refund";

type TransactionRow = {
  id: string;
  studentId: number;
  studentName: string;
  amount: number;
  type: "fee" | "payment" | "refund";
  date: string;
  description: string;
};

type StudentOption = {
  id: number;
  name: string;
  status: "active" | "pending_archive" | "archived";
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

export function Transactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<TransactionFilterType>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async (): Promise<void> => {
    setRequestError("");

    try {
      const [studentList, transactionList, feeRecords] = await Promise.all([
        listStudents(),
        listTransactions(),
        listFeeRecords({ status: "active" }),
      ]);

      const studentNameById = new Map<number, string>();
      const studentOptions = studentList.map((student) => ({
        id: student.id,
        name: student.full_name,
        status: student.status,
      }));
      studentOptions.forEach((student) => {
        studentNameById.set(student.id, student.name);
      });

      const transactionRows: TransactionRow[] = transactionList.map((tx) => ({
        id: `tx-${tx.id}`,
        studentId: tx.student_id,
        studentName: studentNameById.get(tx.student_id) ?? `Học sinh #${tx.student_id}`,
        amount: parseAmount(tx.amount),
        type: tx.type,
        date: tx.recorded_at,
        description: tx.notes || (tx.type === "payment" ? "Thu tiền học phí" : "Hoàn trả học phí"),
      }));

      const feeRows: TransactionRow[] = feeRecords.map((fee) => ({
        id: `fee-${fee.id}`,
        studentId: fee.student_id,
        studentName: studentNameById.get(fee.student_id) ?? `Học sinh #${fee.student_id}`,
        amount: parseAmount(fee.amount) * -1,
        type: "fee",
        date: fee.created_at,
        description: `Học phí buổi #${fee.session_id}`,
      }));

      const merged = [...transactionRows, ...feeRows].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      setStudents(studentOptions);
      setRows(merged);
    } catch (error) {
      setRequestError(toErrorMessage(error));
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredTransactions = useMemo(
    () => rows.filter((row) => {
      const matchesSearch = row.studentName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === "all" || row.type === filterType;
      return matchesSearch && matchesType;
    }),
    [rows, searchTerm, filterType],
  );

  const totalPayments = useMemo(
    () => rows
      .filter((row) => row.type === "payment")
      .reduce((sum, row) => sum + row.amount, 0),
    [rows],
  );

  const totalFees = useMemo(
    () => rows
      .filter((row) => row.type === "fee")
      .reduce((sum, row) => sum + Math.abs(row.amount), 0),
    [rows],
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900 mb-2">Giao dịch tài chính</h1>
          <p className="text-zinc-600">{filteredTransactions.length} giao dịch</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Ghi nhận giao dịch
        </button>
      </div>

      {requestError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {requestError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-zinc-900" />
            </div>
            <span className="text-zinc-600">Tổng thu</span>
          </div>
          <p className="text-3xl font-semibold text-zinc-900">
            {(totalPayments / 1_000_000).toFixed(1)}M
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-zinc-300" />
            </div>
            <span className="text-zinc-600">Tổng học phí</span>
          </div>
          <p className="text-3xl font-semibold text-zinc-900">
            {(totalFees / 1_000_000).toFixed(1)}M
          </p>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
            <input
              type="text"
              placeholder="Tìm kiếm học sinh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "payment", "fee", "refund"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  filterType === type
                    ? "bg-zinc-700 text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {type === "all" ? "Tất cả" : type === "payment" ? "Thu tiền" : type === "fee" ? "Học phí" : "Hoàn trả"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-100 border-b border-zinc-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Ngày</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Học sinh</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Loại</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Mô tả</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-zinc-600">Số tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredTransactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-zinc-100/50 transition-colors">
                <td className="px-6 py-4 text-zinc-600">
                  {new Date(tx.date).toLocaleDateString("vi-VN")}
                </td>
                <td className="px-6 py-4 text-zinc-900 font-medium">
                  {tx.studentName}
                </td>
                <td className="px-6 py-4">{getTypeBadge(tx.type)}</td>
                <td className="px-6 py-4 text-zinc-600">{tx.description}</td>
                <td className="px-6 py-4 text-right">
                  <span className={`font-semibold ${
                    tx.type === "payment"
                      ? "text-zinc-900"
                      : tx.type === "refund"
                      ? "text-zinc-600"
                      : "text-zinc-600"
                  }`}>
                    {tx.type === "payment" ? "+" : "-"}{(Math.abs(tx.amount) / 1000).toFixed(0)}K
                  </span>
                </td>
              </tr>
            ))}
            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">Không có giao dịch phù hợp.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AddTransactionModal
          students={students}
          submitting={submitting}
          onClose={() => setShowAddModal(false)}
          onSubmit={async (payload) => {
            setSubmitting(true);
            setRequestError("");

            try {
              await createTransaction(payload);
              setShowAddModal(false);
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

function getTypeBadge(type: "payment" | "refund" | "fee") {
  switch (type) {
    case "payment":
      return <span className="px-3 py-1 bg-white text-black rounded-full text-sm">Thu tiền</span>;
    case "refund":
      return <span className="px-3 py-1 bg-zinc-700 text-zinc-300 rounded-full text-sm">Hoàn trả</span>;
    default:
      return <span className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-sm">Học phí</span>;
  }
}

function AddTransactionModal({
  students,
  submitting,
  onClose,
  onSubmit,
}: {
  students: StudentOption[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    student_id: number;
    amount: string;
    type: BackendTransactionType;
    notes: string | null;
    recorded_at: string;
  }) => Promise<void>;
}) {
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<BackendTransactionType>("payment");
  const [notes, setNotes] = useState("");
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().slice(0, 10));
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError("");

    const parsedStudentId = Number(studentId);
    const parsedAmount = Number(amount);

    if (!Number.isInteger(parsedStudentId) || parsedStudentId <= 0) {
      setLocalError("Vui lòng chọn học sinh hợp lệ");
      return;
    }

    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setLocalError("Số tiền phải là số nguyên dương");
      return;
    }

    await onSubmit({
      student_id: parsedStudentId,
      amount: type === "refund" ? String(parsedAmount * -1) : String(parsedAmount),
      type,
      notes: notes.trim() || null,
      recorded_at: `${recordedAt}T00:00:00.000Z`,
    });
  };

  return (
    <div className="fixed inset-0 bg-white/80 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-zinc-900 mb-6">Ghi nhận giao dịch</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm text-zinc-600 mb-2">Học sinh</label>
            <select
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              <option value="">Chọn học sinh</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-600 mb-2">Loại giao dịch</label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as BackendTransactionType)}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              <option value="payment">Thu tiền</option>
              <option value="refund">Hoàn trả</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-600 mb-2">Số tiền (VNĐ)</label>
            <input
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="500000"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-600 mb-2">Mô tả</label>
            <input
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="Nộp học phí tháng 4"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-600 mb-2">Ngày giao dịch</label>
            <input
              type="date"
              value={recordedAt}
              onChange={(event) => setRecordedAt(event.target.value)}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          {localError && <p className="text-sm text-red-600">{localError}</p>}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-900 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors font-medium"
            >
              {submitting ? "Đang ghi nhận..." : "Ghi nhận"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
