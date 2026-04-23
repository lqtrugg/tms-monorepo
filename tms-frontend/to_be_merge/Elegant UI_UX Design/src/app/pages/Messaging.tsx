import { useState } from "react";
import { Plus, Server, Hash, Users, Settings, Eye, Send } from "lucide-react";

interface DiscordServer {
  id: string;
  name: string;
  serverId: string;
  channelCount: number;
  memberCount: number;
  voiceChannelId?: string;
  textChannelId?: string;
}

interface Message {
  id: string;
  content: string;
  recipient: string;
  type: 'auto' | 'channel' | 'bulk_dm';
  timestamp: string;
  status: 'sent' | 'pending' | 'failed';
  successCount?: number;
  failCount?: number;
  totalRecipients?: number;
}

const mockServers: DiscordServer[] = [
  {
    id: '1',
    name: 'CP Training - Lớp Cơ Bản',
    serverId: '123456789',
    channelCount: 5,
    memberCount: 8,
    voiceChannelId: 'voice-123',
    textChannelId: 'text-456',
  },
  {
    id: '2',
    name: 'CP Training - Lớp Nâng Cao',
    serverId: '987654321',
    channelCount: 6,
    memberCount: 6,
  },
];

const mockMessages: Message[] = [
  {
    id: '1',
    content: 'Nhắc nhở: Nộp học phí tháng 4',
    recipient: 'Lớp Cơ Bản',
    type: 'auto',
    timestamp: '2026-04-22T10:30:00',
    status: 'sent',
  },
  {
    id: '2',
    content: 'Thông báo: Buổi học ngày mai chuyển sang 20:00',
    recipient: 'Lớp Cơ Bản',
    type: 'channel',
    timestamp: '2026-04-21T15:00:00',
    status: 'sent',
  },
  {
    id: '3',
    content: 'Chúc mừng các em đã hoàn thành chuyên đề Graph Theory',
    recipient: '8 học sinh',
    type: 'bulk_dm',
    timestamp: '2026-04-20T14:00:00',
    status: 'sent',
    successCount: 7,
    failCount: 1,
    totalRecipients: 8,
  },
];

