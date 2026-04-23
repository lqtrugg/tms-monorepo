import { useState } from "react";
import { useNavigate } from "react-router";
import { LogIn } from "lucide-react";

export function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/');
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

          <h1 className="text-2xl font-semibold text-zinc-900 text-center mb-2">
            {isLogin ? 'Đăng nhập' : 'Đăng ký'}
          </h1>
          <p className="text-zinc-600 text-center mb-8">
            Hệ thống quản lý lập trình thi đấu
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                placeholder="email@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-700 mb-2">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors"
            >
              {isLogin ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              {isLogin ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
