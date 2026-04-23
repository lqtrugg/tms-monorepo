import { useState } from "react";
import { Plus, Search, UserPlus, UserX, ArrowRightLeft, Eye, AlertCircle, DollarSign, CheckCircle } from "lucide-react";
import { mockStudents, mockClasses, Student } from "../data/mockData";

export function Students() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending_archive' | 'archived'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  const filteredStudents = mockStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || student.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const pendingStudents = mockStudents.filter(s => s.status === 'pending_archive');
  const needCollect = pendingStudents.filter(s => s.balance < 0);
  const needRefund = pendingStudents.filter(s => s.balance > 0);

  const getStatusBadge = (status: Student['status']) => {
    switch (status) {
      case 'active':
        return <span className="px-3 py-1 bg-zinc-900 text-white rounded-full text-sm">Đang học</span>;
      case 'pending_archive':
        return <span className="px-3 py-1 bg-zinc-300 text-zinc-700 rounded-full text-sm">Chờ xử lý</span>;
      case 'archived':
        return <span className="px-3 py-1 bg-zinc-200 text-zinc-600 rounded-full text-sm">Đã lưu trữ</span>;
    }
  };

  const getBalanceColor = (balance: number) => {
    if (balance < 0) return 'text-zinc-700';
    if (balance > 0) return 'text-zinc-600';
    return 'text-zinc-500';
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
            {(['all', 'active', 'pending_archive', 'archived'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-zinc-200 text-zinc-900'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {status === 'all' ? 'Tất cả' : status === 'active' ? 'Đang học' : status === 'pending_archive' ? 'Chờ xử lý' : 'Đã lưu'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filterStatus === 'pending_archive' ? (
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
                  {(needCollect.reduce((sum, s) => sum + Math.abs(s.balance), 0) / 1000).toFixed(0)}K
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
                  {(needRefund.reduce((sum, s) => sum + s.balance, 0) / 1000).toFixed(0)}K
                </span>
              </div>
            </div>
          </div>

          {needCollect.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Cần đòi nợ</h2>
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-zinc-100 border-b border-zinc-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Học sinh</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Lớp cũ</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Số nợ</th>
                      <th className="px-6 py-4 text-right text-sm font-medium text-zinc-600">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {needCollect.map((student) => {
                      const className = mockClasses.find(c => c.id === student.classId)?.name;
                      return (
                        <tr key={student.id} className="hover:bg-zinc-100/50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-zinc-900 font-medium">{student.name}</p>
                              <p className="text-sm text-zinc-600">{student.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-zinc-700">{className}</td>
                          <td className="px-6 py-4">
                            <span className="text-zinc-900 font-semibold">
                              {(Math.abs(student.balance) / 1000).toFixed(0)}K
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors">
                                Đã thu đủ nợ
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
          )}

          {needRefund.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Cần hoàn trả</h2>
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-zinc-100 border-b border-zinc-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Học sinh</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Lớp cũ</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Số dư</th>
                      <th className="px-6 py-4 text-right text-sm font-medium text-zinc-600">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {needRefund.map((student) => {
                      const className = mockClasses.find(c => c.id === student.classId)?.name;
                      return (
                        <tr key={student.id} className="hover:bg-zinc-100/50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-zinc-900 font-medium">{student.name}</p>
                              <p className="text-sm text-zinc-600">{student.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-zinc-700">{className}</td>
                          <td className="px-6 py-4">
                            <span className="text-zinc-600 font-semibold">
                              {(student.balance / 1000).toFixed(0)}K
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors">
                                Đã hoàn trả
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
              {filteredStudents.map((student) => {
                const className = mockClasses.find(c => c.id === student.classId)?.name || 'N/A';
                return (
                  <tr key={student.id} className="hover:bg-zinc-200/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-zinc-900 font-medium">{student.name}</p>
                        <p className="text-sm text-zinc-600">{student.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-700">{className}</td>
                    <td className="px-6 py-4">{getStatusBadge(student.status)}</td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${getBalanceColor(student.balance)}`}>
                        {student.balance < 0 ? '-' : student.balance > 0 ? '+' : ''}{(Math.abs(student.balance) / 1000).toFixed(0)}K
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
                        {student.status === 'active' && (
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <AddStudentModal onClose={() => setShowAddModal(false)} />
      )}

      {showTransferModal && selectedStudent && (
        <TransferClassModal
          student={selectedStudent}
          onClose={() => {
            setShowTransferModal(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {showArchiveModal && selectedStudent && (
        <ArchiveStudentModal
          student={selectedStudent}
          onClose={() => {
            setShowArchiveModal(false);
            setSelectedStudent(null);
          }}
        />
      )}
    </div>
  );
}

function AddStudentModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-white/80 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-zinc-900 mb-6">Thêm học sinh mới</h2>
        <form className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-600 mb-2">Họ tên</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="Nguyễn Văn A"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-600 mb-2">Email</label>
            <input
              type="email"
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-600 mb-2">Lớp</label>
            <select className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400">
              <option value="">Chọn lớp</option>
              {mockClasses.filter(c => c.status === 'active').map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-zinc-600 mb-2">Codeforces Handle (tùy chọn)</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="username"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-900 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors font-medium"
            >
              Thêm học sinh
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TransferClassModal({ student, onClose }: { student: Student; onClose: () => void }) {
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

        <form className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-600 mb-2">Lớp mới</label>
            <select className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400">
              <option value="">Chọn lớp</option>
              {mockClasses.filter(c => c.status === 'active' && c.id !== student.classId).map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-900 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors font-medium"
            >
              Chuyển lớp
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ArchiveStudentModal({ student, onClose }: { student: Student; onClose: () => void }) {
  const action = student.balance < 0 ? 'collect' : student.balance > 0 ? 'refund' : 'archive';

  return (
    <div className="fixed inset-0 bg-white/80 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Đuổi học</h2>
        <p className="text-zinc-600 mb-6">Học sinh: {student.name}</p>

        <div className="bg-zinc-100 border border-zinc-700 rounded-lg p-4 mb-6">
          {action === 'collect' && (
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
          {action === 'refund' && (
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
          {action === 'archive' && (
            <>
              <p className="text-zinc-700 font-semibold mb-2">Không nợ, không dư</p>
              <p className="text-zinc-600 text-sm">
                Học sinh sẽ được lưu trữ ngay lập tức
              </p>
            </>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-900 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-3 bg-zinc-200 text-zinc-900 rounded-lg hover:bg-zinc-600 transition-colors font-medium"
          >
            Xác nhận đuổi học
          </button>
        </div>
      </div>
    </div>
  );
}
