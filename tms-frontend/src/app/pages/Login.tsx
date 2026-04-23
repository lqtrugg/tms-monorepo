import { useState } from "react";
import { useNavigate } from "react-router";
import { LogIn } from "lucide-react";

import { ApiError } from "../services/apiClient";
import { login } from "../services/authService";
import { getDefaultHomePath, saveAuthSession } from "../services/authStorage";

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const data = await login({
        username,
        password,
      });

      saveAuthSession({
        accessToken: data.accessToken,
        teacher: data.teacher,
      });
      navigate(getDefaultHomePath(data.teacher.role));
    } catch (requestError) {
      setError(
        requestError instanceof ApiError || requestError instanceof Error
          ? requestError.message
          : "Request failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-lg">
          <div className="flex items-center justify-center mb-8">
            <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center">
              <LogIn className="w-6 h-6 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-zinc-900 text-center mb-2">Đăng nhập</h1>
          <p className="text-zinc-600 text-center mb-8">Hệ thống quản lý lập trình thi đấu</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                placeholder="admin hoặc teacher01"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-700 mb-2">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors disabled:opacity-60"
            >
              {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-sm text-zinc-600">
              Tạo tài khoản mới do sysadmin thực hiện trong trang quản trị tài khoản.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
