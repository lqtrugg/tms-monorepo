import { useState } from "react";
import { Plus, Edit2, Calendar } from "lucide-react";

interface Schedule {
  id: string;
  classId: string;
  className: string;
  schedule: string;
  isActive: boolean;
}

const mockSchedules: Schedule[] = [
  {
    id: '1',
    classId: '1',
    className: 'Lớp Cơ Bản',
    schedule: 'Thứ 3, 5, 7 - 19:00',
    isActive: true,
  },
  {
    id: '2',
    classId: '2',
    className: 'Lớp Nâng Cao',
    schedule: 'Thứ 2, 4, 6 - 20:00',
    isActive: true,
  },
];

export function Schedules() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900 mb-2">Lịch học</h1>
          <p className="text-zinc-600">Quản lý lịch học recurring cho từng lớp</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-3 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Thêm lịch học
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockSchedules.map((schedule) => (
          <div key={schedule.id} className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-zinc-900" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">{schedule.className}</h3>
                  {schedule.isActive && (
                    <span className="text-xs text-zinc-600">Đang hoạt động</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedSchedule(schedule);
                  setShowEditModal(true);
                }}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4 text-zinc-600" />
              </button>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
              <p className="text-sm text-zinc-600 mb-1">Lịch học recurring</p>
              <p className="text-zinc-900 font-medium">{schedule.schedule}</p>
            </div>

            <div className="mt-4 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
              <p className="text-xs text-zinc-600">
                💡 Buổi học sẽ tự động tạo theo lịch này. Bạn có thể thêm buổi ngoài lịch tại trang Buổi học.
              </p>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <AddScheduleModal onClose={() => setShowAddModal(false)} />
      )}

      {showEditModal && selectedSchedule && (
        <EditScheduleModal
          schedule={selectedSchedule}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSchedule(null);
          }}
        />
      )}
    </div>
  );
}

function AddScheduleModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-zinc-200 rounded-xl p-6 w-full max-w-md shadow-xl">
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
            <label className="block text-sm text-zinc-700 mb-2">Lịch học recurring</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="Thứ 3, 5, 7 - 19:00"
            />
            <p className="text-xs text-zinc-600 mt-2">
              Ví dụ: "Thứ 2, 4, 6 - 20:00" hoặc "Chủ nhật - 14:00"
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
              Thêm lịch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditScheduleModal({ schedule, onClose }: { schedule: Schedule; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-zinc-200 rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-semibold text-zinc-900 mb-6">Chỉnh sửa lịch học</h2>
        <form className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-700 mb-2">Lớp</label>
            <input
              type="text"
              value={schedule.className}
              disabled
              className="w-full px-4 py-3 bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-700 mb-2">Lịch học recurring</label>
            <input
              type="text"
              defaultValue={schedule.schedule}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
            <p className="text-sm text-zinc-700">
              ⚠️ Thay đổi lịch sẽ áp dụng cho các buổi học trong tương lai
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
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
