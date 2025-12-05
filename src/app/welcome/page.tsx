"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession, signIn } from "next-auth/react"

export default function WelcomePage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    // Keep users on this page whether authenticated or not so we can show
    // a friendly signed-out message after they sign out.
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading…</div>
      </div>
    )
  }

  // If the user is signed out, show a signed-out prompt with sign-in button.
  if (status === "unauthenticated") {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center" style={{ backgroundColor: "#F5D5B8" }}>
        <div className="mb-12">
          <img src="/LOGO.png" alt="Moru Logo" className="h-64 w-64 object-contain drop-shadow-lg" />
        </div>
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">You have to sign in to chat</h1>
          <p className="text-gray-700">You just signed out.</p>
        </div>
        <div className="mt-8">
          <button
            onClick={() => signIn("google", { authorizationParams: { prompt: "select_account" } as any, callbackUrl: "/welcome" })}
            className="px-8 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Sign in with Google
          </button>
        </div>
      </main>
    )
  }

  return (
    <main
      className="min-h-screen w-full flex flex-col items-center justify-center"
      style={{
        backgroundColor: "#F5D5B8",
      }}
    >
      {/* Logo */}
      <div className="mb-16">
        <img
          src="/LOGO.png"
          alt="Moru Logo"
          className="object-contain drop-shadow-lg"
          style={{ width: "512px", height: "512px" }}
        />
      </div>

      {/* Welcome Message */}
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-gray-800">
          Welcome To Moru
        </h1>
        <p className="text-3xl text-gray-700 font-semibold">
          Let's Chat
        </p>
      </div>

      {/* Start Button */}
      <div className="mt-16">
        <button
          onClick={() => router.push("/")}
          className="px-10 py-4 bg-gradient-to-r from-purple-500 to-purple-700 text-white text-lg font-bold rounded-lg hover:from-purple-600 hover:to-purple-800 transition shadow-lg"
        >
          Start Chatting
        </button>
      </div>

      {/* User Info (subtle) */}
      {session && (
        <div className="mt-16 text-sm text-gray-600">
          Logged in as {session.user?.email || session.user?.name}
        </div>
      )}
    </main>
  )
}
