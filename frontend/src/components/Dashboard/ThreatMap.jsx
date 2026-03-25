import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const ThreatMap = ({ data }) => {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Initialize map
    mapInstance.current = L.map(mapRef.current).setView([20, 0], 2)

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(mapInstance.current)

    // Custom icon for threats
    const threatIcon = L.divIcon({
      className: 'custom-threat-marker',
      html: `<div class="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    })

    // Add markers
    data.forEach((threat) => {
      if (threat.lat && threat.lng) {
        const marker = L.marker([threat.lat, threat.lng], { icon: threatIcon })
          .addTo(mapInstance.current)
        
        marker.bindPopup(`
          <div class="p-2">
            <h3 class="font-bold text-sm">${threat.country}</h3>
            <p class="text-xs text-gray-600">Threats: ${threat.count}</p>
            <p class="text-xs text-gray-600">Top: ${threat.topThreat}</p>
          </div>
        `)
      }
    })

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
      }
    }
  }, [data])

  return <div ref={mapRef} className="w-full h-full rounded-lg" />
}

export default ThreatMap
