import { useState } from "react";
import { BarChart3, Download, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { mockClasses, mockStudents, mockTransactions } from "../data/mockData";

export function Reports() {
  const [startDate, setStartDate] = useState('2026-04-01');
  const [endDate, setEndDate] = useState('2026-04-30');
  const [selectedClasses, setSelectedClasses] = useState<string[]>(['all']);
  const [includeUnpaid, setIncludeUnpaid] = useState(true);

  const handleClassToggle = (classId: string) => {
    if (classId === 'all') {
      setSelectedClasses(['all']);
    } else {
      const newSelection = selectedClasses.includes('all')
        ? [classId]
        : selectedClasses.includes(classId)
        ? selectedClasses.filter(id => id !== classId)
        : [...selectedClasses, classId];
      setSelectedClasses(newSelection.length === 0 ? ['all'] : newSelection);
    }
  };

  const totalPayments = mockTransactions
    .filter(t => t.type === 'payment')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFees = mockTransactions
    .filter(t => t.type === 'fee')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalRefunds = mockTransactions
    .filter(t => t.type === 'refund')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const unpaidDebt = mockStudents
    .filter(s => s.status === 'active' && s.balance < 0)
    .reduce((sum, s) => sum + Math.abs(s.balance), 0);

  const pendingDebt = mockStudents
    .filter(s => s.status === 'pending_archive' && s.balance < 0)
    .reduce((sum, s) => sum + Math.abs(s.balance), 0);

  const totalUnpaid = unpaidDebt + pendingDebt;

  const netRevenue = totalPayments - totalRefunds;
  const expectedRevenue = includeUnpaid ? netRevenue + totalUnpaid : netRevenue;

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
              onClick={() => handleClassToggle('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedClasses.includes('all')
                  ? 'bg-zinc-700 text-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Tất cả
            </button>
            {mockClasses.map((cls) => (
              <button
                key={cls.id}
                onClick={() => handleClassToggle(cls.id)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedClasses.includes(cls.id) && !selectedClasses.includes('all')
                    ? 'bg-zinc-700 text-zinc-900'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-100'
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
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-zinc-900" />
            </div>
            <span className="text-zinc-600 text-sm">Tổng thu</span>
          </div>
          <p className="text-3xl font-semibold text-zinc-900 mb-1">
            {(totalPayments / 1000000).toFixed(1)}M
          </p>
          <p className="text-sm text-zinc-600">
            Đã thu thực tế
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-zinc-300" />
            </div>
            <span className="text-zinc-600 text-sm">Học phí phát sinh</span>
          </div>
          <p className="text-3xl font-semibold text-zinc-900 mb-1">
            {(totalFees / 1000000).toFixed(1)}M
          </p>
          <p className="text-sm text-zinc-600">
            Tổng học phí tính
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-zinc-600" />
            </div>
            <span className="text-zinc-600 text-sm">Hoàn trả</span>
          </div>
          <p className="text-3xl font-semibold text-zinc-900 mb-1">
            {(totalRefunds / 1000000).toFixed(1)}M
          </p>
          <p className="text-sm text-zinc-600">
            Khoản âm (giảm doanh thu)
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-zinc-600" />
            </div>
            <span className="text-zinc-600 text-sm">Chưa thu</span>
          </div>
          <p className="text-3xl font-semibold text-zinc-900 mb-1">
            {(totalUnpaid / 1000000).toFixed(1)}M
          </p>
          <p className="text-sm text-zinc-600">
            Active + Pending
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-200 rounded-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900 mb-2">Doanh thu ròng</h2>
            <p className="text-zinc-600">
              {includeUnpaid ? 'Bao gồm khoản chưa thu' : 'Chỉ tính khoản đã thu'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/50 border border-zinc-200 rounded-xl p-6">
            <p className="text-zinc-600 text-sm mb-2">Tổng thu thực tế</p>
            <p className="text-2xl font-semibold text-zinc-900">
              +{(totalPayments / 1000000).toFixed(2)}M
            </p>
          </div>

          <div className="bg-white/50 border border-zinc-200 rounded-xl p-6">
            <p className="text-zinc-600 text-sm mb-2">Tổng hoàn trả</p>
            <p className="text-2xl font-semibold text-zinc-300">
              -{(totalRefunds / 1000000).toFixed(2)}M
            </p>
          </div>

          {includeUnpaid && (
            <div className="bg-white/50 border border-zinc-200 rounded-xl p-6">
              <p className="text-zinc-600 text-sm mb-2">Khoản chưa thu</p>
              <p className="text-2xl font-semibold text-zinc-600">
                +{(totalUnpaid / 1000000).toFixed(2)}M
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-600 mb-2">
                {includeUnpaid ? 'Doanh thu dự kiến' : 'Doanh thu thực tế'}
              </p>
              <p className="text-4xl font-bold text-zinc-900">
                {(expectedRevenue / 1000000).toFixed(2)}M VNĐ
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-zinc-600 mb-1">Giai đoạn</p>
              <p className="text-zinc-900 font-medium">
                {new Date(startDate).toLocaleDateString('vi-VN')} - {new Date(endDate).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">Phân tích nợ</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-zinc-100 rounded-lg">
              <span className="text-zinc-600">Nợ học sinh active</span>
              <span className="text-zinc-300 font-semibold">
                {(unpaidDebt / 1000).toFixed(0)}K
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-100 rounded-lg">
              <span className="text-zinc-600">Nợ cần đòi (pending)</span>
              <span className="text-zinc-600 font-semibold">
                {(pendingDebt / 1000).toFixed(0)}K
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-100 rounded-lg border-t border-zinc-200">
              <span className="text-zinc-900 font-medium">Tổng nợ</span>
              <span className="text-zinc-300 font-bold text-lg">
                {(totalUnpaid / 1000).toFixed(0)}K
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">Thống kê lớp</h3>
          <div className="space-y-3">
            {mockClasses.filter(c => c.status === 'active').map((cls) => {
              const classRevenue = cls.feePerSession * cls.studentCount * 12;
              return (
                <div key={cls.id} className="flex items-center justify-between p-3 bg-zinc-100 rounded-lg">
                  <div>
                    <p className="text-zinc-900 font-medium">{cls.name}</p>
                    <p className="text-sm text-zinc-600">{cls.studentCount} học sinh</p>
                  </div>
                  <span className="text-zinc-900 font-semibold">
                    {(classRevenue / 1000000).toFixed(1)}M
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
