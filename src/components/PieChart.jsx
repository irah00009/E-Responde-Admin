import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'
import { Pie, getElementAtEvent } from 'react-chartjs-2'
import { buildPalette, buildBorderPalette } from './chartColors'

ChartJS.register(ArcElement, Tooltip, Legend)

const PieChart = ({ data = [], title = "Crime Type Distribution" }) => {
  const crimeTypeCounts = {}
  const crimeTypeDetails = {}
  const chartRef = useRef(null)
  const modalChartRef = useRef(null)
  const modalChartContainerRef = useRef(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalActiveIndex, setModalActiveIndex] = useState(null)

  const forceChartResize = useCallback(() => {
    const mainChart = chartRef.current
    if (mainChart?.resize) {
      mainChart.resize()
    }
    const modalChart = modalChartRef.current
    if (modalChart?.resize) {
      modalChart.resize()
      modalChart.update()
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      requestAnimationFrame(forceChartResize)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [forceChartResize])

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
    if (!crimeTypeDetails[crimeType]) {
      crimeTypeDetails[crimeType] = []
    }
    crimeTypeDetails[crimeType].push(report)
  })

  const labels = Object.keys(crimeTypeCounts)
  const values = Object.values(crimeTypeCounts)
  const totalReports = useMemo(() => values.reduce((sum, value) => sum + value, 0), [values])

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

  const handleSliceClick = (event) => {
    const chart = chartRef.current
    if (!chart) {
      return
    }
    const elements = getElementAtEvent(chart, event)
    if (!elements || elements.length === 0) {
      return
    }
    setModalActiveIndex(null)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setModalActiveIndex(null)
  }

  const modalChartData = useMemo(() => {
    if (!isModalOpen) {
      return null
    }
    const fadedColor = 'rgba(148, 163, 184, 0.25)'
    const modalBackgroundColors = typeof modalActiveIndex === 'number'
      ? backgroundColors.map((color, index) =>
          index === modalActiveIndex ? color : fadedColor
        )
      : backgroundColors
    const modalBorderColors = typeof modalActiveIndex === 'number'
      ? borderColors.map((color, index) =>
          index === modalActiveIndex ? color : fadedColor
        )
      : borderColors
    return {
      labels: chartData.labels,
      datasets: [
        {
          ...chartData.datasets[0],
          backgroundColor: modalBackgroundColors,
          borderColor: modalBorderColors
        }
      ]
    }
  }, [backgroundColors, borderColors, chartData.datasets, chartData.labels, isModalOpen, modalActiveIndex])

  const modalOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
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
      tooltip: {
        enabled: false
      }
    }
  }), [])

  const selectSliceByIndex = (index) => {
    if (!labels.length) {
      return
    }
    const safeIndex = ((index % labels.length) + labels.length) % labels.length
    setModalActiveIndex(safeIndex)
  }

  const handlePrevSlice = () => {
    if (!labels.length) {
      return
    }
    if (typeof modalActiveIndex === 'number') {
      selectSliceByIndex(modalActiveIndex - 1)
    } else {
      selectSliceByIndex(labels.length - 1)
    }
  }

  const handleNextSlice = () => {
    if (!labels.length) {
      return
    }
    if (typeof modalActiveIndex === 'number') {
      selectSliceByIndex(modalActiveIndex + 1)
    } else {
      selectSliceByIndex(0)
    }
  }

  const handleModalSliceClick = (event) => {
    const chart = modalChartRef.current
    if (!chart) {
      return
    }
    const elements = getElementAtEvent(chart, event)
    if (!elements || elements.length === 0) {
      return
    }
    const { index } = elements[0]
    setModalActiveIndex(index)
  }

  const modalActiveDetails = useMemo(() => {
    if (typeof modalActiveIndex !== 'number') {
      return null
    }
    const label = labels[modalActiveIndex]
    if (!label) {
      return null
    }
    const sliceValue = values[modalActiveIndex] || 0
    return {
      label,
      value: sliceValue,
      color: backgroundColors[modalActiveIndex],
      percentage: totalReports > 0 ? ((sliceValue / totalReports) * 100).toFixed(1) : '0.0',
      reports: crimeTypeDetails[label] || []
    }
  }, [backgroundColors, crimeTypeDetails, labels, modalActiveIndex, totalReports, values])

  const sortedCrimeTypes = useMemo(() => {
    return labels
      .map((label, index) => ({
        label,
        value: values[index] || 0,
        color: backgroundColors[index],
        percentage: totalReports > 0 ? ((values[index] / totalReports) * 100).toFixed(1) : '0.0'
      }))
      .sort((a, b) => b.value - a.value)
  }, [backgroundColors, labels, totalReports, values])

  const hasModalSelection = Boolean(modalActiveDetails)
  const chartFlexClass = hasModalSelection ? 'flex-[1.1]' : 'flex-[1.2]'
  const detailsWrapperClass = hasModalSelection
    ? 'flex-[1.45] min-h-0 overflow-y-auto pr-1'
    : 'flex-[1.3] min-h-0 overflow-y-auto pr-1'

  const pieWrapperStyle = useMemo(() => ({
    maxWidth: hasModalSelection ? 'clamp(18rem, 46vw, 34rem)' : 'clamp(16rem, 42vw, 30rem)',
    width: '100%',
    margin: '0 auto',
    aspectRatio: '1 / 1'
  }), [hasModalSelection])

  useEffect(() => {
    if (isModalOpen) {
      requestAnimationFrame(forceChartResize)
    }
  }, [forceChartResize, isModalOpen])

  useEffect(() => {
    if (!isModalOpen || !modalChartContainerRef.current || typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(forceChartResize)
    })

    observer.observe(modalChartContainerRef.current)

    return () => observer.disconnect()
  }, [forceChartResize, isModalOpen])

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return '—'
    }
    try {
      const date = new Date(dateValue)
      if (Number.isNaN(date.getTime())) {
        return String(dateValue)
      }
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return String(dateValue)
    }
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
        <Pie
          ref={chartRef}
          data={chartData}
          options={options}
          onClick={handleSliceClick}
        />
      </div>
      {isModalOpen && modalChartData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-4 py-8 sm:px-6 lg:px-10"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeModal()
            }
          }}
        >
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-[90vw] xl:max-w-[100rem] relative flex flex-col max-h-[92vh] min-h-[70vh] overflow-y-auto overflow-x-hidden">
            <button
              type="button"
              className="absolute top-5 right-6 text-gray-400 hover:text-gray-600 text-4xl leading-none"
              onClick={closeModal}
            >
              ×
            </button>
            <div className={`flex flex-col ${hasModalSelection ? 'lg:flex-row' : 'xl:flex-row'} gap-10 xl:gap-16 h-full overflow-hidden p-8 sm:p-10 lg:p-12 xl:p-14`}>
              <div className={detailsWrapperClass}>
                <h3 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold text-gray-900 mb-6 xl:mb-8">
                  {modalActiveDetails ? modalActiveDetails.label : title}
                </h3>
                <p className="text-lg sm:text-xl xl:text-2xl text-gray-500 mb-6 xl:mb-8 leading-relaxed">
                  {modalActiveDetails ? `Breakdown within ${title}` : 'Tap any section in the chart to view detailed reports.'}
                </p>
                <div className="space-y-6 xl:space-y-8">
                  {modalActiveDetails ? (
                    <>
                      <div className="flex items-center gap-5">
                        <span
                          className="inline-block w-6 h-6 rounded-full"
                          style={{ backgroundColor: modalActiveDetails.color }}
                        />
                        <span className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                          {modalActiveDetails.value} reports
                        </span>
                      </div>
                      <p className="text-lg sm:text-xl xl:text-2xl text-gray-600">
                        Share of total reports: <span className="font-semibold text-gray-900">{modalActiveDetails.percentage}%</span>
                      </p>
                      <p className="text-lg sm:text-xl xl:text-2xl text-gray-600">
                        Total reports analysed: <span className="font-semibold text-gray-900">{totalReports}</span>
                      </p>
                      {modalActiveDetails.reports.length > 0 ? (
                        <div className="border border-gray-200 rounded-3xl divide-y divide-gray-100 max-h-[32rem] xl:max-h-[36rem] overflow-y-auto">
                          {modalActiveDetails.reports.map((report, index) => (
                            <div key={`${report.id || report.reportId || index}-${index}`} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-base sm:text-lg font-semibold uppercase tracking-wide text-gray-500">
                                  {report.status || 'Status Unknown'}
                                </span>
                                <span className="text-sm sm:text-base text-gray-400">
                                  {formatDate(report.date || report.createdAt || report.reportedAt)}
                                </span>
                              </div>
                              <p className="text-lg sm:text-xl text-gray-900 font-semibold mb-3">
                                {report.description || 'No description provided.'}
                              </p>
                              <p className="text-base sm:text-lg text-gray-500">
                                Location: <span className="font-semibold text-gray-700">{report.location || 'Not specified'}</span>
                              </p>
                              {report.severity && (
                                <p className="text-base sm:text-lg text-gray-500 mt-1">
                                  Severity: <span className="font-semibold text-gray-700">{report.severity}</span>
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-lg sm:text-xl xl:text-2xl text-gray-500">No detailed reports available for this category.</p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-lg sm:text-xl xl:text-2xl text-gray-500 space-y-4">
                        <p>Select a slice to see the underlying reports.</p>
                        <p>Total reports analysed: <span className="font-semibold text-gray-900">{totalReports}</span></p>
                      </div>
                      {sortedCrimeTypes.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-base sm:text-lg font-semibold text-gray-600 uppercase tracking-wide">
                            Top crime categories
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sortedCrimeTypes.slice(0, 6).map(({ label, value, color, percentage }) => (
                              <div key={label} className="rounded-2xl border border-gray-200 bg-gray-50 p-5 flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <span
                                      className="inline-flex h-3 w-3 rounded-full"
                                      style={{ backgroundColor: color }}
                                    />
                                    <span className="font-semibold text-gray-900 text-base sm:text-lg">
                                      {label}
                                    </span>
                                  </div>
                                  <span className="text-sm sm:text-base font-medium text-gray-500">
                                    {percentage}%
                                  </span>
                                </div>
                                <div className="text-sm sm:text-base text-gray-600">
                                  {value} reports
                                </div>
                                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${Math.min(Number(percentage), 100)}%`,
                                      backgroundColor: color
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className={`${chartFlexClass} min-h-0 flex flex-col`}>
                <div className="flex-1 min-h-0 flex items-center justify-center">
                  <div
                    ref={modalChartContainerRef}
                    className="w-full"
                    style={pieWrapperStyle}
                  >
                    <Pie
                      ref={modalChartRef}
                      data={modalChartData}
                      options={modalOptions}
                      onClick={handleModalSliceClick}
                    />
                  </div>
                </div>
                {labels.length > 1 && (
                  <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-8 xl:pt-12">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center px-8 sm:px-10 py-4 sm:py-5 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-lg sm:text-xl xl:text-2xl hover:bg-gray-200 transition-colors duration-150"
                      onClick={(event) => {
                        event.stopPropagation()
                        handlePrevSlice()
                      }}
                    >
                      ← Previous
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center px-8 sm:px-10 py-4 sm:py-5 rounded-2xl bg-gray-900 text-white font-semibold text-lg sm:text-xl xl:text-2xl hover:bg-gray-800 transition-colors duration-150"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleNextSlice()
                      }}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PieChart

