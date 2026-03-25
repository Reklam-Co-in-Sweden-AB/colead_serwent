"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { inviteUser, deleteUser, changeUserPassword, type AdminUser } from "@/actions/users"
import { useRouter } from "next/navigation"

export function UserManagement({
  users,
  currentUserId,
}: {
  users: AdminUser[]
  currentUserId: string
}) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [changingPwId, setChangingPwId] = useState<string | null>(null)
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [pwLoading, setPwLoading] = useState(false)

  const handleAdd = async () => {
    setError("")
    setSuccess("")
    if (!email.trim() || !password.trim()) {
      setError("Fyll ut alle felt")
      return
    }

    setLoading(true)
    const result = await inviteUser(email.trim(), password)
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(`Bruker ${email} ble opprettet`)
      setEmail("")
      setPassword("")
      setShowAdd(false)
      router.refresh()
    }
  }

  const handleChangePassword = async (userId: string) => {
    setError("")
    setSuccess("")

    if (newPw.length < 6) {
      setError("Passordet må være minst 6 tegn")
      return
    }
    if (newPw !== confirmPw) {
      setError("Passordene stemmer ikke overens")
      return
    }

    setPwLoading(true)
    const result = await changeUserPassword(userId, newPw)
    setPwLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess("Passordet er oppdatert")
      setNewPw("")
      setConfirmPw("")
      setChangingPwId(null)
    }
  }

  const handleDelete = async (userId: string, userEmail: string) => {
    if (!confirm(`Er du sikker på at du vil slette brukeren "${userEmail}"?`)) return

    setError("")
    const result = await deleteUser(userId)
    if (result.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Aldri"
    return new Date(dateStr).toLocaleDateString("nb-NO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-dark text-xl font-bold">Brukere</h2>
          <p className="text-muted text-xs mt-1">
            {users.length} bruker{users.length !== 1 ? "e" : ""}
          </p>
        </div>
        <Button size="sm" onClick={() => { setShowAdd(!showAdd); setError(""); setSuccess("") }}>
          {showAdd ? "Avbryt" : "+ Ny bruker"}
        </Button>
      </div>

      {/* Statusmeddelanden */}
      {error && (
        <div className="bg-error/10 border-2 border-error/20 rounded-md px-4 py-2.5 text-sm text-error mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-teal/10 border-2 border-teal/20 rounded-md px-4 py-2.5 text-sm text-teal mb-4">
          {success}
        </div>
      )}

      {/* Lägg till ny användare */}
      {showAdd && (
        <div className="p-4 bg-background rounded-lg border-2 border-border mb-5">
          <h3 className="text-sm font-bold text-dark mb-3">Ny bruker</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                E-post
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="bruker@example.no"
                className="border-2 border-border rounded-md px-3 py-2 text-sm outline-none focus:border-teal"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                Passord
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minst 8 tegn"
                className="border-2 border-border rounded-md px-3 py-2 text-sm outline-none focus:border-teal"
              />
            </div>
            <div className="flex items-end">
              <Button size="sm" onClick={handleAdd} disabled={loading}>
                {loading ? "Oppretter..." : "Opprett bruker"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Användarlista */}
      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <div key={u.id} className="border-2 border-border rounded-lg">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-dark rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-sm">
                    {u.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-dark">{u.email}</span>
                    {u.id === currentUserId && (
                      <Badge variant="success">Du</Badge>
                    )}
                  </div>
                  <div className="flex gap-4 mt-0.5">
                    <span className="text-xs text-muted">
                      Opprettet: {formatDate(u.created_at)}
                    </span>
                    <span className="text-xs text-muted">
                      Siste innlogging: {formatDate(u.last_sign_in_at)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setChangingPwId(changingPwId === u.id ? null : u.id)
                    setNewPw("")
                    setConfirmPw("")
                    setError("")
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-dark hover:bg-[#f1f5f9] rounded-md transition-colors cursor-pointer"
                >
                  Endre passord
                </button>
                {u.id !== currentUserId && (
                  <button
                    onClick={() => handleDelete(u.id, u.email)}
                    className="px-3 py-1.5 text-xs font-semibold text-error hover:bg-error/10 rounded-md transition-colors cursor-pointer"
                  >
                    Slett
                  </button>
                )}
              </div>
            </div>

            {changingPwId === u.id && (
              <div className="px-4 pb-4 pt-0">
                <div className="p-4 bg-background rounded-lg border border-border">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-xs font-semibold text-muted uppercase tracking-wider">Nytt passord</label>
                      <input
                        type="password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder="Minst 6 tegn"
                        className="border-2 border-border rounded-md px-3 py-2 text-sm outline-none focus:border-teal"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-xs font-semibold text-muted uppercase tracking-wider">Bekreft passord</label>
                      <input
                        type="password"
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        placeholder="Gjenta passordet"
                        className="border-2 border-border rounded-md px-3 py-2 text-sm outline-none focus:border-teal"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <Button size="sm" onClick={() => handleChangePassword(u.id)} disabled={pwLoading}>
                        {pwLoading ? "Lagrer..." : "Lagre"}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setChangingPwId(null)}>
                        Avbryt
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
