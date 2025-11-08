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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

const BarChart = ({ data = [], title = "Crime Statistics", type = "status" }) => {
  let chartData = { labels: [], datasets: [] }
  
  if (type === "status") {
    // Group by status
    const statusCounts = {}
    data.forEach(report => {
      const status = report.status || 'Unknown'
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })
    
    chartData = {
      labels: Object.keys(statusCounts),
      datasets: [{
        label: 'Number of Reports',
        data: Object.values(statusCounts),
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',   // Red - Pending
          'rgba(245, 158, 11, 0.8)',  // Amber - In Progress
          'rgba(59, 130, 246, 0.8)',  // Blue - Dispatched
          'rgba(16, 185, 129, 0.8)',  // Green - Resolved
          'rgba(107, 114, 128, 0.8)', // Gray - Unknown
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(107, 114, 128, 1)',
        ],
        borderWidth: 2,
      }]
    }
  } else if (type === "severity") {
    // Group by severity
    const severityCounts = {}
    data.forEach(report => {
      const severity = report.severity || 'Unknown'
      severityCounts[severity] = (severityCounts[severity] || 0) + 1
    })
    
    chartData = {
      labels: Object.keys(severityCounts),
      datasets: [{
        label: 'Number of Reports',
        data: Object.values(severityCounts),
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',  // Green - Low
          'rgba(245, 158, 11, 0.8)',  // Amber - Moderate
          'rgba(251, 146, 60, 0.8)',  // Orange - High
          'rgba(239, 68, 68, 0.8)',   // Red - Immediate
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(251, 146, 60, 1)',
          'rgba(239, 68, 68, 1)',
        ],
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
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
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

