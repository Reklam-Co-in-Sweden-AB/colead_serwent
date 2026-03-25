"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createForm, deleteForm } from "@/actions/forms"

interface FormItem {
  id: string
  name: string
  slug: string
  status: string
  created_at: string
}

export function FormList({ forms, siteUrl }: { forms: FormItem[]; siteUrl: string }) {
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState("")
  const [newSlug, setNewSlug] = useState("")
  const [creating, setCreating] = useState(false)
  const [embedFormId, setEmbedFormId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    if (!newName.trim() || !newSlug.trim()) return
    setCreating(true)
    await createForm(newName.trim(), newSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"))
    setCreating(false)
    setShowNew(false)
    setNewName("")
    setNewSlug("")
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Slett formuläret "${name}"?`)) return
    await deleteForm(id)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-dark text-xl font-bold">Skjemaer</h2>
          <p className="text-muted text-xs mt-1">{forms.length} skjema{forms.length !== 1 ? "er" : ""}</p>
        </div>
        <Button size="sm" onClick={() => setShowNew(!showNew)}>
          {showNew ? "Avbryt" : "+ Nytt skjema"}
        </Button>
      </div>

      {showNew && (
        <div className="flex gap-3 mb-5 p-4 bg-background rounded-lg border-2 border-border">
          <input
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value)
              setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9æøå]/g, "-").replace(/-+/g, "-"))
            }}
            placeholder="Skjemanavn"
            className="flex-1 border-2 border-border rounded-md px-3 py-2 text-sm outline-none focus:border-teal"
          />
          <input
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            placeholder="slug"
            className="w-40 border-2 border-border rounded-md px-3 py-2 text-sm outline-none focus:border-teal font-mono"
          />
          <Button size="sm" onClick={handleCreate} disabled={creating}>
            {creating ? "Oppretter..." : "Opprett"}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {forms.map((form) => (
          <div key={form.id} className="flex flex-col gap-0">
            <div className="flex items-center justify-between p-4 border-2 border-border rounded-lg hover:border-teal/30 transition-colors">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-dark">{form.name}</span>
                    <Badge variant={form.status === "published" ? "success" : "default"}>
                      {form.status === "published" ? "Publisert" : "Utkast"}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted font-mono">/{form.slug}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {form.status === "published" && (
                  <button
                    onClick={() => {
                      setEmbedFormId(embedFormId === form.id ? null : form.id)
                      setCopied(false)
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-dark bg-orange/10 border-2 border-orange/20 rounded-md hover:bg-orange/20 transition-colors cursor-pointer"
                  >
                    {embedFormId === form.id ? "Skjul kode" : "Innbygg"}
                  </button>
                )}
                <a
                  href={`/admin/forms/${form.id}`}
                  className="px-3 py-1.5 text-xs font-semibold text-dark bg-teal/10 border-2 border-teal/20 rounded-md hover:bg-teal/20 transition-colors no-underline"
                >
                  Rediger
                </a>
                <button
                  onClick={() => handleDelete(form.id, form.name)}
                  className="px-3 py-1.5 text-xs font-semibold text-error hover:bg-error/10 rounded-md transition-colors cursor-pointer"
                >
                  Slett
                </button>
              </div>
            </div>

            {/* Inbäddningskod */}
            {embedFormId === form.id && (
              <div className="p-4 bg-background border-2 border-border rounded-lg mt-1">
                <h4 className="text-sm font-bold text-dark mb-3">Innbyggingskode</h4>

                {/* Primär: iframe (fungerar i WordPress utan problem) */}
                <div className="mb-4">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider mb-1 block">
                    iframe (anbefalt for WordPress)
                  </label>
                  <p className="text-xs text-muted mb-2">
                    Lim inn i en &quot;Egendefinert HTML&quot;-blokk i WordPress. Høyden tilpasses automatisk.
                  </p>
                  <div className="relative">
                    <pre className="bg-dark text-white/80 rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap">
{`<iframe
  id="serwent-iframe"
  src="${siteUrl}/embed/${form.slug}"
  width="100%"
  frameborder="0"
  title="Bestillingsskjema"
  style="border: none; border-radius: 8px; min-height: 400px;"
></iframe>
<script>
window.addEventListener('message', function(e) {
  try {
    var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    if (d.type === 'serwent-resize' && d.height) {
      document.getElementById('serwent-iframe').style.height = d.height + 'px';
    }
  } catch(ex) {}
});
</script>`}
                    </pre>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
`<iframe\n  id="serwent-iframe"\n  src="${siteUrl}/embed/${form.slug}"\n  width="100%"\n  frameborder="0"\n  title="Bestillingsskjema"\n  style="border: none; border-radius: 8px; min-height: 400px;"\n></iframe>\n<script>\nwindow.addEventListener('message', function(e) {\n  try {\n    var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;\n    if (d.type === 'serwent-resize' && d.height) {\n      document.getElementById('serwent-iframe').style.height = d.height + 'px';\n    }\n  } catch(ex) {}\n});\n</script>`
                        )
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                      className="absolute top-2 right-2 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors cursor-pointer"
                    >
                      {copied ? "Kopiert!" : "Kopier"}
                    </button>
                  </div>
                </div>

                {/* Sekundär: JavaScript-snippet */}
                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider mb-1 block">
                    JavaScript (alternativ — dynamisk høyde)
                  </label>
                  <p className="text-xs text-muted mb-2">
                    OBS: WordPress kan fjerne script-tagger. Bruk iframe ovenfor i stedet.
                  </p>
                  <pre className="bg-dark text-white/80 rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap">
{`<div id="serwent-form" data-form="${form.slug}"></div>
<script src="${siteUrl}/api/embed/script"></script>`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
