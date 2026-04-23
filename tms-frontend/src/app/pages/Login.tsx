import { useState } from "react";
import { useNavigate } from "react-router";
import { LogIn } from "lucide-react";
import { login, register } from "../services/authService";
import { ApiError } from "../services/apiClient";

export function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [codeforcesHandle, setCodeforcesHandle] = useState("");
  const [codeforcesApiKey, setCodeforcesApiKey] = useState("");
  const [codeforcesApiSecret, setCodeforcesApiSecret] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      if (isLogin) {
        const data = await login({
          username,
          password,
        });

        localStorage.setItem("tms_access_token", data.accessToken);
        navigate("/");
        return;
      }

      const normalizedHandle = codeforcesHandle.trim();
      if (!normalizedHandle) {
        setError("Codeforces handle là bắt buộc khi đăng ký");
        return;
      }

      await register({
        username,
        password,
        codeforces_handle: normalizedHandle,
        codeforces_api_key: codeforcesApiKey.trim() || null,
        codeforces_api_secret: codeforcesApiSecret.trim() || null,
      });

      setIsLogin(true);
      setPassword("");
      setCodeforcesHandle("");
      setCodeforcesApiKey("");
      setCodeforcesApiSecret("");
      setSuccess("Đăng ký thành công. Hãy đăng nhập để vào hệ thống.");
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

          <h1 className="text-2xl font-semibold text-zinc-900 text-center mb-2">
            {isLogin ? 'Đăng nhập' : 'Đăng ký'}
          </h1>
          <p className="text-zinc-600 text-center mb-8">
            Hệ thống quản lý lập trình thi đấu
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                placeholder="teacher01"
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

            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm text-zinc-700 mb-2">Codeforces Handle</label>
                  <input
                    type="text"
                    value={codeforcesHandle}
                    onChange={(e) => setCodeforcesHandle(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                    placeholder="tourist"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-700 mb-2">Codeforces API Key (optional)</label>
                  <input
                    type="text"
                    value={codeforcesApiKey}
                    onChange={(e) => setCodeforcesApiKey(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                    placeholder="api-key"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-700 mb-2">Codeforces API Secret (optional)</label>
                  <input
                    type="password"
                    value={codeforcesApiSecret}
                    onChange={(e) => setCodeforcesApiSecret(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                    placeholder="api-secret"
                  />
                </div>
              </>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-emerald-700">{success}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors"
            >
              {isLogin ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setSuccess("");
              }}
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
