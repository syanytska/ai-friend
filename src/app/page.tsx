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
      setActiveConversationId(conv.id);
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
    <main className="min-h-screen flex items-start justify-center bg-gray-50 p-6">
      <div className="w-full max-w-6xl grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="col-span-3 bg-white border rounded-md p-4 h-[80vh] overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Conversations</h2>
            <button
              className="text-sm px-2 py-1 bg-black text-white rounded"
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
                  // set new conversation active
                  setActiveConversationId(conv.id);
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
        <div className="col-span-9 space-y-4">
        <h1 className="text-3xl font-bold text-center">AI Friend</h1>

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
                  // Use default signOut (redirect) so the server invalidates the session and browser cookies
                  // This will navigate away; client-side state will be reset on reload.
                  signOut();
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
                className="px-3 py-1 rounded-md bg-black text-white text-sm hover:bg-gray-800"
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
        <Composer
          value={message}
          onChange={(v: string) => setMessage(v)}
          disabled={loading || !activeConversationId}
          placeholder={activeConversationId ? "Say something..." : "Select or create a conversation"}
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
      </div>
    </main>
  );
}
