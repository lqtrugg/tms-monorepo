import { useParams, useNavigate } from "react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { mockTopics, mockClasses, mockStudents } from "../data/mockData";

export function TopicStanding() {
  const { id } = useParams();
  const navigate = useNavigate();

  const topic = mockTopics.find(t => t.id === id);
  const className = topic ? mockClasses.find(c => c.id === topic.classId)?.name : null;
  const classStudents = topic ? mockStudents.filter(s => s.classId === topic.classId && s.status === 'active') : [];

  // Mock standing data
  const standingData = classStudents.map((student, idx) => ({
    studentName: student.name,
    solved: Math.floor(Math.random() * 10),
    problems: Array.from({ length: 8 }, (_, i) => ({
      problemId: `${String.fromCharCode(65 + i)}`,
      solved: Math.random() > 0.5,
      attempts: Math.floor(Math.random() * 5),
    })),
  }));

  const lastPulled = new Date();

  if (!topic) {
    return (
      <div className="p-8">
        <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center">
          <p className="text-zinc-600">Không tìm thấy chuyên đề</p>
          <button
            onClick={() => navigate('/topics')}
            className="mt-4 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <button
        onClick={() => navigate('/topics')}
        className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại danh sách chuyên đề
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900 mb-2">{topic.name}</h1>
          <p className="text-zinc-600">{className}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors">
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 mb-6">
        <p className="text-sm text-zinc-600">
          Cập nhật lần cuối: {lastPulled.toLocaleString('vi-VN')}
        </p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-100 border-b border-zinc-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-zinc-700 sticky left-0 bg-zinc-100">
                  Học sinh
                </th>
                <th className="px-6 py-4 text-center text-sm font-medium text-zinc-700">
                  Số bài AC
                </th>
                {standingData[0]?.problems.map((p) => (
                  <th key={p.problemId} className="px-4 py-4 text-center text-sm font-medium text-zinc-700">
                    {p.problemId}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {standingData.map((row, idx) => (
                <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 text-zinc-900 font-medium sticky left-0 bg-white">
                    {row.studentName}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 bg-zinc-900 text-white rounded-full text-sm font-semibold">
                      {row.solved}
                    </span>
                  </td>
                  {row.problems.map((p) => (
                    <td key={p.problemId} className="px-4 py-4 text-center">
                      {p.solved ? (
                        <span className="inline-block w-8 h-8 bg-zinc-900 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                          ✓
                        </span>
                      ) : p.attempts > 0 ? (
                        <span className="inline-block w-8 h-8 bg-zinc-200 text-zinc-700 rounded-full flex items-center justify-center text-xs">
                          -{p.attempts}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {classStudents.length === 0 && (
        <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center mt-6">
          <p className="text-zinc-600">Chưa có học sinh nào trong lớp này</p>
        </div>
      )}
    </div>
  );
}
