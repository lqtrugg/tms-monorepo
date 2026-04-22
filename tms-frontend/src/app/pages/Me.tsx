import { useEffect, useState } from "react";

export function Me() {
  const [result, setResult] = useState("Loading...");

  useEffect(() => {
    fetch("/api/me", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("tms_access_token") ?? ""}`,
      },
    })
      .then(async (response) => {
        const data = await response.json();
        setResult(JSON.stringify(data, null, 2));
      })
      .catch((error) => setResult(String(error)));
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <pre className="rounded-lg bg-white p-4 text-sm text-zinc-900 shadow">
        {result}
      </pre>
    </main>
  );
}
