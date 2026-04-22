import { Users, GraduationCap, DollarSign, TrendingUp } from "lucide-react";
import { mockStudents, mockClasses, mockTransactions } from "../data/mockData";

export function Dashboard() {
  const activeStudents = mockStudents.filter(s => s.status === 'active').length;
  const activeClasses = mockClasses.filter(c => c.status === 'active').length;
  const totalDebt = mockStudents
    .filter(s => s.status === 'active' && s.balance < 0)
    .reduce((sum, s) => sum + Math.abs(s.balance), 0);
  const monthlyRevenue = mockTransactions
    .filter(t => t.type === 'payment')
    .reduce((sum, t) => sum + t.amount, 0);

  const stats = [
    {
      label: "Học sinh đang học",
      value: activeStudents,
      icon: Users,
      color: "bg-zinc-100 text-zinc-700",
    },
    {
      label: "Lớp đang mở",
      value: activeClasses,
      icon: GraduationCap,
      color: "bg-zinc-100 text-zinc-700",
    },
    {
      label: "Tổng nợ hiện tại",
      value: `${(totalDebt / 1000).toFixed(0)}K`,
      icon: DollarSign,
      color: "bg-zinc-100 text-zinc-700",
    },
    {
      label: "Doanh thu tháng",
      value: `${(monthlyRevenue / 1000000).toFixed(1)}M`,
      icon: TrendingUp,
      color: "bg-zinc-100 text-zinc-700",
    },
  ];

  const recentDebts = mockStudents
    .filter(s => s.status === 'active' && s.balance < 0)
    .sort((a, b) => a.balance - b.balance)
    .slice(0, 5);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-zinc-900 mb-2">Dashboard</h1>
        <p className="text-zinc-600">Tổng quan hệ thống quản lý</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-zinc-600 text-sm mb-2">{stat.label}</p>
                  <p className="text-3xl font-semibold text-zinc-900">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Học sinh nợ nhiều nhất</h2>
          <div className="space-y-3">
            {recentDebts.map((student) => {
              const className = mockClasses.find(c => c.id === student.classId)?.name;
              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-200"
                >
                  <div>
                    <p className="text-zinc-900 font-medium">{student.name}</p>
                    <p className="text-sm text-zinc-600">{className}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-zinc-700 font-semibold">
                      -{(Math.abs(student.balance) / 1000).toFixed(0)}K
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Lớp học đang mở</h2>
          <div className="space-y-3">
            {mockClasses.filter(c => c.status === 'active').map((cls) => (
              <div
                key={cls.id}
                className="p-4 bg-zinc-50 rounded-lg border border-zinc-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-zinc-900 font-medium">{cls.name}</p>
                  <span className="px-3 py-1 bg-zinc-200 text-zinc-700 rounded-full text-sm">
                    {cls.studentCount} HS
                  </span>
                </div>
                <p className="text-sm text-zinc-600 mb-1">{cls.schedule}</p>
                <p className="text-sm text-zinc-700">
                  {(cls.feePerSession / 1000).toFixed(0)}K/buổi
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
