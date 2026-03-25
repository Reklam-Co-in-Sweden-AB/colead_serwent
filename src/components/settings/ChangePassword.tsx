"use client"

import { useState } from "react"
import { changePassword } from "@/actions/auth"
import { Button } from "@/components/ui/button"

export function ChangePassword() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
    const result = await changePassword(newPassword)
    setSaving(false)

    if (result.error) {
      setMessage(result.error)
      setIsError(true)
    } else {
      setMessage("Passordet er oppdatert")
      setIsError(false)
      setNewPassword("")
      setConfirmPassword("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-lg">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-dark uppercase tracking-wider">
          Nytt passord
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Minst 6 tegn"
          className="border-2 border-border rounded-md px-3 py-2 text-sm bg-white text-dark focus:outline-none focus:border-teal"
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
          className="border-2 border-border rounded-md px-3 py-2 text-sm bg-white text-dark focus:outline-none focus:border-teal"
        />
      </div>
      {message && (
        <p className={`text-xs ${isError ? "text-error" : "text-teal"}`}>{message}</p>
      )}
      <div>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Oppdaterer..." : "Endre passord"}
        </Button>
      </div>
    </form>
  )
}
