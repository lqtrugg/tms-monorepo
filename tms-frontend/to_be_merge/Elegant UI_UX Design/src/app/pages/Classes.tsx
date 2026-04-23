import { useState } from "react";
import { Plus, Edit2, Archive, Users, Calendar } from "lucide-react";
import { mockClasses, Class } from "../data/mockData";

export function Classes() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditScheduleModal, setShowEditScheduleModal] = useState(false);
  const [viewMode, setViewMode] = useState<'classes' | 'schedules'>('classes');

  const activeClasses = mockClasses.filter(c => c.status === 'active');
  const archivedClasses = mockClasses.filter(c => c.status === 'archived');

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
            onClick={() => setViewMode('classes')}
            className={`px-4 py-3 rounded-lg font-medium transition-colors ${
              viewMode === 'classes'
                ? 'bg-zinc-200 text-zinc-900'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Lớp học
          </button>
          <button
            onClick={() => setViewMode('schedules')}
            className={`px-4 py-3 rounded-lg font-medium transition-colors ${
              viewMode === 'schedules'
                ? 'bg-zinc-200 text-zinc-900'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Lịch học
          </button>
        </div>
      </div>

      {viewMode === 'classes' ? (
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

                  <button className="w-full mt-4 px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2">
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
        <AddClassModal onClose={() => setShowAddModal(false)} />
      )}

      {showEditModal && selectedClass && (
        <EditClassModal
          classData={selectedClass}
          onClose={() => {
            setShowEditModal(false);
            setSelectedClass(null);
          }}
        />
      )}

      {showEditScheduleModal && selectedClass && (
        <EditScheduleModal
          classData={selectedClass}
          onClose={() => {
            setShowEditScheduleModal(false);
            setSelectedClass(null);
          }}
        />
      )}
    </div>
  );
}

function AddClassModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-white/80 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-zinc-900 mb-6">Tạo lớp mới</h2>
        <form className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-600 mb-2">Tên lớp</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="Lớp Cơ Bản"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-600 mb-2">Lịch học</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="Thứ 3, 5, 7 - 19:00"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-600 mb-2">Học phí/buổi (VNĐ)</label>
            <input
              type="number"
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="150000"
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
              Tạo lớp
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditClassModal({ classData, onClose }: { classData: Class; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-white/80 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-zinc-900 mb-6">Chỉnh sửa lớp</h2>
        <form className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-600 mb-2">Tên lớp</label>
            <input
              type="text"
              defaultValue={classData.name}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-600 mb-2">Lịch học</label>
            <input
              type="text"
              defaultValue={classData.schedule}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-600 mb-2">Học phí/buổi (VNĐ)</label>
            <input
              type="number"
              defaultValue={classData.feePerSession}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
            <p className="text-xs text-zinc-600 mt-2">
              ⚠️ Thay đổi chỉ áp dụng từ buổi tiếp theo
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

function EditScheduleModal({ classData, onClose }: { classData: Class; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-zinc-200 rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-semibold text-zinc-900 mb-6">Chỉnh sửa lịch học</h2>
        <form className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-700 mb-2">Lớp</label>
            <input
              type="text"
              value={classData.name}
              disabled
              className="w-full px-4 py-3 bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-700 mb-2">Lịch học recurring</label>
            <input
              type="text"
              defaultValue={classData.schedule}
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