export function Messaging() {
  const [selectedTab, setSelectedTab] = useState<'servers' | 'messages'>('servers');
  const [showAddServerModal, setShowAddServerModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showChannelsModal, setShowChannelsModal] = useState(false);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [selectedServer, setSelectedServer] = useState<DiscordServer | null>(null);
  const [messageFilter, setMessageFilter] = useState<'all' | 'auto' | 'channel' | 'bulk_dm'>('all');

  const filteredMessages = messageFilter === 'all'
    ? mockMessages
    : mockMessages.filter(m => m.type === messageFilter);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900 mb-2">Tin nhắn</h1>
          <p className="text-zinc-600">Quản lý Discord servers và tin nhắn tự động</p>
        </div>
        <button
          onClick={() => setShowSendMessageModal(true)}
          className="flex items-center gap-2 px-4 py-3 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors"
        >
          <Send className="w-5 h-5" />
          Gửi tin nhắn
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl mb-6">
        <div className="flex border-b border-zinc-200">
          <button
            onClick={() => setSelectedTab('servers')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              selectedTab === 'servers'
                ? 'text-zinc-900 border-b-2 border-zinc-900'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Discord Servers
          </button>
          <button
            onClick={() => setSelectedTab('messages')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              selectedTab === 'messages'
                ? 'text-zinc-900 border-b-2 border-zinc-900'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Lịch sử tin nhắn
          </button>
        </div>
      </div>

      {selectedTab === 'servers' && (
        <div>
          {mockServers.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {mockServers.map((server) => (
                  <div key={server.id} className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center">
                        <Server className="w-6 h-6 text-zinc-900" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-zinc-900 mb-1">{server.name}</h3>
                        <p className="text-sm text-zinc-600 font-mono mb-4">ID: {server.serverId}</p>

                        <div className="flex gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-zinc-600" />
                            <span className="text-sm text-zinc-600">{server.channelCount} kênh</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-zinc-600" />
                            <span className="text-sm text-zinc-600">{server.memberCount} thành viên</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedServer(server);
                              setShowConfigModal(true);
                            }}
                            className="px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors text-sm flex items-center gap-1"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            Cấu hình bot
                          </button>
                          <button
                            onClick={() => {
                              setSelectedServer(server);
                              setShowChannelsModal(true);
                            }}
                            className="px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors text-sm flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Xem channels
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowAddServerModal(true)}
                className="w-full p-4 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 transition-colors"
              >
                + Thêm server
              </button>
            </>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center">
              <Server className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Chưa có server nào</h3>
              <p className="text-zinc-600 mb-6">Hãy thêm Discord server đầu tiên để bắt đầu</p>
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-left mb-6 max-w-md mx-auto">
                <p className="text-sm text-zinc-700 mb-2 font-medium">Hướng dẫn kết nối:</p>
                <ol className="text-sm text-zinc-600 space-y-1 list-decimal list-inside">
                  <li>Tạo Discord server cho lớp học</li>
                  <li>Tạo bot và lấy Server ID</li>
                  <li>Thêm bot vào server</li>
                  <li>Nhập Server ID vào hệ thống</li>
                </ol>
              </div>
              <button
                onClick={() => setShowAddServerModal(true)}
                className="px-6 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors font-medium"
              >
                Thêm server đầu tiên
              </button>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'messages' && (
        <div>
          <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-6">
            <div className="flex gap-2">
              {(['all', 'auto', 'channel', 'bulk_dm'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setMessageFilter(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                    messageFilter === type
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {type === 'all' ? 'Tất cả' : type === 'auto' ? 'Thông báo tự động' : type === 'channel' ? 'Channel chung' : 'Bulk DM'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredMessages.map((msg) => (
              <div key={msg.id} className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      msg.type === 'auto'
                        ? 'bg-zinc-100 text-zinc-700'
                        : msg.type === 'channel'
                        ? 'bg-zinc-200 text-zinc-900'
                        : 'bg-zinc-900 text-white'
                    }`}>
                      {msg.type === 'auto' ? 'Tự động' : msg.type === 'channel' ? 'Channel' : 'Bulk DM'}
                    </span>
                    <span className="text-sm text-zinc-600">
                      {new Date(msg.timestamp).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    msg.status === 'sent'
                      ? 'bg-zinc-100 text-zinc-700'
                      : msg.status === 'pending'
                      ? 'bg-zinc-200 text-zinc-700'
                      : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    {msg.status === 'sent' ? 'Đã gửi' : msg.status === 'pending' ? 'Đang gửi' : 'Thất bại'}
                  </span>
                </div>

                <p className="text-zinc-900 mb-2 line-clamp-2">{msg.content}</p>
                <p className="text-sm text-zinc-600">Người nhận: {msg.recipient}</p>

                {msg.type === 'bulk_dm' && msg.totalRecipients && (
                  <div className="mt-3 flex gap-4 text-sm">
                    <span className="text-zinc-700">
                      ✓ {msg.successCount} thành công
                    </span>
                    {msg.failCount && msg.failCount > 0 && (
                      <span className="text-zinc-600">
                        ✗ {msg.failCount} thất bại
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddServerModal && (
        <AddServerModal onClose={() => setShowAddServerModal(false)} />
      )}

      {showConfigModal && selectedServer && (
        <ConfigBotModal server={selectedServer} onClose={() => {
          setShowConfigModal(false);
          setSelectedServer(null);
        }} />
      )}

      {showChannelsModal && selectedServer && (
        <ChannelsModal server={selectedServer} onClose={() => {
          setShowChannelsModal(false);
          setSelectedServer(null);
        }} />
      )}

      {showSendMessageModal && (
        <SendMessageModal onClose={() => setShowSendMessageModal(false)} />
      )}
    </div>
  );
}

function AddServerModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-zinc-200 rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-semibold text-zinc-900 mb-6">Thêm Discord Server</h2>
        <form className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-700 mb-2">Lớp liên kết</label>
            <select className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400">
              <option value="">Chọn lớp</option>
              <option value="1">Lớp Cơ Bản</option>
              <option value="2">Lớp Nâng Cao</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-700 mb-2">Discord Server ID</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="123456789012345678"
            />
            <p className="text-xs text-zinc-600 mt-2">
              Bật Developer Mode trong Discord để copy Server ID
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
              Thêm server
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfigBotModal({ server, onClose }: { server: DiscordServer; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-zinc-200 rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Cấu hình bot</h2>
        <p className="text-zinc-600 mb-6">{server.name}</p>

        <form className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-700 mb-2">Voice channel (điểm danh tự động)</label>
            <input
              type="text"
              defaultValue={server.voiceChannelId}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="voice-channel-id"
            />
            <p className="text-xs text-zinc-600 mt-2">
              Bot sẽ poll danh sách thành viên trong channel này để điểm danh
            </p>
          </div>

          <div>
            <label className="block text-sm text-zinc-700 mb-2">Text channel (thông báo tự động)</label>
            <input
              type="text"
              defaultValue={server.textChannelId}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="text-channel-id"
            />
            <p className="text-xs text-zinc-600 mt-2">
              Bot sẽ post thông báo tự động vào channel này
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
              Lưu cấu hình
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChannelsModal({ server, onClose }: { server: DiscordServer; onClose: () => void }) {
  const mockChannels = [
    { id: 'general', name: 'general', type: 'text' },
    { id: 'announcements', name: 'announcements', type: 'text' },
    { id: 'homework', name: 'homework', type: 'text' },
    { id: 'voice-1', name: 'Voice Channel 1', type: 'voice' },
    { id: 'voice-2', name: 'Voice Channel 2', type: 'voice' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-zinc-200 rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Danh sách channels</h2>
        <p className="text-zinc-600 mb-6">{server.name}</p>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {mockChannels.map((channel) => (
            <div key={channel.id} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
              {channel.type === 'text' ? (
                <Hash className="w-4 h-4 text-zinc-600" />
              ) : (
                <Users className="w-4 h-4 text-zinc-600" />
              )}
              <span className="text-zinc-900">{channel.name}</span>
              <span className="ml-auto text-xs text-zinc-500">{channel.type}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-3 bg-zinc-100 text-zinc-900 rounded-lg hover:bg-zinc-200 transition-colors"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}

function SendMessageModal({ onClose }: { onClose: () => void }) {
  const [messageType, setMessageType] = useState<'channel' | 'bulk_dm'>('channel');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const mockStudentsData = [
    { id: '1', name: 'Nguyễn Văn A', class: 'Lớp Cơ Bản' },
    { id: '2', name: 'Trần Thị B', class: 'Lớp Cơ Bản' },
    { id: '3', name: 'Lê Văn C', class: 'Lớp Nâng Cao' },
    { id: '4', name: 'Phạm Thị D', class: 'Lớp Nâng Cao' },
  ];

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectClass = (className: string) => {
    const classStudents = mockStudentsData.filter(s => s.class === className).map(s => s.id);
    setSelectedStudents(classStudents);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-zinc-200 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <h2 className="text-xl font-semibold text-zinc-900 mb-6">Gửi tin nhắn</h2>

        <div className="mb-6">
          <label className="block text-sm text-zinc-700 mb-2">Loại tin nhắn</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMessageType('channel')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                messageType === 'channel'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              Gửi vào channel chung
            </button>
            <button
              type="button"
              onClick={() => setMessageType('bulk_dm')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                messageType === 'bulk_dm'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              Bulk DM
            </button>
          </div>
        </div>

        {messageType === 'channel' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-700 mb-2">Chọn server</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200 cursor-pointer hover:bg-zinc-100">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className="text-zinc-900">CP Training - Lớp Cơ Bản</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200 cursor-pointer hover:bg-zinc-100">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className="text-zinc-900">CP Training - Lớp Nâng Cao</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-700 mb-2">Nội dung tin nhắn</label>
              <textarea
                rows={4}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
                placeholder="Nhập nội dung tin nhắn..."
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm text-zinc-700">
                  Chọn người nhận ({selectedStudents.length} học sinh)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => selectClass('Lớp Cơ Bản')}
                    className="text-xs px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded hover:bg-zinc-200 transition-colors"
                  >
                    Lớp Cơ Bản
                  </button>
                  <button
                    type="button"
                    onClick={() => selectClass('Lớp Nâng Cao')}
                    className="text-xs px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded hover:bg-zinc-200 transition-colors"
                  >
                    Lớp Nâng Cao
                  </button>
                </div>
              </div>
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg max-h-48 overflow-y-auto">
                {mockStudentsData.map(student => (
                  <label
                    key={student.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-100 cursor-pointer border-b border-zinc-200 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => toggleStudent(student.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="text-zinc-900 text-sm">{student.name}</p>
                      <p className="text-zinc-600 text-xs">{student.class}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-700 mb-2">Nội dung tin nhắn</label>
              <textarea
                rows={4}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
                placeholder="Nhập nội dung tin nhắn..."
              />
            </div>

            {selectedStudents.length > 0 && (
              <div className="bg-zinc-100 border border-zinc-200 rounded-lg p-3">
                <p className="text-zinc-700 text-sm">
                  💡 Tin nhắn sẽ được gửi riêng đến {selectedStudents.length} học sinh
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-6">
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
            Gửi tin nhắn
          </button>
        </div>
      </div>
    </div>
  );
}
