"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  STATUS_LABELS,
  STATUS_COLORS,
  ORDER_STATUSES,
  type OrderStatus,
} from "@/lib/constants"
import type { Order } from "@/types/database"
import { normalizeAnleggsType } from "@/lib/anleggstype"

type ViewMode = "table" | "kanban" | "list"

type OrderMessage = {
  id: string
  channel: string
  recipient: string
  subject: string | null
  body: string
  status: string
  created_at: string
}

interface AdminPanelProps {
  initialOrders: Order[]
  kommuner: string[]
}

export function AdminPanel({ initialOrders, kommuner }: AdminPanelProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [filter, setFilter] = useState<OrderStatus | "alle">("alle")
  const [kommuneFilter, setKommuneFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [search, setSearch] = useState("")
  const [exportLoading, setExportLoading] = useState(false)
  const [view, setView] = useState<ViewMode>("table")
  const [dragId, setDragId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderMessages, setOrderMessages] = useState<OrderMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  const refreshOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders/submit", { method: "GET" })
      if (res.ok) {
        const data = await res.json()
        if (data.orders) setOrders(data.orders)
      }
    } catch {
      // Silently fail
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(refreshOrders, 30000)
    return () => clearInterval(interval)
  }, [refreshOrders])

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    )
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) refreshOrders()
    } catch {
      refreshOrders()
    }
  }

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const res = await fetch("/api/orders/export")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Serwent_Bestillinger_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert("Kunne ikke eksportere. Prøv igjen.")
    }
    setExportLoading(false)
  }

  const openOrderDetail = async (order: Order) => {
    setSelectedOrder(order)
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/orders/${order.id}/messages`)
      if (res.ok) {
        const data = await res.json()
        setOrderMessages(data.messages || [])
      } else {
        setOrderMessages([])
      }
    } catch {
      setOrderMessages([])
    }
    setLoadingMessages(false)
  }

  const getOrderType = (order: Order): string => {
    const year = new Date(order.created_at).getFullYear()

    // Manuelt flagg fra submit-routens deteksjon (tidligere Comtech-tømming
    // eller "ekstra"-tømming valgt i skjemaet).
    if (order.er_ekstra) return "Ekstra"

    if (!order.gnr || !order.bnr) return "Ordinaer"

    // Normaliser anleggstype så olika typer (t.ex. Lukket tank vs Slamavskiller)
    // på samma adress inte räknas som ekstra av varandra.
    const denneGruppen = normalizeAnleggsType(order.tomming_type)

    const earlier = orders.filter(
      (o) =>
        o.id !== order.id &&
        o.gnr === order.gnr &&
        o.bnr === order.bnr &&
        o.kommune === order.kommune &&
        normalizeAnleggsType(o.tomming_type) === denneGruppen &&
        new Date(o.created_at).getFullYear() === year &&
        o.created_at < order.created_at
    )

    if (earlier.length === 0) return "Ordinaer"
    return `Ekstra (${earlier.length})`
  }

  const stats = {
    ny: orders.filter((o) => o.status === "ny").length,
    under_behandling: orders.filter((o) => o.status === "under_behandling").length,
    utfort: orders.filter((o) => o.status === "utfort").length,
  }

  const filtered = orders.filter((o) => {
    const matchFilter = filter === "alle" || o.status === filter
    const matchKommune = !kommuneFilter || o.kommune === kommuneFilter
    const orderType = getOrderType(o)
    const matchType = !typeFilter ||
      (typeFilter === "ordinaer" && orderType === "Ordinaer") ||
      (typeFilter === "ekstra" && orderType.startsWith("Ekstra"))
    const s = search.toLowerCase()
    const matchSearch =
      !s ||
      [o.navn, o.kommune, o.adresse, o.order_id, o.epost].some((v) =>
        v?.toLowerCase().includes(s)
      )
    return matchFilter && matchKommune && matchType && matchSearch
  })

  const statusBadgeVariant = (status: OrderStatus) => {
    if (status === "ny") return "error" as const
    if (status === "under_behandling") return "warning" as const
    return "success" as const
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleString("nb-NO", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })

  // Drag and drop handlers for kanban
  const handleDragStart = (orderId: string) => {
    setDragId(orderId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, status: OrderStatus) => {
    e.preventDefault()
    if (dragId) {
      handleStatusChange(dragId, status)
      setDragId(null)
    }
  }

  return (
    <div>
      {/* Top bar */}
      <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-heading text-dark text-xl font-bold">
            Bestillinger
          </h2>
          <p className="text-muted text-xs mt-1">
            {orders.length} bestilling{orders.length !== 1 ? "er" : ""} totalt
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* View toggle */}
          <div className="flex bg-[#f1f5f9] rounded-lg p-0.5">
            {(
              [
                ["table", "Tabell", TableIcon],
                ["kanban", "Kanban", KanbanIcon],
                ["list", "Liste", ListIcon],
              ] as const
            ).map(([mode, label, Icon]) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                title={label}
                className={`
                  px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer
                  ${view === mode
                    ? "bg-white text-dark shadow-sm"
                    : "text-muted hover:text-dark"
                  }
                `}
              >
                <Icon />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <Button
            variant="dark"
            size="sm"
            onClick={handleExport}
            disabled={exportLoading}
          >
            {exportLoading ? "Eksporterer..." : "Eksporter CSV"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {(
          [
            ["ny", stats.ny],
            ["under_behandling", stats.under_behandling],
            ["utfort", stats.utfort],
          ] as const
        ).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setFilter(filter === status ? "alle" : status)}
            className={`
              rounded-xl p-4 border-[1.5px] cursor-pointer transition-all text-left
              ${
                filter === status
                  ? "bg-opacity-10 border-current"
                  : "bg-[#f8fafc] border-[#e2e8f0] hover:border-[#d0d8e4]"
              }
            `}
            style={{
              borderColor: filter === status ? STATUS_COLORS[status] : undefined,
              backgroundColor:
                filter === status ? STATUS_COLORS[status] + "18" : undefined,
            }}
          >
            <div
              className="text-2xl font-bold font-heading"
              style={{ color: STATUS_COLORS[status] }}
            >
              {count}
            </div>
            <div className="text-xs text-muted font-semibold uppercase tracking-wider">
              {STATUS_LABELS[status]}
            </div>
          </button>
        ))}
      </div>

      {/* Søk */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Søk på namn, kommune, adresse, ID..."
        className="w-full border-[1.5px] border-border rounded-lg px-3.5 py-2.5 text-sm mb-4 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all"
      />

      {/* Views */}
      {view === "table" ? (
        <TableView
          orders={filtered}
          getOrderType={getOrderType}
          handleStatusChange={handleStatusChange}
          onOrderClick={openOrderDetail}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          kommuneFilter={kommuneFilter}
          onKommuneFilterChange={setKommuneFilter}
          kommuner={kommuner}
        />
      ) : view === "kanban" ? (
        <KanbanView
          orders={filtered}
          getOrderType={getOrderType}
          handleStatusChange={handleStatusChange}
          formatDate={formatDate}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onOrderClick={openOrderDetail}
        />
      ) : (
        <ListView
          orders={filtered}
          getOrderType={getOrderType}
          handleStatusChange={handleStatusChange}
          formatDate={formatDate}
          statusBadgeVariant={statusBadgeVariant}
          onOrderClick={openOrderDetail}
        />
      )}

      {/* CoLead sync indicator */}
      {orders.some((o) => o.colead_synced) && (
        <div className="mt-5 px-4 py-3 bg-[#eff6ff] border-[1.5px] border-[#bfdbfe] rounded-lg text-xs text-info">
          <strong>CoLead:</strong>{" "}
          {orders.filter((o) => o.colead_synced).length} av {orders.length}{" "}
          bestillinger er synkronisert med CoLead.
        </div>
      )}

      {/* Orderdetalj slide-over */}
      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          messages={orderMessages}
          loadingMessages={loadingMessages}
          getOrderType={getOrderType}
          onStatusChange={(status) => {
            handleStatusChange(selectedOrder.id, status)
            setSelectedOrder({ ...selectedOrder, status })
          }}
          onClose={() => setSelectedOrder(null)}
          onMessageSent={() => openOrderDetail(selectedOrder)}
          onInternalCommentSaved={(comment) => {
            setSelectedOrder({ ...selectedOrder, intern_kommentar: comment || null })
            setOrders((prev) => prev.map((o) => o.id === selectedOrder.id ? { ...o, intern_kommentar: comment || null } : o))
          }}
          onDelete={async () => {
            if (!confirm("Er du sikker på at du vil slette denne bestillingen?")) return
            const { deleteOrder } = await import("@/actions/orders")
            const result = await deleteOrder(selectedOrder.id)
            if (result.success) {
              setOrders((prev) => prev.filter((o) => o.id !== selectedOrder.id))
              setSelectedOrder(null)
            } else {
              alert(result.error || "Kunne ikke slette")
            }
          }}
        />
      )}
    </div>
  )
}

/* ───────── Icons ───────── */

function TableIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="14" height="14" rx="2" />
      <line x1="1" y1="5.5" x2="15" y2="5.5" />
      <line x1="1" y1="10" x2="15" y2="10" />
      <line x1="6" y1="5.5" x2="6" y2="15" />
      <line x1="11" y1="5.5" x2="11" y2="15" />
    </svg>
  )
}

function KanbanIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="4" height="14" rx="1" />
      <rect x="6" y="1" width="4" height="10" rx="1" />
      <rect x="11" y="1" width="4" height="7" rx="1" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="5" y1="3" x2="14" y2="3" />
      <line x1="5" y1="8" x2="14" y2="8" />
      <line x1="5" y1="13" x2="14" y2="13" />
      <circle cx="2" cy="3" r="1" fill="currentColor" stroke="none" />
      <circle cx="2" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="2" cy="13" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/* ───────── Table View ───────── */

function TableView({
  orders,
  getOrderType,
  handleStatusChange,
  onOrderClick,
  typeFilter,
  onTypeFilterChange,
  kommuneFilter,
  onKommuneFilterChange,
  kommuner,
}: {
  orders: Order[]
  getOrderType: (o: Order) => string
  handleStatusChange: (id: string, status: OrderStatus) => void
  onOrderClick: (o: Order) => void
  typeFilter: string
  onTypeFilterChange: (v: string) => void
  kommuneFilter: string
  onKommuneFilterChange: (v: string) => void
  kommuner: string[]
}) {
  const thClass = "px-3 py-2.5 text-white font-semibold text-left text-xs uppercase tracking-wider whitespace-nowrap"
  const filterSelectClass = "bg-white/15 text-white text-xs font-semibold rounded px-1.5 py-1 border border-white/30 cursor-pointer outline-none [&>option]:text-dark [&>option]:bg-white"

  return (
    <div className="overflow-x-auto -mx-6">
      <table className="w-full text-sm min-w-[800px]">
        <thead>
          <tr className="bg-dark">
            <th className={thClass}>Dato</th>
            <th className={thClass}>
              <select
                value={typeFilter}
                onChange={(e) => onTypeFilterChange(e.target.value)}
                className={filterSelectClass}
              >
                <option value="">Type ▾</option>
                <option value="ordinaer">Ordinaer</option>
                <option value="ekstra">Ekstra</option>
              </select>
            </th>
            <th className={thClass}>
              <select
                value={kommuneFilter}
                onChange={(e) => onKommuneFilterChange(e.target.value)}
                className={filterSelectClass}
              >
                <option value="">Kommune ▾</option>
                {kommuner.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </th>
            <th className={thClass}>Tømming</th>
            <th className={thClass}>m³</th>
            <th className={thClass}>Navn</th>
            <th className={thClass}>Tlf</th>
            <th className={thClass}>Adresse</th>
            <th className={thClass}>Status</th>
            <th className={thClass}>Kommentar</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={10} className="text-center text-muted py-10 text-sm">
                Ingen bestillinger funnet
              </td>
            </tr>
          ) : orders.map((o, i) => (
            <tr
              key={o.id}
              onClick={() => onOrderClick(o)}
              className={`${i % 2 === 0 ? "bg-[#f8fafc]" : "bg-white"} border-b border-[#edf2f7] cursor-pointer hover:bg-teal/5 transition-colors`}
            >
              <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground text-xs">
                {new Date(o.created_at).toLocaleString("nb-NO")}
              </td>
              <td className="px-3 py-2.5">
                <Badge variant={getOrderType(o).startsWith("Ekstra") ? "warning" : "success"}>
                  {getOrderType(o)}
                </Badge>
              </td>
              <td className="px-3 py-2.5 font-semibold text-dark">{o.kommune}</td>
              <td
                className="px-3 py-2.5 text-foreground max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap"
                title={o.tomming_type}
              >
                {o.tomming_type}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground text-xs">
                {o.tank_storrelse_m3 != null ? `${o.tank_storrelse_m3}` : "–"}
              </td>
              <td className="px-3 py-2.5 font-medium">{o.navn}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{o.telefon}</td>
              <td className="px-3 py-2.5 text-muted-foreground">
                {o.adresse}
                {o.gnr ? ` (${o.gnr}/${o.bnr})` : ""}
              </td>
              <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                <select
                  value={o.status}
                  onChange={(e) => handleStatusChange(o.id, e.target.value as OrderStatus)}
                  className="text-xs font-bold rounded px-2 py-1 border-[1.5px] cursor-pointer"
                  style={{
                    backgroundColor: STATUS_COLORS[o.status as OrderStatus] + "18",
                    borderColor: STATUS_COLORS[o.status as OrderStatus],
                    color: STATUS_COLORS[o.status as OrderStatus],
                  }}
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </td>
              <td
                className="px-3 py-2.5 text-muted-foreground text-xs max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap"
                title={o.kommentar || ""}
              >
                {o.kommentar || "–"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ───────── Kanban View ───────── */

function KanbanView({
  orders,
  getOrderType,
  handleStatusChange,
  formatDate,
  onDragStart,
  onDragOver,
  onDrop,
  onOrderClick,
}: {
  orders: Order[]
  getOrderType: (o: Order) => string
  handleStatusChange: (id: string, status: OrderStatus) => void
  formatDate: (d: string) => string
  onDragStart: (id: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, status: OrderStatus) => void
  onOrderClick: (o: Order) => void
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 -mx-2">
      {ORDER_STATUSES.map((status) => {
        const columnOrders = orders.filter((o) => o.status === status)
        return (
          <div
            key={status}
            className="flex flex-col min-h-[200px]"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, status)}
          >
            {/* Column header */}
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-t-xl"
              style={{ backgroundColor: STATUS_COLORS[status] + "15" }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[status] }}
              />
              <span className="text-sm font-bold text-dark">
                {STATUS_LABELS[status]}
              </span>
              <span
                className="ml-auto text-xs font-bold rounded-full px-2 py-0.5"
                style={{
                  backgroundColor: STATUS_COLORS[status] + "20",
                  color: STATUS_COLORS[status],
                }}
              >
                {columnOrders.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 bg-[#f8fafc] rounded-b-xl border border-t-0 border-[#e2e8f0] p-2 flex flex-col gap-2">
              {columnOrders.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted text-xs py-8">
                  Ingen bestillinger
                </div>
              ) : (
                columnOrders.map((o) => (
                  <div
                    key={o.id}
                    draggable
                    onDragStart={() => onDragStart(o.id)}
                    className="bg-white rounded-lg border border-[#e2e8f0] p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
                    onClick={() => onOrderClick(o)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-[10px] text-muted">
                        {o.order_id}
                      </span>
                      <Badge variant={getOrderType(o).startsWith("Ekstra") ? "warning" : "success"}>
                        {getOrderType(o)}
                      </Badge>
                    </div>
                    <div className="font-semibold text-dark text-sm mb-1">
                      {o.navn}
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {o.kommune} — {o.tomming_type}
                    </div>
                    <div className="text-xs text-muted truncate mb-2">
                      {o.adresse}
                      {o.gnr ? ` (${o.gnr}/${o.bnr})` : ""}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-muted">
                        {formatDate(o.created_at)}
                      </span>
                      <select
                        value={o.status}
                        onChange={(e) =>
                          handleStatusChange(o.id, e.target.value as OrderStatus)
                        }
                        className="text-[10px] font-bold rounded px-1.5 py-0.5 border cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{
                          backgroundColor: STATUS_COLORS[o.status as OrderStatus] + "18",
                          borderColor: STATUS_COLORS[o.status as OrderStatus],
                          color: STATUS_COLORS[o.status as OrderStatus],
                        }}
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ───────── List View ───────── */

function ListView({
  orders,
  getOrderType,
  handleStatusChange,
  formatDate,
  statusBadgeVariant,
  onOrderClick,
}: {
  orders: Order[]
  getOrderType: (o: Order) => string
  handleStatusChange: (id: string, status: OrderStatus) => void
  formatDate: (d: string) => string
  statusBadgeVariant: (s: OrderStatus) => "error" | "warning" | "success"
  onOrderClick: (o: Order) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {orders.length === 0 && (
        <div className="text-center text-muted py-10 text-sm">
          Ingen bestillinger funnet
        </div>
      )}
      {orders.map((o) => (
        <div
          key={o.id}
          onClick={() => onOrderClick(o)}
          className="bg-white border border-[#e2e8f0] rounded-lg px-4 py-3 flex items-center gap-4 hover:shadow-sm transition-shadow cursor-pointer hover:bg-teal/5"
        >
          {/* Status dot */}
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: STATUS_COLORS[o.status as OrderStatus] }}
            title={STATUS_LABELS[o.status as OrderStatus]}
          />

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-dark text-sm">{o.navn}</span>
              <Badge variant={statusBadgeVariant(o.status as OrderStatus)}>
                {STATUS_LABELS[o.status as OrderStatus]}
              </Badge>
              <Badge variant={getOrderType(o).startsWith("Ekstra") ? "warning" : "success"}>
                {getOrderType(o)}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono text-[10px] text-muted">{o.order_id}</span>
              <span>{o.kommune}</span>
              <span className="truncate max-w-[200px]" title={o.tomming_type}>
                {o.tomming_type}
              </span>
            </div>
          </div>

          {/* Contact */}
          <div className="hidden lg:flex flex-col items-end text-xs text-muted-foreground shrink-0">
            <span>{o.telefon}</span>
            <span className="truncate max-w-[200px]">
              {o.adresse}{o.gnr ? ` (${o.gnr}/${o.bnr})` : ""}
            </span>
          </div>

          {/* Date */}
          <div className="text-xs text-muted shrink-0 w-[70px] text-right">
            {formatDate(o.created_at)}
          </div>

          {/* Status change */}
          <select
            value={o.status}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => handleStatusChange(o.id, e.target.value as OrderStatus)}
            className="text-xs font-bold rounded px-2 py-1 border-[1.5px] cursor-pointer shrink-0"
            style={{
              backgroundColor: STATUS_COLORS[o.status as OrderStatus] + "18",
              borderColor: STATUS_COLORS[o.status as OrderStatus],
              color: STATUS_COLORS[o.status as OrderStatus],
            }}
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}

/* ───────── Order Detail Slide-over ───────── */

function OrderDetail({
  order,
  messages,
  loadingMessages,
  getOrderType,
  onStatusChange,
  onClose,
  onMessageSent,
  onDelete,
  onInternalCommentSaved,
}: {
  order: Order
  messages: OrderMessage[]
  loadingMessages: boolean
  getOrderType: (o: Order) => string
  onStatusChange: (status: OrderStatus) => void
  onClose: () => void
  onMessageSent: () => void
  onDelete: () => void
  onInternalCommentSaved: (comment: string) => void
}) {
  const [showSendForm, setShowSendForm] = useState(false)
  const [sendChannel, setSendChannel] = useState<"email" | "sms">("email")
  const [sendSubject, setSendSubject] = useState("")
  const [sendBody, setSendBody] = useState("")
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState("")
  const [resending, setResending] = useState(false)
  const [resendResult, setResendResult] = useState("")
  const [internKommentar, setInternKommentar] = useState(order.intern_kommentar || "")
  const [savingComment, setSavingComment] = useState(false)
  const [commentSaved, setCommentSaved] = useState(false)

  useEffect(() => {
    setInternKommentar(order.intern_kommentar || "")
  }, [order.id, order.intern_kommentar])

  async function handleSaveInternalComment() {
    setSavingComment(true)
    setCommentSaved(false)
    try {
      const { updateInternalComment } = await import("@/actions/orders")
      const result = await updateInternalComment(order.id, internKommentar)
      if (result.success) {
        setCommentSaved(true)
        onInternalCommentSaved(internKommentar)
        setTimeout(() => setCommentSaved(false), 2000)
      }
    } catch {
      // Feil vid lagring
    }
    setSavingComment(false)
  }

  async function handleResendNotifications() {
    setResending(true)
    setResendResult("")
    try {
      const { resendOrderNotifications } = await import("@/actions/messages")
      const result = await resendOrderNotifications(order.id)
      setResendResult(result.details || "Sendt")
      onMessageSent()
    } catch {
      setResendResult("En uventet feil oppstod")
    }
    setResending(false)
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!sendBody.trim()) return

    setSending(true)
    setSendError("")

    try {
      const { sendDirectMessage } = await import("@/actions/messages")
      const result = await sendDirectMessage({
        orderId: order.id,
        channel: sendChannel,
        subject: sendChannel === "email" ? sendSubject : undefined,
        body: sendBody,
      })

      if ("success" in result && result.success) {
        setSendBody("")
        setSendSubject("")
        setShowSendForm(false)
        onMessageSent()
      } else {
        setSendError(result.error || "Kunne ikke sende melding")
      }
    } catch {
      setSendError("En uventet feil oppstod")
    }

    setSending(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-dark">{order.navn}</h2>
            <span className="text-xs font-mono text-muted">{order.order_id}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f1f5f9] transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="4" x2="12" y2="12" />
              <line x1="12" y1="4" x2="4" y2="12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Status & type */}
          <div className="flex items-center gap-3">
            <select
              value={order.status}
              onChange={(e) => onStatusChange(e.target.value as OrderStatus)}
              className="text-sm font-bold rounded-lg px-3 py-1.5 border-[1.5px] cursor-pointer"
              style={{
                backgroundColor: STATUS_COLORS[order.status as OrderStatus] + "18",
                borderColor: STATUS_COLORS[order.status as OrderStatus],
                color: STATUS_COLORS[order.status as OrderStatus],
              }}
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <Badge variant={getOrderType(order).startsWith("Ekstra") ? "warning" : "success"}>
              {getOrderType(order)}
            </Badge>
            {order.colead_synced && (
              <Badge variant="info">CoLead synkronisert</Badge>
            )}
          </div>

          {/* Bestillingsinfo */}
          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Bestillingsdetaljer</h3>
            <div className="grid grid-cols-2 gap-3">
              <DetailField label="Kommune" value={order.kommune} />
              <DetailField label="Type tømming" value={order.tomming_type} />
              <DetailField label="Adresse" value={order.adresse} />
              <DetailField label="Gnr/Bnr" value={order.gnr && order.bnr ? `${order.gnr}/${order.bnr}` : "–"} />
              <DetailField label="Tankstørrelse" value={order.tank_storrelse_m3 != null ? `${order.tank_storrelse_m3} m³` : "–"} />
              {order.planlagt_dato && (
                <DetailField label="Planlagt tømming" value={new Date(order.planlagt_dato).toLocaleDateString("nb-NO")} />
              )}
              <DetailField label="Opprettet" value={new Date(order.created_at).toLocaleString("nb-NO")} />
              <DetailField label="Oppdatert" value={new Date(order.updated_at).toLocaleString("nb-NO")} />
            </div>
          </div>

          {/* Kontaktinfo */}
          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Kontaktinformasjon</h3>
            <div className="grid grid-cols-2 gap-3">
              <DetailField label="Navn" value={order.navn} />
              <DetailField label="Telefon" value={order.telefon} href={`tel:${order.telefon}`} />
              <DetailField label="E-post" value={order.epost} href={`mailto:${order.epost}`} />
            </div>
          </div>

          {/* Kommentar */}
          {order.kommentar && (
            <div>
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Kommentar</h3>
              <div className="bg-[#f8fafc] border border-border rounded-lg p-3 text-sm text-dark whitespace-pre-wrap">
                {order.kommentar}
              </div>
            </div>
          )}

          {/* Intern kommentar (kun synlig i admin) */}
          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Intern kommentar</h3>
            <textarea
              value={internKommentar}
              onChange={(e) => { setInternKommentar(e.target.value); setCommentSaved(false) }}
              placeholder="Skriv en intern kommentar (kun synlig for admin)..."
              rows={3}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-teal resize-none"
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleSaveInternalComment}
                disabled={savingComment || internKommentar === (order.intern_kommentar || "")}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-dark text-white hover:bg-dark/90 disabled:opacity-50 cursor-pointer transition-all"
              >
                {savingComment ? "Lagrer..." : "Lagre kommentar"}
              </button>
              {commentSaved && (
                <span className="text-xs text-success font-medium">Lagret!</span>
              )}
            </div>
          </div>

          {/* Kjør automasjoner på nytt */}
          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Handlinger</h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleResendNotifications}
                disabled={resending}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-dark text-white hover:bg-dark/90 disabled:opacity-50 cursor-pointer transition-all"
              >
                {resending ? "Sender..." : "Send bekreftelse på nytt"}
              </button>
              {!showSendForm && (
                <button
                  onClick={() => setShowSendForm(true)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold border border-border text-dark hover:bg-[#f1f5f9] cursor-pointer transition-all"
                >
                  Skriv fri melding
                </button>
              )}
              <button
                onClick={onDelete}
                className="px-4 py-2 rounded-lg text-xs font-semibold border border-error/30 text-error hover:bg-error/5 cursor-pointer transition-all"
              >
                Slett bestilling
              </button>
            </div>
            {resendResult && (
              <p className="text-xs text-muted mt-2">{resendResult}</p>
            )}
          </div>

          {/* Send fri melding manuelt */}
          {showSendForm && (
            <div>
              <form onSubmit={handleSendMessage} className="bg-[#f8fafc] border border-border rounded-lg p-4 space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSendChannel("email")}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                      sendChannel === "email"
                        ? "bg-dark text-white"
                        : "bg-white border border-border text-muted hover:text-dark"
                    }`}
                  >
                    E-post
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendChannel("sms")}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                      sendChannel === "sms"
                        ? "bg-dark text-white"
                        : "bg-white border border-border text-muted hover:text-dark"
                    }`}
                  >
                    SMS
                  </button>
                </div>
                <p className="text-xs text-muted">
                  Til: {sendChannel === "email" ? order.epost : order.telefon}
                </p>
                {sendChannel === "email" && (
                  <input
                    type="text"
                    placeholder="Emne"
                    value={sendSubject}
                    onChange={(e) => setSendSubject(e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-teal"
                  />
                )}
                <textarea
                  placeholder={sendChannel === "email" ? "Skriv meldingen..." : "Skriv SMS-melding..."}
                  value={sendBody}
                  onChange={(e) => setSendBody(e.target.value)}
                  rows={4}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-teal resize-none"
                />
                {sendChannel === "sms" && (
                  <p className="text-[10px] text-muted">{sendBody.length}/160 tegn</p>
                )}
                {sendError && <p className="text-xs text-error">{sendError}</p>}
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowSendForm(false); setSendError("") }}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold text-muted hover:text-dark cursor-pointer"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    disabled={sending || !sendBody.trim()}
                    className="px-4 py-1.5 rounded-md text-xs font-semibold bg-teal text-white hover:bg-teal/90 disabled:opacity-50 cursor-pointer"
                  >
                    {sending ? "Sender..." : "Send"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Meldingshistorikk */}
          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Meldinger {!loadingMessages && `(${messages.length})`}
            </h3>
            {loadingMessages ? (
              <p className="text-sm text-muted">Laster meldinger...</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted">Ingen meldinger sendt for denne bestillingen.</p>
            ) : (
              <div className="space-y-2">
                {messages.map((msg) => (
                  <div key={msg.id} className="bg-[#f8fafc] border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant={msg.channel === "sms" ? "info" : "default"}>
                        {msg.channel === "sms" ? "SMS" : "E-post"}
                      </Badge>
                      <Badge variant={msg.status === "sent" ? "success" : "error"}>
                        {msg.status === "sent" ? "Sendt" : "Feilet"}
                      </Badge>
                      <span className="text-[10px] text-muted ml-auto">
                        {new Date(msg.created_at).toLocaleString("nb-NO")}
                      </span>
                    </div>
                    <p className="text-xs text-muted mb-1">Til: {msg.recipient}</p>
                    {msg.subject && (
                      <p className="text-xs font-medium text-dark mb-1">Emne: {msg.subject}</p>
                    )}
                    <div className="text-xs text-dark whitespace-pre-wrap mt-1 border-t border-border pt-2">
                      {msg.body}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function DetailField({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">{label}</dt>
      <dd className="text-sm text-dark">
        {href ? (
          <a href={href} className="text-teal hover:underline">{value}</a>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}
