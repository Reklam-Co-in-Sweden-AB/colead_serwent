"use client"

import { useState, useRef, useCallback, useEffect } from "react"

interface AddressSuggestion {
  adressenavn: string
  nummer: number
  bokstav: string
  postnummer: string
  poststed: string
  gardsnummer: number
  bruksnummer: number
  kommunenavn: string
}

interface AddressLookupProps {
  value: string
  onChange: (adresse: string, gnr: string, bnr: string) => void
  error?: string
}

export function AddressLookup({ value, onChange, error }: AddressLookupProps) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const lookup = useCallback(async (q: string) => {
    if (q.length < 3) {
      setSuggestions([])
      return
    }

    try {
      const res = await fetch(`/api/address?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setSuggestions(data.suggestions || [])
      setShowSuggestions(true)
    } catch {
      setSuggestions([])
    }
  }, [])

  const handleInput = (val: string) => {
    setQuery(val)
    setConfirmed(false)
    onChange(val, "", "")
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => lookup(val), 350)
  }

  const selectSuggestion = (adr: AddressSuggestion) => {
    const fullAddress = [
      adr.adressenavn,
      adr.nummer ? `${adr.nummer}${adr.bokstav || ""}` : "",
      adr.poststed ? `${adr.postnummer} ${adr.poststed}` : "",
    ]
      .filter(Boolean)
      .join(" ")

    setQuery(fullAddress)
    setConfirmed(true)
    setSuggestions([])
    setShowSuggestions(false)
    onChange(fullAddress, String(adr.gardsnummer ?? ""), String(adr.bruksnummer ?? ""))
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={wrapperRef} className="relative flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-dark uppercase tracking-wider">
        Anleggsadresse <span className="text-orange">*</span>
      </label>
      <input
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder="Søk adresse..."
        className={`
          border-2 rounded-md px-3.5 py-2.5 text-sm
          text-foreground bg-white outline-none
          transition-all duration-200
          focus:border-teal focus:ring-2 focus:ring-teal/20
          ${error ? "border-error" : confirmed ? "border-success" : "border-border"}
        `}
      />
      {confirmed && (
        <span className="text-success text-xs">Adresse bekreftet via Kartverket</span>
      )}
      {error && <span className="text-error text-xs">{error}</span>}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {suggestions.map((adr, i) => {
            const display = [
              adr.adressenavn,
              adr.nummer ? `${adr.nummer}${adr.bokstav || ""}` : "",
            ]
              .filter(Boolean)
              .join(" ")
            return (
              <button
                key={i}
                type="button"
                onClick={() => selectSuggestion(adr)}
                className="w-full text-left px-4 py-3 hover:bg-teal/5 transition-colors border-b border-border/50 last:border-b-0"
              >
                <div className="text-sm font-medium text-foreground">{display}</div>
                <div className="text-xs text-muted mt-0.5">
                  {adr.postnummer} {adr.poststed} — Gnr {adr.gardsnummer}, Bnr {adr.bruksnummer}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
