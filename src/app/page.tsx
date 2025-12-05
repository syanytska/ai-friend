"use client";

import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Composer from "@/components/Composer";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type Conversation = {
  id: string;
  title: string;
  updatedAt?: string;
};

export default function Home() {
  const { data: session } = useSession();

  // local transfer removed — users must sign in to use the app

  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Msg[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [pendingConversationId, setPendingConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the latest history from the DB for the active conversation
  const loadHistory = async () => {
    try {
      if (!activeConversationId) return setHistory([]);
      const res = await fetch(`/api/messages?conversationId=${activeConversationId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load history");
      const data: Msg[] = await res.json();
      setHistory(data);
    } catch (e: any) {
      setError(e.message || "Failed to load history");
    }
  };

  const loadConversations = async () => {
    try {
      const res = await fetch("/api/conversations", { cache: "no-store" });

      const data: Conversation[] = await res.json();
      setConversations(data);
      if (!activeConversationId && data.length) {
        // try to restore previously selected conversation for this user from localStorage
        try {
          const key = `activeConv:${(session as any)?.user?.id ?? "anon"}`;
          const saved = typeof window !== "undefined" ? localStorage.getItem(key) : null;
          if (saved && data.find((c) => c.id === saved)) {
            setActiveConversationId(saved);
          } else {
            setActiveConversationId(data[0].id);
          }
        } catch (e) {
          setActiveConversationId(data[0].id);
        }
      }
    } catch (e: any) {
      // non-fatal
      console.error(e);
      setError(e.message || "Failed to load conversations");
    }
  };

  const createConversation = async () => {
    try {
      if (!session) throw new Error("Not authenticated");
      const title = window.prompt("Conversation title:", "New conversation") || "New conversation";
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to create conversation");
      const conv = await res.json();
      // set as pending so user is not confused by composer appearing immediately
      setPendingConversationId(conv.id);
      await loadConversations();
    } catch (e: any) {
      setError(e.message || "Failed to create conversation");
    }
  };

  const renameConversation = async (id: string) => {
    try {
      const current = conversations.find((c) => c.id === id);
      const newTitle = window.prompt("Rename conversation:", current?.title || "") || undefined;
      if (!newTitle) return;
      const res = await fetch("/api/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id, title: newTitle }),
      });
      if (!res.ok) throw new Error("Failed to rename");
      await loadConversations();
    } catch (e: any) {
      setError(e.message || "Failed to rename conversation");
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      if (!confirm("Delete this conversation? This cannot be undone.")) return;
      const res = await fetch("/api/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      if (activeConversationId === id) setActiveConversationId(null);
      await loadConversations();
    } catch (e: any) {
      setError(e.message || "Failed to delete conversation");
    }
  };

  useEffect(() => {
    if (!session) return;
    loadConversations();
  }, [session]);

  useEffect(() => {
    loadHistory();
  }, [activeConversationId]);

  // persist active conversation selection per-user
  useEffect(() => {
    try {
      if (!activeConversationId || !session) return;
      const key = `activeConv:${(session as any).user?.id}`;
      localStorage.setItem(key, activeConversationId);
    } catch (e) {
      // ignore
    }
  }, [activeConversationId, session]);

  const sendMessage = async () => {
    setError(null);
    if (!message.trim()) return;

    setLoading(true);
    try {
      if (!session) throw new Error("Not authenticated");
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId: activeConversationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");

      setMessage("");
      // Refresh the history so both your msg and AI reply appear
      await loadHistory();
      // refresh conversation list to update updatedAt ordering
      await loadConversations();
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)" }}>
      <div className="w-full max-w-7xl flex gap-4 h-[90vh]">
        {/* Logo far left - takes up space and centered */}
        <div className="flex items-center justify-center" style={{ width: "150px" }}>
          <img
            src="/LOGO.png"
            alt="Moru Logo"
            className="w-32 h-32 object-contain drop-shadow-lg"
          />
        </div>

        <div className="flex-1 grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="col-span-4 bg-white border rounded-md p-4 h-[80vh] overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Conversations</h2>
            <button
              className="text-sm px-2 py-1 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded hover:from-purple-600 hover:to-purple-800"
              onClick={async () => {
                try {
                  const res = await fetch("/api/conversations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: "New conversation" }),
                  });
                  const ct = res.headers.get("content-type") || "";
                  if (!res.ok || !ct.includes("application/json")) {
                    throw new Error("Could not create conversation (not authenticated)");
                  }
                  const conv = await res.json();
                  // set new conversation pending — user must explicitly start it
                  setPendingConversationId(conv.id);
                  await loadConversations();
                } catch (e: any) {
                  setError(e.message || "Failed to create conversation");
                }
              }}
            >
              New
            </button>
          </div>
          <div>
            {conversations.length === 0 && (
              <div className="text-gray-500">No conversations yet</div>
            )}
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`p-2 rounded mb-2 hover:bg-gray-100 flex items-start justify-between ${
                  c.id === activeConversationId ? "bg-gray-100" : ""
                }`}
              >
                <div className="flex-1 cursor-pointer" onClick={() => setActiveConversationId(c.id)}>
                  <div className="text-sm font-medium">{c.title}</div>
                  <div className="text-xs text-gray-400">
                    {c.updatedAt ? new Date(c.updatedAt).toLocaleString() : ""}
                  </div>
                </div>
                <div className="flex gap-2 ml-3">
                  <button
                    title="Rename"
                    className="text-xs px-2 py-1 border rounded"
                    onClick={() => renameConversation(c.id)}
                  >
                    Rename
                  </button>
                  <button
                    title="Delete"
                    className="text-xs px-2 py-1 border rounded text-red-600"
                    onClick={() => deleteConversation(c.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main chat area */}
        <div className="col-span-8 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-white">Welcome friends</h1>
        </div>

        {/* Auth status + buttons */}
        <div className="flex items-center justify-between bg-white border rounded-md px-4 py-2">
          {session ? (
            <>
              <div className="text-sm">
                <div className="font-semibold">
                  Signed in as{" "}
                  {session.user?.name || session.user?.email || "Unknown user"}
                </div>
                {session.user?.email && (
                  <div className="text-gray-500 text-xs">
                    {session.user.email}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  // Sign out and redirect to the welcome page so user sees signed-out message
                  signOut({ callbackUrl: "/welcome" });
                }}
                className="px-3 py-1 rounded-md bg-red-500 text-white text-sm hover:bg-red-600"
              >
                Sign out
              </button>
              <button
                onClick={async () => {
                  // Ensure the app session is cleared, then open provider with account chooser
                  try {
                    await signOut({ redirect: false });
                  } catch (e) {
                    // ignore
                  }
                  // then prompt Google account chooser and go to welcome
                  signIn("google", {
                    authorizationParams: { prompt: "select_account" } as any,
                    callbackUrl: "/welcome",
                  });
                }}
                className="ml-2 px-3 py-1 rounded-md border text-sm"
              >
                Sign in as different account
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-gray-600">
                You&apos;re not signed in.
              </span>
              <button
                onClick={() =>
                  signIn("google", {
                    // ensure provider shows account chooser and send user to welcome page
                    authorizationParams: { prompt: "select_account" } as any,
                    callbackUrl: "/welcome",
                  })
                }
                className="px-3 py-1 rounded-md bg-gradient-to-r from-purple-500 to-purple-700 text-white text-sm hover:from-purple-600 hover:to-purple-800"
              >
                Sign in with Google
              </button>
            </>
          )}
        </div>

        {/* Conversation */}
        <div className="bg-white border rounded-md p-4 h-[60vh] overflow-auto">
          {history.length === 0 && (
            <div className="text-gray-500">No messages yet — say hi!</div>
          )}
          {pendingConversationId && (
            <div className="p-4 mb-4 border rounded bg-yellow-50">
              <div className="font-medium">New conversation created</div>
              <div className="text-sm text-gray-600 mb-2">Click the button below to start this conversation.</div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 bg-green-600 text-white rounded"
                  onClick={async () => {
                    setActiveConversationId(pendingConversationId);
                    setPendingConversationId(null);
                    await loadHistory();
                  }}
                >
                  Start conversation
                </button>
                <button
                  className="px-3 py-1 border rounded"
                  onClick={() => setPendingConversationId(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {history.map((m) => (
            <div key={m.id} className="mb-3">
              <div className="text-sm text-white">
                {new Date(m.createdAt).toLocaleTimeString()}
              </div>
              <div
                className={
                  m.role === "user"
                    ? "bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-md p-3 shadow-md"
                    : "bg-yellow-300 text-gray-900 rounded-md p-3 shadow-md"
                }
              >
                <span className="font-semibold mr-1">
                  {m.role === "user" ? "You" : "Moru"}:
                </span>
                <span className="whitespace-pre-wrap">{m.content}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        {!pendingConversationId && (
          <Composer
            value={message}
            onChange={(v: string) => setMessage(v)}
            disabled={loading || !activeConversationId}
            placeholder={activeConversationId ? "Say something..." : "Select or create a conversation"}
          />
        )}

        <button
          onClick={sendMessage}
          disabled={loading}
          className="w-full py-2 rounded-md text-white bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 disabled:opacity-60"
        >
          {loading ? "Thinking..." : "Send"}
        </button>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>
        )}
        </div>
        </div>

        {/* Mirrored logo far right */}
        <div className="flex items-center justify-center" style={{ width: "150px" }}>
          <img
            src="/LOGO.png"
            alt="Moru Logo"
            className="w-32 h-32 object-contain drop-shadow-lg"
            style={{ transform: "scaleX(-1)" }}
          />
        </div>
      </div>
    </main>
  );
}

