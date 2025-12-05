"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export default function WelcomePage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    // If the user isn't signed in, kick them back to the home/sign-in flow.
    if (status === "unauthenticated") router.push("/")
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading…</div>
      </div>
    )
  }

  const name = session?.user?.name ?? session?.user?.email ?? "friend"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-xl p-8 bg-white rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-4">Welcome, {name}!</h1>
        <p className="mb-6 text-gray-600">Thanks for signing in. When you're ready, let's go start a new chat.</p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500"
          >
            Let's!
          </button>

          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 rounded-md border border-gray-200 text-gray-700"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
