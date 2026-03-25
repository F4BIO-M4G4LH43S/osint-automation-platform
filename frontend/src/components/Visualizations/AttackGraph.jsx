import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useTheme } from '../../contexts/ThemeContext'

const AttackGraph = ({ data, width = 800, height = 600 }) => {
  const svgRef = useRef(null)
  const { theme } = useTheme()
  const [selectedNode, setSelectedNode] = useState(null)

  useEffect(() => {
    if (!data || !svgRef.current) return

    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove()

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])

    // Add zoom behavior
    const g = svg.append("g")
    
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform)
      })
    
    svg.call(zoom)

    // Force simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => (d.radius || 20) + 5))

    // Create arrow markers for directed edges
    svg.append("defs").selectAll("marker")
      .data(["end"])
      .enter().append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", theme.colors.textSecondary)

    // Draw links
    const link = g.append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke", d => {
        const colors = {
          'exploit': theme.colors.critical,
          'lateral': theme.colors.warning,
          'access': theme.colors.info,
          'default': theme.colors.border
        }
        return colors[d.type] || colors.default
      })
      .attr("stroke-width", d => d.value || 1)
      .attr("stroke-opacity", 0.6)
      .attr("marker-end", "url(#arrow)")

    // Draw nodes
    const node = g.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))
      .on("click", (event, d) => setSelectedNode(d))

    // Node circles with different colors based on type
    node.append("circle")
      .attr("r", d => d.radius || 20)
      .attr("fill", d => {
        const colors = {
          'target': theme.colors.critical,
          'asset': theme.colors.warning,
          'service': theme.colors.info,
          'vulnerability': theme.colors.secondary,
          'default': theme.colors.primary
        }
        return colors[d.type] || colors.default
      })
      .attr("stroke", theme.colors.surface)
      .attr("stroke-width", 2)
      .style("cursor", "pointer")

    // Node icons/labels
    node.append("text")
      .attr("dy", 5)
      .attr("text-anchor", "middle")
      .text(d => d.icon || d.id.substring(0, 2))
      .attr("fill", "white")
      .style("font-size", "12px")
      .style("pointer-events", "none")

    // Node labels
    node.append("text")
      .attr("dy", d => (d.radius || 20) + 15)
      .attr("text-anchor", "middle")
      .text(d => d.label || d.id)
      .attr("fill", theme.colors.text)
      .style("font-size", "11px")
      .style("font-weight", "500")

    // Simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)

      node.attr("transform", d => `translate(${d.x},${d.y})`)
    })

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event, d) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

    return () => simulation.stop()
  }, [data, theme, width, height])

  return (
    <div className="relative">
      <svg 
        ref={svgRef} 
        className="bg-surface rounded-lg border border-border"
        style={{ maxWidth: '100%' }}
      />
      
      {/* Node Details Panel */}
      {selectedNode && (
        <div className="absolute top-4 right-4 w-64 bg-surface p-4 rounded-lg shadow-lg border border-border">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-text">{selectedNode.label}</h3>
            <button 
              onClick={() => setSelectedNode(null)}
              className="text-textSecondary hover:text-text"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-textSecondary">Type:</span>
              <span className="capitalize text-text">{selectedNode.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textSecondary">Risk Score:</span>
              <span className={`font-medium ${
                selectedNode.risk > 70 ? 'text-critical' :
                selectedNode.risk > 40 ? 'text-warning' : 'text-success'
              }`}>
                {selectedNode.risk}/100
              </span>
            </div>
            {selectedNode.cve && (
              <div className="flex justify-between">
                <span className="text-textSecondary">CVE:</span>
                <span className="text-critical">{selectedNode.cve}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border">
            <button className="w-full py-2 bg-primary text-white rounded-md text-sm hover:opacity-90">
              Investigate
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-surface p-3 rounded-lg shadow-md border border-border">
        <h4 className="text-xs font-semibold text-textSecondary mb-2">LEGEND</h4>
        <div className="space-y-1 text-xs">
          <LegendItem color={theme.colors.critical} label="Critical Target" />
          <LegendItem color={theme.colors.warning} label="Asset" />
          <LegendItem color={theme.colors.info} label="Service" />
          <LegendItem color={theme.colors.secondary} label="Vulnerability" />
        </div>
      </div>
    </div>
  )
}

const LegendItem = ({ color, label }) => (
  <div className="flex items-center gap-2">
    <div className="w-3 h-3 rounded-full" style={{ background: color }} />
    <span className="text-text">{label}</span>
  </div>
)

export default AttackGraph
