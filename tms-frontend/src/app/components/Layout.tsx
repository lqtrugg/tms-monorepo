import { Outlet, Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ClipboardCheck,
  DollarSign,
  Code2,
  BarChart3,
  LogOut,
  Archive,
  MessageSquare
} from "lucide-react";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/students", icon: Users, label: "Học sinh" },
    { path: "/classes", icon: GraduationCap, label: "Lớp học" },
    { path: "/attendance", icon: ClipboardCheck, label: "Điểm danh" },
    { path: "/transactions", icon: DollarSign, label: "Giao dịch" },
    { path: "/pending-archive", icon: Archive, label: "Chờ xử lý" },
    { path: "/codeforces", icon: Code2, label: "Codeforces" },
    { path: "/discord", icon: MessageSquare, label: "Discord" },
    { path: "/reports", icon: BarChart3, label: "Báo cáo" },
  ];

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-xl font-semibold text-white">CP Training</h1>
          <p className="text-sm text-zinc-400 mt-1">Quản lý lập trình thi đấu</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
