import React, { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import { format, parseISO } from 'date-fns'

const ThreatTimeline = ({ data, width = 1000, height = 400 }) => {
  const svgRef = useRef(null)
  const [brushRange, setBrushRange] = useState(null)

  useEffect(() => {
    if (!data?.length) return

    const margin = { top: 20, right: 30, bottom: 30, left: 40 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove()

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // Parse dates
    const parsedData = data.map(d => ({
      ...d,
      date: parseISO(d.timestamp)
    }))

    // Scales
    const x = d3.scaleTime()
      .domain(d3.extent(parsedData, d => d.date))
      .range([0, innerWidth])

    const y = d3.scaleLinear()
      .domain([0, d3.max(parsedData, d => d.severity)])
      .range([innerHeight, 0])

    const colorScale = d3.scaleOrdinal()
      .domain(['critical', 'high', 'medium', 'low'])
      .range(['#dc2626', '#ea580c', '#ca8a04', '#2563eb'])

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5))
      .attr("color", "#6b7280")

    g.append("g")
      .call(d3.axisLeft(y))
      .attr("color", "#6b7280")

    // Add grid lines
    g.append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(d3.axisLeft(y)
        .tickSize(-innerWidth)
        .tickFormat("")
      )

    // Voronoi for hover interactions
    const delaunay = d3.Delaunay.from(parsedData, d => x(d.date), d => y(d.severity))
    const voronoi = delaunay.voronoi([0, 0, innerWidth, innerHeight])

    // Draw data points
    const circles = g.selectAll("circle")
      .data(parsedData)
      .join("circle")
      .attr("cx", d => x(d.date))
      .attr("cy", d => y(d.severity))
      .attr("r", d => d.impact * 3 + 5)
      .attr("fill", d => colorScale(d.severity_level))
      .attr("opacity", 0.7)
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")

    // Add Voronoi overlay for better hover
    g.append("g")
      .selectAll("path")
      .data(parsedData)
      .join("path")
      .attr("d", (d, i) => voronoi.renderCell(i))
      .attr("fill", "transparent")
      .on("mouseover", function(event, d) {
        d3.select(circles.nodes()[parsedData.indexOf(d)])
          .attr("r", d.impact * 3 + 8)
          .attr("opacity", 1)
        
        tooltip.style("opacity", 1)
          .html(`
            <div class="font-semibold">${d.title}</div>
            <div class="text-sm text-gray-600">${format(d.date, 'MMM dd, yyyy HH:mm')}</div>
            <div class="text-sm mt-1">Severity: <span class="font-bold" style="color: ${colorScale(d.severity_level)}">${d.severity}/100</span></div>
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
      })
      .on("mouseout", function(event, d) {
        d3.select(circles.nodes()[parsedData.indexOf(d)])
          .attr("r", d.impact * 3 + 5)
          .attr("opacity", 0.7)
        
        tooltip.style("opacity", 0)
      })

    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "absolute bg-white p-3 rounded-lg shadow-lg border border-gray-200 pointer-events-none opacity-0 transition-opacity")
      .style("z-index", 1000)

    // Brush for time range selection
    const brush = d3.brushX()
      .extent([[0, 0], [innerWidth, innerHeight]])
      .on("end", brushed)

    g.append("g")
      .call(brush)

    function brushed({selection}) {
      if (selection) {
        const [x0, x1] = selection.map(x.invert)
        setBrushRange([x0, x1])
      } else {
        setBrushRange(null)
      }
    }

    // Cleanup
    return () => {
      tooltip.remove()
    }
  }, [data, width, height])

  return (
    <div className="relative">
      <svg ref={svgRef} className="w-full" />
      
      {brushRange && (
        <div className="absolute top-2 left-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
          Selected: {format(brushRange[0], 'MMM dd')} - {format(brushRange[1], 'MMM dd')}
          <button 
            onClick={() => setBrushRange(null)}
            className="ml-2 text-blue-600 hover:text-blue-800"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

export default ThreatTimeline
