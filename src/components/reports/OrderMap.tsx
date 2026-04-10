"use client"

import { useEffect, useRef } from "react"
import type { Map as LeafletMap } from "leaflet"

interface MapPoint {
  lat: number
  lng: number
  label: string
  status: string
}

interface OrderMapProps {
  points: MapPoint[]
}

export function OrderMap({ points }: OrderMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<LeafletMap | null>(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Rensa eventuell tidigare karta
    if (leafletMapRef.current) {
      leafletMapRef.current.remove()
      leafletMapRef.current = null
    }

    // Dynamisk import av Leaflet (kräver window)
    import("leaflet").then((L) => {
      if (!mapRef.current) return
      // Injicera CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link")
        link.id = "leaflet-css"
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)
      }

      const map = L.map(mapRef.current!, {
        center: [60.8, 10.5], // Innlandet/Gjøvik-området
        zoom: 8,
        zoomControl: true,
        attributionControl: false,
      })

      // Mörkt karttema (matchar Serwent-designen)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 18,
      }).addTo(map)

      // Aggregera nära punkter (0.01° ≈ 1km)
      const clusters = new Map<string, { lat: number; lng: number; count: number; labels: string[]; statuses: string[] }>()

      for (const p of points) {
        const key = `${Math.round(p.lat * 100) / 100},${Math.round(p.lng * 100) / 100}`
        const existing = clusters.get(key)
        if (existing) {
          existing.count++
          if (!existing.labels.includes(p.label)) existing.labels.push(p.label)
          existing.statuses.push(p.status)
        } else {
          clusters.set(key, {
            lat: p.lat,
            lng: p.lng,
            count: 1,
            labels: [p.label],
            statuses: [p.status],
          })
        }
      }

      const maxCount = Math.max(...Array.from(clusters.values()).map(c => c.count), 1)

      for (const cluster of clusters.values()) {
        const hasUtfort = cluster.statuses.includes("utfort")
        const radius = 6 + (cluster.count / maxCount) * 24

        L.circleMarker([cluster.lat, cluster.lng], {
          radius,
          fillColor: hasUtfort ? "#22c55e" : "#45b7a9",
          fillOpacity: 0.6,
          color: hasUtfort ? "#15803d" : "#1B3A6B",
          weight: 1.5,
        })
          .bindPopup(`
            <div style="font-family: system-ui; font-size: 13px; line-height: 1.5;">
              <strong>${cluster.labels.slice(0, 3).join(", ")}${cluster.labels.length > 3 ? "..." : ""}</strong><br>
              <span style="color: #888">${cluster.count} bestilling${cluster.count > 1 ? "er" : ""}</span>
            </div>
          `)
          .addTo(map)
      }

      // Zoom till alla punkter
      if (clusters.size > 0) {
        const bounds = L.latLngBounds(Array.from(clusters.values()).map(c => [c.lat, c.lng] as [number, number]))
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 })
      }

      leafletMapRef.current = map
    })

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
    }
  }, [points])

  return <div ref={mapRef} className="w-full h-full rounded-lg" />
}
