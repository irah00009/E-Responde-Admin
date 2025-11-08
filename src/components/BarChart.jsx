import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { buildPalette, buildBorderPalette } from './chartColors'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

const toTitleCase = (value) => value
  .toLowerCase()
  .replace(/\b\w/g, char => char.toUpperCase())

const isUnknownOrEmpty = (value) => {
  if (value === null || value === undefined) {
    return true
  }
  const normalized = String(value).trim()
  return normalized.length === 0 || normalized.toLowerCase() === 'unknown'
}

const incrementCount = (value, map) => {
  const raw = String(value).trim()
  const key = raw.toLowerCase()
  const formatted = toTitleCase(raw)

  if (map.has(key)) {
    map.get(key).count += 1
  } else {
    map.set(key, { label: formatted, count: 1 })
  }
}

const BarChart = ({ data = [], title = "Crime Statistics", type = "status" }) => {
  let chartData = { labels: [], datasets: [] }
  
  if (type === "status") {
    // Group by status
    const statusCounts = new Map()
    data.forEach(report => {
      if (isUnknownOrEmpty(report.status)) {
        return
      }
      incrementCount(report.status, statusCounts)
    })
    
    const labels = Array.from(statusCounts.values()).map(item => item.label)
    chartData = {
      labels,
      datasets: [{
        label: 'Number of Reports',
        data: Array.from(statusCounts.values()).map(item => item.count),
        backgroundColor: buildPalette(labels.length, 0.9),
        borderColor: buildBorderPalette(labels.length),
        borderWidth: 2,
      }]
    }
  } else if (type === "severity") {
    // Group by severity
    const severityCounts = new Map()
    data.forEach(report => {
      if (isUnknownOrEmpty(report.severity)) {
        return
      }
      incrementCount(report.severity, severityCounts)
    })
    
    const labels = Array.from(severityCounts.values()).map(item => item.label)
    chartData = {
      labels,
      datasets: [{
        label: 'Number of Reports',
        data: Array.from(severityCounts.values()).map(item => item.count),
        backgroundColor: buildPalette(labels.length, 0.9),
        borderColor: buildBorderPalette(labels.length),
        borderWidth: 2,
      }]
    }
  } else if (type === "monthly") {
    // Group by month
    const monthlyCounts = {}
    data.forEach(report => {
      const dateStr = report.dateTime || report.createdAt || report.timestamp || report.date
      if (!dateStr) return
      
      try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return
        
        const month = date.toLocaleString('default', { month: 'short', year: 'numeric' })
        monthlyCounts[month] = (monthlyCounts[month] || 0) + 1
      } catch (e) {
        return
      }
    })
    
    // Sort by date
    const sortedMonths = Object.keys(monthlyCounts).sort((a, b) => {
      return new Date(a) - new Date(b)
    })
    
    chartData = {
      labels: sortedMonths,
      datasets: [{
        label: 'Number of Reports',
        data: sortedMonths.map(month => monthlyCounts[month]),
        backgroundColor: buildPalette(sortedMonths.length, 0.9),
        borderColor: buildBorderPalette(sortedMonths.length),
        borderWidth: 2,
      }]
    }
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: type !== "monthly",
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: '500'
          }
        }
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 30
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label || ''}: ${context.parsed.y}`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          callback: function(value) {
            return Number.isInteger(value) ? value : null
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: type === "monthly" ? 45 : 0,
          minRotation: type === "monthly" ? 45 : 0
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    }
  }

  if (chartData.labels.length === 0) {
    return (
      <div className="w-full bg-white rounded-lg shadow-lg p-4">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-500 mb-2">No Data Available</h3>
            <p className="text-sm text-gray-400">No crime reports found to display.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-4">
      <div className="h-96">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  )
}

export default BarChart

