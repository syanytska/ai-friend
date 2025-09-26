"use client";
import { useEffect, useState } from "react";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export default function Home() {
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the latest history from the DB
  const loadHistory = async () => {
    try {
      const res = await fetch("/api/messages", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load history");
      const data: Msg[] = await res.json();
      setHistory(data);
    } catch (e: any) {
      setError(e.message || "Failed to load history");
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const sendMessage = async () => {
    setError(null);
    if (!message.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");

      setMessage("");
      // Refresh the history so both your msg and AI reply appear
      await loadHistory();
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-2xl space-y-4">
        <h1 className="text-3xl font-bold text-center">AI Friend</h1>

        {/* Conversation */}
        <div className="bg-white border rounded-md p-4 h-80 overflow-auto">
          {history.length === 0 && (
            <div className="text-gray-500">No messages yet — say hi!</div>
          )}
          {history.map((m) => (
            <div key={m.id} className="mb-3">
              <div className="text-sm text-gray-400">
                {new Date(m.createdAt).toLocaleTimeString()}
              </div>
              <div
                className={
                  m.role === "user"
                    ? "bg-blue-50 border border-blue-200 rounded-md p-2"
                    : "bg-gray-100 border border-gray-200 rounded-md p-2"
                }
              >
                <span className="font-semibold mr-1">
                  {m.role === "user" ? "You" : "AI"}:
                </span>
                <span className="whitespace-pre-wrap">{m.content}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        <textarea
          className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Say something..."
        />

        <button
          onClick={sendMessage}
          disabled={loading}
          className="w-full py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Thinking..." : "Send"}
        </button>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>
        )}
      </div>
    </main>
  );
}
