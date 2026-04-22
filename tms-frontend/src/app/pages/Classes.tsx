import { useState } from "react";
import { Plus, Edit2, Archive, Users } from "lucide-react";
import { mockClasses, Class } from "../data/mockData";

export function Classes() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

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
          className="flex items-center gap-2 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Tạo lớp mới
        </button>
      </div>

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

                {cls.codeforcesGroupId && (
                  <div className="flex items-center justify-between p-3 bg-zinc-100 rounded-lg">
                    <span className="text-zinc-600 text-sm">CF Group</span>
                    <span className="text-zinc-600 text-sm font-mono">
                      {cls.codeforcesGroupId}
                    </span>
                  </div>
                )}
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

          <div>
            <label className="block text-sm text-zinc-600 mb-2">Codeforces Group ID (tùy chọn)</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="group_123"
            />
          </div>

          <div className="bg-zinc-100 border border-zinc-700 rounded-lg p-4">
            <p className="text-zinc-700 text-sm">
              💡 Lưu ý: Bạn cần tạo Codeforces group thủ công và thêm thành viên theo danh sách lớp
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

          <div>
            <label className="block text-sm text-zinc-600 mb-2">Codeforces Group ID</label>
            <input
              type="text"
              defaultValue={classData.codeforcesGroupId}
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
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
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
