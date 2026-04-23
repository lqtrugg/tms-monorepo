import { type ReactNode, useEffect, useMemo, useState } from "react";
import { BarChart3, Download, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

import { ApiError } from "../services/apiClient";
import { listClasses } from "../services/classService";
import { listStudentBalances } from "../services/financeService";
import { getIncomeReport } from "../services/reportingService";
import { listStudents } from "../services/studentService";

type ClassOption = {
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

export function Reports() {
  const [startDate, setStartDate] = useState("2026-04-01");
  const [endDate, setEndDate] = useState("2026-04-30");
  const [selectedClasses, setSelectedClasses] = useState<string[]>(["all"]);
  const [includeUnpaid, setIncludeUnpaid] = useState(true);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [requestError, setRequestError] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalPayments: 0,
    totalFees: 0,
    totalRefunds: 0,
    totalUnpaid: 0,
    netRevenue: 0,
    expectedRevenue: 0,
  });
  const [classStats, setClassStats] = useState<Array<{
    class_id: number;
    class_name: string;
    student_count: number;
    fee_per_session: number;
  }>>([]);
  const [debtBreakdown, setDebtBreakdown] = useState({
    unpaidDebt: 0,
    pendingDebt: 0,
  });

  const selectedClassIds = useMemo(
    () => selectedClasses.includes("all") ? [] : selectedClasses.map((id) => Number(id)),
    [selectedClasses],
  );

  const handleClassToggle = (classId: string) => {
    if (classId === "all") {
      setSelectedClasses(["all"]);
    } else {
      const newSelection = selectedClasses.includes("all")
        ? [classId]
        : selectedClasses.includes(classId)
        ? selectedClasses.filter((id) => id !== classId)
        : [...selectedClasses, classId];
      setSelectedClasses(newSelection.length === 0 ? ["all"] : newSelection);
    }
  };

  useEffect(() => {
    const loadClassOptions = async () => {
      try {
        const classes = await listClasses();
        setClassOptions(classes.map((item) => ({ id: item.id, name: item.name })));
      } catch (error) {
        setRequestError(toErrorMessage(error));
      }
    };

    void loadClassOptions();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    setRequestError("");

    try {
      const [incomeReport, balances, students] = await Promise.all([
        getIncomeReport({
          from: `${startDate}T00:00:00.000Z`,
          to: `${endDate}T23:59:59.999Z`,
          class_ids: selectedClassIds.length > 0 ? selectedClassIds : undefined,
          include_unpaid: includeUnpaid,
        }),
        listStudentBalances({ include_pending_archive: true }),
        listStudents(),
      ]);

      const studentsById = new Map(students.map((student) => [student.id, student]));
      const selectedClassIdSet = selectedClassIds.length > 0 ? new Set(selectedClassIds) : null;

      const scopedBalances = selectedClassIdSet
        ? balances.filter((balance) => {
          const student = studentsById.get(balance.student_id);
          return student?.current_class_id !== null && selectedClassIdSet.has(student.current_class_id);
        })
        : balances;

      const unpaidDebt = scopedBalances
        .filter((item) => item.status === "active" && parseAmount(item.balance) < 0)
        .reduce((sum, item) => sum + Math.abs(parseAmount(item.balance)), 0);

      const pendingDebt = scopedBalances
        .filter((item) => item.status === "pending_archive" && parseAmount(item.balance) < 0)
        .reduce((sum, item) => sum + Math.abs(parseAmount(item.balance)), 0);

      setDebtBreakdown({ unpaidDebt, pendingDebt });
      setClassStats(incomeReport.class_stats.map((row) => ({
        class_id: row.class_id,
        class_name: row.class_name,
        student_count: row.student_count,
        fee_per_session: parseAmount(row.fee_per_session),
      })));
      setSummary({
        totalPayments: parseAmount(incomeReport.summary.total_payments),
        totalFees: parseAmount(incomeReport.summary.total_active_fees),
        totalRefunds: parseAmount(incomeReport.summary.total_refunds),
        totalUnpaid: parseAmount(incomeReport.summary.unpaid_total),
        netRevenue: parseAmount(incomeReport.summary.net_revenue),
        expectedRevenue: parseAmount(incomeReport.summary.projected_revenue),
      });
    } catch (error) {
      setRequestError(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, [startDate, endDate, includeUnpaid, selectedClasses.join(",")]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900 mb-2">Báo cáo thống kê</h1>
          <p className="text-zinc-600">Phân tích doanh thu và hiệu suất</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors">
          <Download className="w-5 h-5" />
          Xuất báo cáo
        </button>
      </div>

      {requestError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {requestError}
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Tùy chọn lọc</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm text-zinc-600 mb-2">Từ ngày</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-600 mb-2">Đến ngày</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm text-zinc-600 mb-3">Lớp học</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleClassToggle("all")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedClasses.includes("all")
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Tất cả
            </button>
            {classOptions.map((cls) => (
              <button
                key={cls.id}
                onClick={() => handleClassToggle(String(cls.id))}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedClasses.includes(String(cls.id)) && !selectedClasses.includes("all")
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {cls.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeUnpaid}
              onChange={(e) => setIncludeUnpaid(e.target.checked)}
              className="w-5 h-5 bg-zinc-100 border-2 border-zinc-700 rounded checked:bg-white checked:border-white"
            />
            <span className="text-zinc-900">Bao gồm khoản chưa thu</span>
          </label>
          <p className="text-sm text-zinc-600 mt-2 ml-8">
            Khoản chưa thu bao gồm nợ của học sinh active và pending_archive (cần đòi)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SummaryCard icon={<TrendingUp className="w-5 h-5 text-zinc-900" />} label="Tổng thu" value={`${(summary.totalPayments / 1_000_000).toFixed(1)}M`} description="Đã thu thực tế" />
        <SummaryCard icon={<DollarSign className="w-5 h-5 text-zinc-700" />} label="Học phí phát sinh" value={`${(summary.totalFees / 1_000_000).toFixed(1)}M`} description="Tổng học phí tính" />
        <SummaryCard icon={<TrendingDown className="w-5 h-5 text-zinc-600" />} label="Hoàn trả" value={`${(summary.totalRefunds / 1_000_000).toFixed(1)}M`} description="Khoản âm (giảm doanh thu)" />
        <SummaryCard icon={<BarChart3 className="w-5 h-5 text-zinc-600" />} label="Chưa thu" value={`${(summary.totalUnpaid / 1_000_000).toFixed(1)}M`} description="Active + Pending" />
      </div>

      <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-200 rounded-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-2">Doanh thu ròng</h2>
            <p className="text-zinc-600">
              {includeUnpaid ? "Bao gồm khoản chưa thu" : "Chỉ tính khoản đã thu"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <RevenueChip label="Tổng thu thực tế" value={`+${(summary.totalPayments / 1_000_000).toFixed(2)}M`} />
          <RevenueChip label="Tổng hoàn trả" value={`-${(summary.totalRefunds / 1_000_000).toFixed(2)}M`} />
          {includeUnpaid && <RevenueChip label="Khoản chưa thu" value={`+${(summary.totalUnpaid / 1_000_000).toFixed(2)}M`} />}
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-600 mb-2">
                {includeUnpaid ? "Doanh thu dự kiến" : "Doanh thu thực tế"}
              </p>
              <p className="text-4xl font-bold text-zinc-900">
                {((includeUnpaid ? summary.expectedRevenue : summary.netRevenue) / 1_000_000).toFixed(2)}M VNĐ
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-zinc-600 mb-1">Giai đoạn</p>
              <p className="text-zinc-900 font-medium">
                {new Date(startDate).toLocaleDateString("vi-VN")} - {new Date(endDate).toLocaleDateString("vi-VN")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <p className="mt-6 text-sm text-zinc-500">Đang cập nhật báo cáo...</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">Phân tích nợ</h3>
          <div className="space-y-3">
            <DebtRow label="Nợ học sinh active" value={`${(debtBreakdown.unpaidDebt / 1000).toFixed(0)}K`} />
            <DebtRow label="Nợ cần đòi (pending)" value={`${(debtBreakdown.pendingDebt / 1000).toFixed(0)}K`} />
            <DebtRow
              label="Tổng nợ"
              value={`${((debtBreakdown.unpaidDebt + debtBreakdown.pendingDebt) / 1000).toFixed(0)}K`}
              strong
            />
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">Thống kê lớp</h3>
          <div className="space-y-3">
            {classStats.map((cls) => {
              const classRevenue = cls.fee_per_session * cls.student_count * 12;
              return (
                <div key={cls.class_id} className="flex items-center justify-between p-3 bg-zinc-100 rounded-lg">
                  <div>
                    <p className="text-zinc-900 font-medium">{cls.class_name}</p>
                    <p className="text-sm text-zinc-600">{cls.student_count} học sinh</p>
                  </div>
                  <span className="text-zinc-900 font-semibold">
                    {(classRevenue / 1_000_000).toFixed(1)}M
                  </span>
                </div>
              );
            })}
            {classStats.length === 0 && (
              <p className="text-sm text-zinc-500">Không có dữ liệu lớp học.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  description,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">{icon}</div>
        <span className="text-zinc-600 text-sm">{label}</span>
      </div>
      <p className="text-3xl font-semibold text-zinc-900 mb-1">{value}</p>
      <p className="text-sm text-zinc-600">{description}</p>
    </div>
  );
}

function RevenueChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/50 border border-zinc-200 rounded-xl p-6">
      <p className="text-zinc-600 text-sm mb-2">{label}</p>
      <p className="text-2xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

function DebtRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${strong ? "bg-zinc-100 border-t border-zinc-200" : "bg-zinc-100"}`}>
      <span className={strong ? "text-zinc-900 font-medium" : "text-zinc-600"}>{label}</span>
      <span className={strong ? "text-zinc-700 font-bold text-lg" : "text-zinc-700 font-semibold"}>{value}</span>
    </div>
  );
}
