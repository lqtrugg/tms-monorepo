import { AlertCircle, CheckCircle, DollarSign } from "lucide-react";
import { mockStudents, mockClasses } from "../data/mockData";

export function PendingArchive() {
  const pendingStudents = mockStudents.filter(s => s.status === 'pending_archive');
  const needCollect = pendingStudents.filter(s => s.balance < 0);
  const needRefund = pendingStudents.filter(s => s.balance > 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-zinc-900 mb-2">Học sinh chờ xử lý</h1>
        <p className="text-zinc-600">
          {pendingStudents.length} học sinh đang chờ xử lý
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-zinc-900" />
            </div>
            <div>
              <p className="text-zinc-600 text-sm">Cần đòi nợ</p>
              <p className="text-2xl font-semibold text-zinc-900">{needCollect.length}</p>
            </div>
          </div>
          <div className="text-sm text-zinc-600">
            Tổng nợ: <span className="text-zinc-900 font-semibold">
              {(needCollect.reduce((sum, s) => sum + Math.abs(s.balance), 0) / 1000).toFixed(0)}K
            </span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-zinc-300" />
            </div>
            <div>
              <p className="text-zinc-600 text-sm">Cần hoàn trả</p>
              <p className="text-2xl font-semibold text-zinc-900">{needRefund.length}</p>
            </div>
          </div>
          <div className="text-sm text-zinc-600">
            Tổng dư: <span className="text-zinc-600 font-semibold">
              {(needRefund.reduce((sum, s) => sum + s.balance, 0) / 1000).toFixed(0)}K
            </span>
          </div>
        </div>
      </div>

      {needCollect.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Cần đòi nợ</h2>
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-100 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Học sinh</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Lớp cũ</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Số nợ</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-zinc-600">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {needCollect.map((student) => {
                  const className = mockClasses.find(c => c.id === student.classId)?.name;
                  return (
                    <tr key={student.id} className="hover:bg-zinc-100/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-zinc-900 font-medium">{student.name}</p>
                          <p className="text-sm text-zinc-600">{student.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-300">{className}</td>
                      <td className="px-6 py-4">
                        <span className="text-zinc-900 font-semibold">
                          {(Math.abs(student.balance) / 1000).toFixed(0)}K
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button className="px-4 py-2 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors">
                            Đã thu đủ nợ
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {needRefund.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Cần hoàn trả</h2>
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-100 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Học sinh</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Lớp cũ</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-600">Số dư</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-zinc-600">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {needRefund.map((student) => {
                  const className = mockClasses.find(c => c.id === student.classId)?.name;
                  return (
                    <tr key={student.id} className="hover:bg-zinc-100/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-zinc-900 font-medium">{student.name}</p>
                          <p className="text-sm text-zinc-600">{student.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-300">{className}</td>
                      <td className="px-6 py-4">
                        <span className="text-zinc-600 font-semibold">
                          {(student.balance / 1000).toFixed(0)}K
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button className="px-4 py-2 bg-zinc-700 text-zinc-900 rounded-lg hover:bg-zinc-600 transition-colors">
                            Đã hoàn trả
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pendingStudents.length === 0 && (
        <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center">
          <CheckCircle className="w-12 h-12 text-zinc-900 mx-auto mb-4" />
          <p className="text-zinc-900 font-medium mb-2">Không có học sinh nào chờ xử lý</p>
          <p className="text-zinc-600 text-sm">Tất cả học sinh đã được xử lý xong</p>
        </div>
      )}
    </div>
  );
}
