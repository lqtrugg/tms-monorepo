import { Navigate, Outlet, Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ClipboardList,
  ClipboardCheck,
  DollarSign,
  BookOpen,
  BarChart3,
  LogOut,
  MessageSquare,
  Shield,
} from "lucide-react";

import { clearAuthSession, getAccessToken, getStoredTeacher } from "../services/authStorage";

type NavItem = {
  path: string;
  icon: typeof LayoutDashboard;
  label: string;
};

const teacherNavItems: NavItem[] = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/students", icon: Users, label: "Học sinh" },
  { path: "/classes", icon: GraduationCap, label: "Lớp học" },
  { path: "/sessions", icon: ClipboardList, label: "Buổi học" },
  { path: "/attendance", icon: ClipboardCheck, label: "Điểm danh" },
  { path: "/transactions", icon: DollarSign, label: "Giao dịch" },
  { path: "/topics", icon: BookOpen, label: "Chuyên đề" },
  { path: "/messaging", icon: MessageSquare, label: "Tin nhắn" },
  { path: "/reports", icon: BarChart3, label: "Báo cáo" },
];

const sysAdminNavItems: NavItem[] = [
  { path: "/admin/teachers", icon: Shield, label: "Quản trị tài khoản" },
];

function isNavItemActive(currentPath: string, itemPath: string): boolean {
  if (currentPath === itemPath) {
    return true;
  }

  return currentPath.startsWith(`${itemPath}/`);
}

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const accessToken = getAccessToken();
  const teacher = getStoredTeacher();

  if (!accessToken || !teacher || !teacher.is_active) {
    clearAuthSession();
    return <Navigate to="/login" replace />;
  }

  const navItems = teacher.role === "sysadmin" ? sysAdminNavItems : teacherNavItems;

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900">
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-xl font-semibold text-white">CP Training</h1>
          <p className="text-sm text-zinc-400 mt-1">Quản lý lập trình thi đấu</p>
          <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2">
            <p className="text-xs text-zinc-400">Đăng nhập</p>
            <p className="text-sm text-white font-medium mt-0.5">{teacher.username}</p>
            <p className="text-xs text-zinc-400 mt-1">
              Vai trò: {teacher.role === "sysadmin" ? "System Admin" : "Teacher"}
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(location.pathname, item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-500 hover:bg-zinc-800 hover:text-white"
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

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
