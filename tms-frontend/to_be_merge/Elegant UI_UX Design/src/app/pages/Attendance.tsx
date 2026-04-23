import { useState } from "react";
import { Calendar, CheckCircle, XCircle, AlertCircle, Plus } from "lucide-react";

export function Attendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const sessions = [
    {
      id: '1',
      className: 'Lớp Cơ Bản',
      date: '2026-04-20',
      time: '19:00',
      status: 'completed' as const,
      attendance: [
        { studentName: 'Nguyễn Văn A', status: 'present' as const },
        { studentName: 'Trần Thị B', status: 'absent' as const },
        { studentName: 'Lê Văn C', status: 'excused' as const, reason: 'Ốm' },
      ],
    },
    {
      id: '2',
      className: 'Lớp Nâng Cao',
      date: '2026-04-20',
      time: '20:00',
      status: 'scheduled' as const,
    },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900 mb-2">Điểm danh</h1>
          <p className="text-zinc-600">Quản lý buổi học và điểm danh</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors">
          <Plus className="w-5 h-5" />
          Thêm buổi học
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-zinc-600" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
        </div>
      </div>

      <div className="space-y-6">
        {sessions.map((session) => (
          <div key={session.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-zinc-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-1">{session.className}</h3>
                  <p className="text-zinc-600 text-sm">
                    {new Date(session.date).toLocaleDateString('vi-VN')} - {session.time}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {session.status === 'completed' ? (
                    <span className="px-3 py-1 bg-white text-black rounded-full text-sm">
                      Đã hoàn thành
                    </span>
                  ) : session.status === 'scheduled' ? (
                    <span className="px-3 py-1 bg-zinc-200 text-zinc-700 rounded-full text-sm">
                      Sắp diễn ra
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-sm">
                      Đã hủy
                    </span>
                  )}
                  {session.status === 'scheduled' && (
                    <button className="px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors">
                      Hủy buổi học
                    </button>
                  )}
                </div>
              </div>
            </div>

            {session.attendance && (
              <div className="p-6">
                <div className="space-y-2">
                  {session.attendance.map((att, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-zinc-100 rounded-lg">
                      <div className="flex items-center gap-3">
                        {att.status === 'present' ? (
                          <CheckCircle className="w-5 h-5 text-zinc-900" />
                        ) : att.status === 'excused' ? (
                          <AlertCircle className="w-5 h-5 text-zinc-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-zinc-600" />
                        )}
                        <span className="text-zinc-900">{att.studentName}</span>
                        {att.reason && (
                          <span className="text-sm text-zinc-600">- {att.reason}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button className={`px-3 py-1 rounded-lg text-sm ${
                          att.status === 'present'
                            ? 'bg-white text-black'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        }`}>
                          Có mặt
                        </button>
                        <button className={`px-3 py-1 rounded-lg text-sm ${
                          att.status === 'excused'
                            ? 'bg-zinc-200 text-zinc-900'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        }`}>
                          Nghỉ có lý do
                        </button>
                        <button className={`px-3 py-1 rounded-lg text-sm ${
                          att.status === 'absent'
                            ? 'bg-zinc-300 text-zinc-900'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        }`}>
                          Vắng
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
