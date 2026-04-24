import { useState } from "react";
import { Plus, ExternalLink } from "lucide-react";
import { mockTopics, mockClasses } from "../data/mockData";

export function Codeforces() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  const filteredTopics = selectedClassId === 'all'
    ? mockTopics
    : mockTopics.filter(t => t.classId === selectedClassId);

  const activeTopics = filteredTopics.filter(t => t.status === 'active');
  const closedTopics = filteredTopics.filter(t => t.status === 'closed');

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900 mb-2">Codeforces</h1>
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

      <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-6">
        <label className="block text-sm text-zinc-600 mb-2">Lọc theo lớp</label>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="px-4 py-3 bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
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

              return (
                <div key={topic.id} className="bg-white border border-zinc-200 rounded-xl p-6 hover:border-zinc-700 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 mb-1">{topic.name}</h3>
                      <p className="text-sm text-zinc-600">{className}</p>
                    </div>
                    <span className="px-3 py-1 bg-white text-black rounded-full text-sm">
                      Đang mở
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <a
                      href={topic.gymLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Xem trên Codeforces
                    </a>
                  </div>

                  <div className="bg-zinc-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-zinc-600">Tiến độ học sinh</span>
                      <button className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
                        Xem chi tiết
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-600">Hoàn thành</span>
                        <span className="text-zinc-900 font-semibold">3/8 HS</span>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-2">
                        <div className="bg-white h-2 rounded-full" style={{ width: '37.5%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center">
            <p className="text-zinc-600">Chưa có chuyên đề nào đang mở</p>
          </div>
        )}
      </div>

      {closedTopics.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Chuyên đề đã đóng</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {closedTopics.map((topic) => {
              const className = mockClasses.find(c => c.id === topic.classId)?.name;
              return (
                <div key={topic.id} className="bg-white border border-zinc-200 rounded-xl p-6 opacity-60">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 mb-1">{topic.name}</h3>
                      <p className="text-sm text-zinc-600">{className}</p>
                    </div>
                    <span className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-sm">
                      Đã đóng
                    </span>
                  </div>
                  <a
                    href={topic.gymLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Xem trên Codeforces
                  </a>
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
    <div className="fixed inset-0 bg-white/80 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-6 w-full max-w-md">
        <form className="space-y-4">
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
            <label className="block text-sm text-zinc-600 mb-2">Tên chuyên đề</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="Graph Theory Basics"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-600 mb-2">Link Codeforces GYM</label>
            <input
              type="url"
              className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="https://codeforces.com/gym/123456"
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
              Thêm chuyên đề
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
