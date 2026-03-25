"use client"

import { useState } from "react"
import { adminChangePassword } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type User = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
}

interface UserManagerProps {
  users: User[]
  currentUserEmail: string
}

export function UserManager({ users, currentUserEmail }: UserManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)

  async function handleChangePassword(userId: string) {
    setMessage("")

    if (newPassword.length < 6) {
      setMessage("Passordet må være minst 6 tegn")
      setIsError(true)
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage("Passordene stemmer ikke overens")
      setIsError(true)
      return
    }

    setSaving(true)
    const result = await adminChangePassword(userId, newPassword)
    setSaving(false)

    if (result.error) {
      setMessage(result.error)
      setIsError(true)
    } else {
      setMessage("Passordet er oppdatert")
      setIsError(false)
      setNewPassword("")
      setConfirmPassword("")
      setEditingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <div key={user.id} className="border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-dark">{user.email}</span>
                {user.email === currentUserEmail && (
                  <Badge variant="info">Du</Badge>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5">
                Siste innlogging: {user.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleString("nb-NO")
                  : "Aldri"}
              </p>
            </div>
            {editingId !== user.id && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingId(user.id)
                  setNewPassword("")
                  setConfirmPassword("")
                  setMessage("")
                }}
              >
                Endre passord
              </Button>
            )}
          </div>

          {editingId === user.id && (
            <div className="mt-3 pt-3 border-t border-border space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-dark uppercase tracking-wider">
                  Nytt passord
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minst 6 tegn"
                  className="border-2 border-border rounded-md px-3 py-2 text-sm bg-white text-dark focus:outline-none focus:border-teal max-w-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-dark uppercase tracking-wider">
                  Bekreft passord
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Gjenta passordet"
                  className="border-2 border-border rounded-md px-3 py-2 text-sm bg-white text-dark focus:outline-none focus:border-teal max-w-sm"
                />
              </div>
              {message && (
                <p className={`text-xs ${isError ? "text-error" : "text-teal"}`}>{message}</p>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleChangePassword(user.id)} disabled={saving}>
                  {saving ? "Oppdaterer..." : "Lagre"}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>
                  Avbryt
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
