import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Mail, GraduationCap, DollarSign } from "lucide-react";
import { mockStudents, mockClasses, mockTransactions } from "../data/mockData";

export function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const student = mockStudents.find(s => s.id === id);
  const className = student ? mockClasses.find(c => c.id === student.classId)?.name : null;
  const studentTransactions = mockTransactions.filter(t => t.studentId === id);

  if (!student) {
    return (
      <div className="p-8">
        <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center">
          <p className="text-zinc-600">Không tìm thấy học sinh</p>
          <button
            onClick={() => navigate('/students')}
            className="mt-4 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-3 py-1 bg-zinc-900 text-white rounded-full text-sm">Đang học</span>;
      case 'pending_archive':
        return <span className="px-3 py-1 bg-zinc-300 text-zinc-700 rounded-full text-sm">Chờ xử lý</span>;
      case 'archived':
        return <span className="px-3 py-1 bg-zinc-200 text-zinc-600 rounded-full text-sm">Đã lưu trữ</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-8">
      <button
        onClick={() => navigate('/students')}
        className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại danh sách
      </button>

      <div className="bg-white border border-zinc-200 rounded-xl p-8 mb-6 shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900 mb-2">{student.name}</h1>
            <div className="flex items-center gap-2 text-zinc-600">
              <Mail className="w-4 h-4" />
              <span>{student.email}</span>
            </div>
          </div>
          {getStatusBadge(student.status)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-200">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="w-5 h-5 text-zinc-600" />
              <span className="text-sm text-zinc-600">Lớp học</span>
            </div>
            <p className="text-lg font-semibold text-zinc-900">{className || 'N/A'}</p>
          </div>

          <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-zinc-600" />
              <span className="text-sm text-zinc-600">Số dư</span>
            </div>
            <p className={`text-lg font-semibold ${
              student.balance < 0 ? 'text-zinc-700' : student.balance > 0 ? 'text-zinc-600' : 'text-zinc-500'
            }`}>
              {student.balance < 0 ? '-' : student.balance > 0 ? '+' : ''}
              {(Math.abs(student.balance) / 1000).toFixed(0)}K
            </p>
          </div>

          <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-zinc-600">Ngày nhập học</span>
            </div>
            <p className="text-lg font-semibold text-zinc-900">
              {new Date(student.joinedDate).toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-zinc-900 mb-4">Lịch sử giao dịch</h2>

        {studentTransactions.length > 0 ? (
          <div className="space-y-3">
            {studentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                <div>
                  <p className="text-zinc-900 font-medium">{tx.description}</p>
                  <p className="text-sm text-zinc-600">
                    {new Date(tx.date).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`font-semibold ${
                    tx.type === 'payment'
                      ? 'text-zinc-900'
                      : 'text-zinc-600'
                  }`}>
                    {tx.type === 'payment' ? '+' : '-'}
                    {(Math.abs(tx.amount) / 1000).toFixed(0)}K
                  </span>
                  <p className="text-xs text-zinc-500 mt-1">
                    {tx.type === 'payment' ? 'Thu tiền' : tx.type === 'refund' ? 'Hoàn trả' : 'Học phí'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-center py-8">Chưa có giao dịch nào</p>
        )}
      </div>
    </div>
  );
}
