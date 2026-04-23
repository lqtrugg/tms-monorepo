import { useState } from "react";
import { Plus, Calendar, Trash2 } from "lucide-react";

interface Session {
  id: string;
  classId: string;
  className: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  isRecurring: boolean;
}

const mockSessions: Session[] = [
  {
    id: '1',
    classId: '1',
    className: 'Lớp Cơ Bản',
    date: '2026-04-25',
    time: '19:00',
    status: 'scheduled',
    isRecurring: true,
  },
  {
    id: '2',
    classId: '1',
    className: 'Lớp Cơ Bản',
    date: '2026-04-27',
    time: '19:00',
    status: 'scheduled',
    isRecurring: true,
  },
  {
    id: '3',
    classId: '2',
    className: 'Lớp Nâng Cao',
    date: '2026-04-26',
    time: '20:00',
    status: 'completed',
    isRecurring: true,
  },
];

export function Sessions() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');

  const filteredSessions = filterStatus === 'all'
    ? mockSessions
    : mockSessions.filter(s => s.status === filterStatus);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <span className="px-3 py-1 bg-zinc-900 text-white rounded-full text-sm">Sắp diễn ra</span>;
      case 'completed':
        return <span className="px-3 py-1 bg-zinc-200 text-zinc-700 rounded-full text-sm">Đã hoàn thành</span>;
      case 'cancelled':
        return <span className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-sm">Đã hủy</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900 mb-2">Buổi học</h1>
          <p className="text-zinc-600">Quản lý các buổi học cụ thể</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-3 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Thêm buổi học
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-6">
        <div className="flex gap-2">
          {(['all', 'scheduled', 'completed', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                filterStatus === status
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {status === 'all' ? 'Tất cả' : status === 'scheduled' ? 'Sắp diễn ra' : status === 'completed' ? 'Đã hoàn thành' : 'Đã hủy'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSessions.map((session) => (
          <div key={session.id} className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-zinc-600" />
                <div>
                  <h3 className="font-semibold text-zinc-900">{session.className}</h3>
                  {session.isRecurring && (
                    <span className="text-xs text-zinc-500">Auto-generated</span>
                  )}
                </div>
              </div>
              {getStatusBadge(session.status)}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-600">Ngày</span>
                <span className="text-zinc-900 font-medium">
                  {new Date(session.date).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-600">Giờ</span>
                <span className="text-zinc-900 font-medium">{session.time}</span>
              </div>
            </div>

            {session.status === 'scheduled' && (
              <button className="w-full px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 text-sm">
                <Trash2 className="w-4 h-4" />
                Hủy buổi học
              </button>
            )}
          </div>
        ))}
      </div>

      {filteredSessions.length === 0 && (
        <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center">
          <p className="text-zinc-600">Không có buổi học nào</p>
        </div>
      )}

      {showAddModal && (
        <AddSessionModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

function AddSessionModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-zinc-200 rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-semibold text-zinc-900 mb-6">Thêm buổi học</h2>
        <form className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-700 mb-2">Lớp</label>
            <select className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400">
              <option value="">Chọn lớp</option>
              <option value="1">Lớp Cơ Bản</option>
              <option value="2">Lớp Nâng Cao</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-700 mb-2">Ngày</label>
            <input
              type="date"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-700 mb-2">Giờ</label>
            <input
              type="time"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
            <p className="text-sm text-zinc-700">
              💡 Buổi học ngoài lịch recurring. Học phí sẽ được tính bình thường.
            </p>
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
              className="flex-1 px-4 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors font-medium"
            >
              Thêm buổi học
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
