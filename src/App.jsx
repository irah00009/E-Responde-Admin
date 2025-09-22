import { useState } from 'react'
import './App.css'

// Dashboard Component
function Dashboard({ onNavigateToReport }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Sample data for recent submissions
  const recentSubmissions = [
    {
      id: 1,
      type: "Theft",
      description: "Vehicle break-in reported in downtown area",
      location: "123 Main St, Downtown",
      date: "2024-01-15",
      status: "Under Review"
    },
    {
      id: 2,
      type: "Assault",
      description: "Physical altercation at local bar",
      location: "456 Oak Ave, Westside",
      date: "2024-01-14",
      status: "Resolved"
    },
    {
      id: 3,
      type: "Vandalism",
      description: "Graffiti found on public property",
      location: "789 Pine Rd, Eastside",
      date: "2024-01-13",
      status: "Under Review"
    },
    {
      id: 4,
      type: "Traffic Violation",
      description: "Speeding and reckless driving",
      location: "321 Elm St, Northside",
      date: "2024-01-12",
      status: "Resolved"
    },
    {
      id: 5,
      type: "Noise Complaint",
      description: "Excessive noise from residential property",
      location: "654 Maple Dr, Southside",
      date: "2024-01-11",
      status: "Under Review"
    },
    {
      id: 6,
      type: "Suspicious Activity",
      description: "Unusual behavior in neighborhood",
      location: "987 Cedar Ln, Central",
      date: "2024-01-10",
      status: "Resolved"
    }
  ];

  const totalPages = Math.ceil(recentSubmissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSubmissions = recentSubmissions.slice(startIndex, endIndex);

  const getStatusColor = (status) => {
    return status === "Resolved" ? "status-resolved" : "status-pending";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="page-content">
      <h1>Police Dashboard</h1>
      
      {/* Report Overview Section */}
      <section className="dashboard-section">
        <h2>Report Overview</h2>
        <div className="dashboard-grid">
          <div className="card">
            <h3>Active Incidents</h3>
            <p className="stat">10</p>
          </div>
          <div className="card">
            <h3>Pending Reports</h3>
            <p className="stat">5</p>
          </div>
          <div className="card">
            <h3>Resolved Reports</h3>
            <p className="stat">25</p>
          </div>
          <div className="card">
            <h3>Registered Users</h3>
            <p className="stat">150</p>
          </div>
        </div>
      </section>

      {/* Recent Submissions Section */}
      <section className="dashboard-section">
        <h2>Recent Submissions</h2>
        <div className="table-container">
          <table className="submissions-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th>Location</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentSubmissions.map((submission) => (
                <tr key={submission.id}>
                  <td>{submission.type}</td>
                  <td>{submission.description}</td>
                  <td>{submission.location}</td>
                  <td>{formatDate(submission.date)}</td>
                  <td>
                    <span className={`status-badge ${getStatusColor(submission.status)}`}>
                      {submission.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-view" 
                        onClick={() => onNavigateToReport(submission.id)}
                      >
                        View
                      </button>
                      <button className="btn-update">Update</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="pagination">
          <button 
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            className="pagination-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  )
}

// Analytics Component
function Analytics() {
  return (
    <div className="page-content">
      <h1>Analytics</h1>
      <div className="analytics-content">
        <div className="chart-placeholder">
          <h3>User Engagement Chart</h3>
          <div className="chart">
            <div className="bar" style={{ height: '60%' }}></div>
            <div className="bar" style={{ height: '80%' }}></div>
            <div className="bar" style={{ height: '45%' }}></div>
            <div className="bar" style={{ height: '90%' }}></div>
            <div className="bar" style={{ height: '70%' }}></div>
            <div className="bar" style={{ height: '85%' }}></div>
            <div className="bar" style={{ height: '55%' }}></div>
          </div>
        </div>
        <div className="metrics">
          <div className="metric-card">
            <h4>Page Views</h4>
            <p>12,345</p>
          </div>
          <div className="metric-card">
            <h4>Bounce Rate</h4>
            <p>23.4%</p>
          </div>
          <div className="metric-card">
            <h4>Session Duration</h4>
            <p>4m 32s</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// View Report Component
function ViewReport() {
  const reportData = {
    reportId: "RPT-2024-001",
    type: "Theft",
    dateReported: "2024-01-15",
    location: "123 Main St, Downtown, City",
    reportedBy: {
      name: "John Smith",
      phone: "+1 (555) 123-4567",
      email: "john.smith@email.com"
    },
    description: "Vehicle break-in reported in downtown area. The suspect broke into a parked car and stole personal belongings including a laptop and wallet. The incident occurred between 2:00 AM and 4:00 AM. Security camera footage shows a male suspect wearing dark clothing.",
    status: "Under Review"
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="page-content">
      <div className="report-header">
        <h1>View Report</h1>
        <div className="report-id">Report ID: {reportData.reportId}</div>
      </div>
      
      <div className="report-layout">
        {/* Main Report Content */}
        <div className="report-main">
          <div className="report-section">
            <h2>Report Details</h2>
            <div className="report-grid">
              <div className="detail-item">
                <label>Type:</label>
                <span>{reportData.type}</span>
              </div>
              <div className="detail-item">
                <label>Date Reported:</label>
                <span>{formatDate(reportData.dateReported)}</span>
              </div>
              <div className="detail-item">
                <label>Location:</label>
                <span>{reportData.location}</span>
              </div>
              <div className="detail-item">
                <label>Status:</label>
                <span className="status-badge status-pending">{reportData.status}</span>
              </div>
            </div>
          </div>

          <div className="report-section">
            <h2>Reported By</h2>
            <div className="reporter-info">
              <div className="detail-item">
                <label>Name:</label>
                <span>{reportData.reportedBy.name}</span>
              </div>
              <div className="detail-item">
                <label>Phone:</label>
                <span>{reportData.reportedBy.phone}</span>
              </div>
              <div className="detail-item">
                <label>Email:</label>
                <span>{reportData.reportedBy.email}</span>
              </div>
            </div>
          </div>

          <div className="report-section">
            <h2>Description</h2>
            <div className="description-content">
              <p>{reportData.description}</p>
            </div>
          </div>

          <div className="report-section">
            <h2>Location Map</h2>
            <div className="map-placeholder">
              <div className="map-content">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <p>Map showing report location</p>
                <small>123 Main St, Downtown, City</small>
              </div>
            </div>
          </div>

          <div className="report-section">
            <h2>Evidence Photos</h2>
            <div className="evidence-grid">
              <div className="evidence-placeholder">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21,15 16,10 5,21"></polyline>
                </svg>
                <span>Photo 1</span>
              </div>
              <div className="evidence-placeholder">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21,15 16,10 5,21"></polyline>
                </svg>
                <span>Photo 2</span>
              </div>
              <div className="evidence-placeholder">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21,15 16,10 5,21"></polyline>
                </svg>
                <span>Photo 3</span>
              </div>
            </div>
          </div>

          <div className="report-actions">
            <button className="btn-cancel">Cancel</button>
            <button className="btn-update-report">Update Report</button>
          </div>
        </div>

        {/* AI Response Recommendations Panel */}
        <div className="ai-recommendations">
          <h2>AI Response Recommendations</h2>
          <div className="recommendations-list">
            <div className="recommendation-card">
              <div className="recommendation-header">
                <span className="recommendation-type">Priority</span>
                <span className="recommendation-score">95%</span>
              </div>
              <h3>Immediate Response Required</h3>
              <p>This theft incident involves personal property and should be prioritized for immediate investigation. Recommend dispatching patrol unit within 30 minutes.</p>
            </div>
            
            <div className="recommendation-card">
              <div className="recommendation-header">
                <span className="recommendation-type">Investigation</span>
                <span className="recommendation-score">87%</span>
              </div>
              <h3>Evidence Collection Strategy</h3>
              <p>Security camera footage mentioned in description. Recommend collecting and analyzing CCTV recordings from nearby businesses for suspect identification.</p>
            </div>
            
            <div className="recommendation-card">
              <div className="recommendation-header">
                <span className="recommendation-type">Follow-up</span>
                <span className="recommendation-score">78%</span>
              </div>
              <h3>Witness Interview Protocol</h3>
              <p>Contact the reporting individual for additional details about the stolen items and any suspicious activity noticed before the incident.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')

  const handleNavigateToReport = (reportId) => {
    setCurrentPage('view-report');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigateToReport={handleNavigateToReport} />
      case 'analytics':
        return <Analytics />
      case 'view-report':
        return <ViewReport />
      default:
        return <Dashboard onNavigateToReport={handleNavigateToReport} />
    }
  }

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>E-Responde</h2>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentPage('dashboard')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            Dashboard
          </button>
          <button 
            className={`nav-item ${currentPage === 'analytics' ? 'active' : ''}`}
            onClick={() => setCurrentPage('analytics')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18"></path>
              <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path>
            </svg>
            Analytics
          </button>
          <button 
            className={`nav-item ${currentPage === 'view-report' ? 'active' : ''}`}
            onClick={() => setCurrentPage('view-report')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10,9 9,9 8,9"></polyline>
            </svg>
            View Report
          </button>
        </nav>
      </div>
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  )
}

export default App
