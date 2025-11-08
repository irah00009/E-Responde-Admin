import React from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'
import { Pie } from 'react-chartjs-2'
import { buildPalette, buildBorderPalette } from './chartColors'

ChartJS.register(ArcElement, Tooltip, Legend)

const PieChart = ({ data = [], title = "Crime Type Distribution" }) => {
  // Process data to get crime type counts
  const crimeTypeCounts = {}
  
  data.forEach(report => {
    const rawType = report.crimeType || report.type || report.crime_type
    if (!rawType) {
      return
    }
    const crimeType = String(rawType).trim()
    if (!crimeType || crimeType.toLowerCase() === 'unknown') {
      return
    }
    crimeTypeCounts[crimeType] = (crimeTypeCounts[crimeType] || 0) + 1
  })

  const labels = Object.keys(crimeTypeCounts)
  const values = Object.values(crimeTypeCounts)

  const backgroundColors = buildPalette(labels.length, 0.9)
  const borderColors = buildBorderPalette(labels.length)

  const chartData = {
    labels: labels.length > 0 ? labels : ['No Data'],
    datasets: [
      {
        label: 'Number of Reports',
        data: values.length > 0 ? values : [0],
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
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
            const label = context.label || ''
            const value = context.parsed || 0
            const total = context.dataset.data.reduce((a, b) => a + b, 0)
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
            return `${label}: ${value} (${percentage}%)`
          }
        }
      }
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1000
    }
  }

  if (labels.length === 0) {
    return (
      <div className="w-full bg-white rounded-lg shadow-lg p-4">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
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
        <Pie data={chartData} options={options} />
      </div>
    </div>
  )
}

export default PieChart

