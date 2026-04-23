import { useState } from "react";
import { Plus, Search, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { mockTransactions, mockStudents } from "../data/mockData";

export function Transactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'fee' | 'payment' | 'refund'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredTransactions = mockTransactions.filter(tx => {
    const student = mockStudents.find(s => s.id === tx.studentId);
    const matchesSearch = student?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || tx.type === filterType;
    return matchesSearch && matchesType;
  });

  const totalPayments = mockTransactions
    .filter(t => t.type === 'payment')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFees = mockTransactions
    .filter(t => t.type === 'fee')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <TrendingUp className="w-5 h-5 text-zinc-900" />;
      case 'refund':
        return <TrendingDown className="w-5 h-5 text-zinc-600" />;
      default:
        return <DollarSign className="w-5 h-5 text-zinc-600" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'payment':
        return <span className="px-3 py-1 bg-white text-black rounded-full text-sm">Thu tiền</span>;
      case 'refund':
        return <span className="px-3 py-1 bg-zinc-700 text-zinc-300 rounded-full text-sm">Hoàn trả</span>;
      default:
        return <span className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-sm">Học phí</span>;
    }
  };

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
          Ghi nhận thu tiền
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-zinc-900" />
            </div>
            <span className="text-zinc-600">Tổng thu</span>
          </div>
          <p className="text-3xl font-semibold text-zinc-900">
            {(totalPayments / 1000000).toFixed(1)}M
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
            {(totalFees / 1000000).toFixed(1)}M
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
            {(['all', 'payment', 'fee', 'refund'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  filterType === type
                    ? 'bg-zinc-700 text-zinc-900'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {type === 'all' ? 'Tất cả' : type === 'payment' ? 'Thu tiền' : type === 'fee' ? 'Học phí' : 'Hoàn trả'}
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
            {filteredTransactions.map((tx) => {
              const student = mockStudents.find(s => s.id === tx.studentId);
              return (
                <tr key={tx.id} className="hover:bg-zinc-100/50 transition-colors">
                  <td className="px-6 py-4 text-zinc-600">
                    {new Date(tx.date).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-6 py-4 text-zinc-900 font-medium">
                    {student?.name}
                  </td>
                  <td className="px-6 py-4">{getTypeBadge(tx.type)}</td>
                  <td className="px-6 py-4 text-zinc-600">{tx.description}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-semibold ${
                      tx.type === 'payment'
                        ? 'text-zinc-900'
                        : tx.type === 'refund'
                        ? 'text-zinc-600'
                        : 'text-zinc-600'
                    }`}>
                      {tx.type === 'payment' ? '+' : '-'}{(Math.abs(tx.amount) / 1000).toFixed(0)}K
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AddTransactionModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

function AddTransactionModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-white/80 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-zinc-900 mb-6">Ghi nhận thu tiền</h2>
        <form className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-600 mb-2">Học sinh</label>
            <select className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400">
              <option value="">Chọn học sinh</option>
              {mockStudents.filter(s => s.status === 'active').map(student => (
                <option key={student.id} value={student.id}>{student.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-600 mb-2">Số tiền (VNĐ)</label>
            <input
              type="number"
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="500000"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-600 mb-2">Mô tả</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="Nộp học phí tháng 4"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-600 mb-2">Ngày giao dịch</label>
            <input
              type="date"
              defaultValue={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-900 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors font-medium"
            >
              Ghi nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
