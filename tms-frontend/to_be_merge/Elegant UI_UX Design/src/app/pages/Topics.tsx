import { useState } from "react";
import { Plus, ExternalLink, Clock, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router";
import { mockTopics, mockClasses } from "../data/mockData";

export function Topics() {
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  const filteredTopics = selectedClassId === 'all'
    ? mockTopics
    : mockTopics.filter(t => t.classId === selectedClassId);

  const activeTopics = filteredTopics.filter(t => t.status === 'active');
  const expiredTopics = filteredTopics.filter(t => t.status === 'expired');

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900 mb-2">Chuyên đề</h1>
          <p className="text-zinc-600">Quản lý chuyên đề và theo dõi tiến độ</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-3 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Thêm chuyên đề
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-6 shadow-sm">
        <label className="block text-sm text-zinc-700 mb-2">Lọc theo lớp</label>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        >
          <option value="all">Tất cả lớp</option>
          {mockClasses.filter(c => c.status === 'active').map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Chuyên đề đang mở</h2>
        {activeTopics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeTopics.map((topic) => {
              const className = mockClasses.find(c => c.id === topic.classId)?.name;
              const deadline = new Date(topic.deadline);
              const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

              return (
                <div key={topic.id} className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-zinc-900 mb-1">{topic.name}</h3>
                      <p className="text-sm text-zinc-600">{className}</p>
                    </div>
                    <span className="px-3 py-1 bg-zinc-900 text-white rounded-full text-sm whitespace-nowrap ml-3">
                      Đang mở
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-zinc-600" />
                      <span className="text-zinc-700">
                        Còn {daysLeft} ngày
                      </span>
                      <span className="text-zinc-400">•</span>
                      <span className="text-zinc-600">
                        {deadline.toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    <a
                      href={topic.gymLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-zinc-700 hover:text-zinc-900 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Xem trên Codeforces
                    </a>

                    <button
                      onClick={() => navigate(`/topics/${topic.id}/standing`)}
                      className="flex items-center gap-2 text-sm text-zinc-700 hover:text-zinc-900 transition-colors"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Xem standing
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center shadow-sm">
            <p className="text-zinc-600">Chưa có chuyên đề nào đang mở</p>
          </div>
        )}
      </div>

      {expiredTopics.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Chuyên đề đã hết hạn</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {expiredTopics.map((topic) => {
              const className = mockClasses.find(c => c.id === topic.classId)?.name;
              return (
                <div key={topic.id} className="bg-white border border-zinc-200 rounded-xl p-6 opacity-60 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 mb-1">{topic.name}</h3>
                      <p className="text-sm text-zinc-600">{className}</p>
                    </div>
                    <span className="px-3 py-1 bg-zinc-200 text-zinc-600 rounded-full text-sm">
                      Đã hết hạn
                    </span>
                  </div>
                  <div className="space-y-2">
                    <a
                      href={topic.gymLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-zinc-700 hover:text-zinc-900 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Xem trên Codeforces
                    </a>
                    <button
                      onClick={() => navigate(`/topics/${topic.id}/standing`)}
                      className="flex items-center gap-2 text-sm text-zinc-700 hover:text-zinc-900 transition-colors"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Xem standing
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showAddModal && (
        <AddTopicModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

function AddTopicModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-zinc-200 rounded-xl p-6 w-full max-w-md shadow-lg">
        <h2 className="text-xl font-semibold text-zinc-900 mb-6">Thêm chuyên đề</h2>
        <form className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-700 mb-2">Lớp</label>
            <select className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400">
              <option value="">Chọn lớp</option>
              {mockClasses.filter(c => c.status === 'active').map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-700 mb-2">Link GYM Contest</label>
            <input
              type="url"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="https://codeforces.com/gym/123456"
            />
          </div>

          <div className="bg-zinc-100 border border-zinc-200 rounded-lg p-4">
            <p className="text-zinc-700 text-sm">
              💡 Hệ thống sẽ tự động lấy tên chuyên đề và thời gian hết hạn từ Codeforces API
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
              Thêm chuyên đề
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
