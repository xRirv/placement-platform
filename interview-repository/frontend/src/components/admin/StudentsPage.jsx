import { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, Edit2, Trash2, Eye, X, Save, Upload } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import './AdminStyles.css';

export const StudentsPage = ({ user, session, userProfile }) => {
  const [students, setStudents] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('2028');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentExperiences, setStudentExperiences] = useState([]);
  const [loadingExperiences, setLoadingExperiences] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    email: '',
    password: '',
    phone: '',
    college: userProfile?.college || '',
    degree: '',
    graduationYear: '',
    skills: '',
  });
  const [batchFile, setBatchFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  useEffect(() => {
    fetchBatchCounts();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      fetchStudents();
    }
  }, [selectedBatch]);

  const fetchBatchCounts = async () => {
    setLoadingBatches(true);
    try {
      // Fetch all students to count by graduation year
      const res = await fetch(
        `${backendUrl}/api/admin/management/students?size=10000`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const allStudents = data.content || [];

        // Group students by graduation year
        const yearCounts = {};
        allStudents.forEach(student => {
          const year = student.graduationYear || 'Unknown';
          yearCounts[year] = (yearCounts[year] || 0) + 1;
        });

        // Convert to batch array format
        const batchData = Object.entries(yearCounts)
          .filter(([year]) => year !== 'Unknown')
          .map(([year, count]) => ({ year: String(year), count }))
          .sort((a, b) => b.year.localeCompare(a.year)); // Sort descending

        setBatches(batchData);

        // Set first batch as selected
        if (batchData.length > 0) {
          setSelectedBatch(batchData[0].year);
        }
      }
    } catch (error) {
      console.error('Failed to fetch batch counts:', error);
    } finally {
      setLoadingBatches(false);
    }
  };

  const fetchStudents = async () => {
    if (!selectedBatch) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${backendUrl}/api/admin/management/students?size=10000`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        // Filter by selected batch
        const filtered = (data.content || []).filter(
          s => String(s.graduationYear) === String(selectedBatch)
        );
        setStudents(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelectStudent = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const getRiskLevel = (student) => {
    // Mock risk calculation - replace with actual logic
    const expCount = student.interviewExperiencesCount || 0;
    if (expCount === 0) return 'low';
    if (expCount < 5) return 'medium';
    return 'low';
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const res = await fetch(`${backendUrl}/api/admin/management/students`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          graduationYear: formData.graduationYear ? parseInt(formData.graduationYear) : null,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setMessage(`✅ Student created successfully!
          • Name: ${result.name}
          • Roll Number: ${result.rollNumber}
          • Email: ${result.email}
          • College: ${result.college}
          • Created in both Supabase Auth and Database!`);
        setShowAddModal(false);
        setFormData({
          name: '',
          rollNumber: '',
          email: '',
          password: '',
          phone: '',
          college: userProfile?.college || '',
          degree: '',
          graduationYear: '',
          skills: '',
        });
        fetchBatchCounts();
        fetchStudents();
        setTimeout(() => setMessage(''), 5000);
      } else {
        let errorMessage = 'Failed to create student';

        try {
          const errorText = await res.text();

          // Check for specific error patterns
          if (errorText.includes('email_exists') || errorText.includes('email address has already been registered')) {
            errorMessage = `❌ Email Already Registered!\n\nThe email "${formData.email}" is already registered in the system.\n\nPlease use a different email address.`;
          } else if (errorText.includes('duplicate key') && errorText.includes('email')) {
            errorMessage = `❌ Email Already Exists!\n\nThe email "${formData.email}" already exists in the database.\n\nPlease use a different email address.`;
          } else if (errorText.includes('duplicate key') && errorText.includes('roll_number')) {
            errorMessage = `❌ Roll Number Already Exists!\n\nThe roll number "${formData.rollNumber}" is already assigned to another student.\n\nPlease use a different roll number.`;
          } else if (res.status === 401) {
            errorMessage = '❌ Unauthorized!\n\nYour session may have expired. Please log out and log in again.';
          } else if (res.status === 403) {
            errorMessage = '❌ Access Denied!\n\nYou do not have permission to create students.';
          } else {
            // Try to parse JSON error
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = `❌ Error: ${errorJson.message || errorJson.error || errorText}`;
            } catch {
              errorMessage = `❌ Error: ${errorText.substring(0, 200)}`;
            }
          }
        } catch (parseError) {
          errorMessage = `❌ Error: HTTP ${res.status} - ${res.statusText}`;
        }

        setMessage(errorMessage);
        setTimeout(() => setMessage(''), 8000);
      }
    } catch (error) {
      setMessage(`❌ Network Error: ${error.message}\n\nPlease check your internet connection and try again.`);
      setTimeout(() => setMessage(''), 8000);
    } finally {
      setUploading(false);
    }
  };

  const handleBatchUpload = async () => {
    if (!batchFile) {
      setMessage('⚠️ Please select an Excel file (.xlsx)');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setUploading(true);
    setMessage('⏳ Uploading and creating students in Supabase Auth + Database...');

    const formDataUpload = new FormData();
    formDataUpload.append('file', batchFile);

    try {
      const res = await fetch(`${backendUrl}/api/admin/management/students/batch-upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formDataUpload,
      });

      if (res.ok) {
        const result = await res.json();
        setMessage(`✅ Batch Upload Complete!

          Successfully Created: ${result.successCount} students
          Failed: ${result.failureCount} students

          All successful students are now in:
          • Supabase Auth ✓
          • Database ✓

          ${result.failureCount > 0 ? '\n⚠️ Check console for failed entries (likely duplicate emails)' : ''}`);
        setShowBatchModal(false);
        setBatchFile(null);
        fetchBatchCounts();
        fetchStudents();
        setTimeout(() => setMessage(''), 7000);
      } else {
        let errorMessage = 'Batch upload failed';
        try {
          const errorText = await res.text();
          if (errorText.includes('email_exists')) {
            errorMessage = '❌ One or more emails already exist in Supabase Auth.\n\nPlease ensure all emails in the Excel file are unique and not already registered.';
          } else {
            errorMessage = `❌ Upload Error: ${errorText.substring(0, 200)}`;
          }
        } catch {
          errorMessage = `❌ Error: HTTP ${res.status}`;
        }
        setMessage(errorMessage);
        setTimeout(() => setMessage(''), 8000);
      }
    } catch (error) {
      setMessage(`❌ Network Error: ${error.message}`);
      setTimeout(() => setMessage(''), 8000);
    } finally {
      setUploading(false);
    }
  };

  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setFormData({
      name: student.name || '',
      rollNumber: student.rollNumber || '',
      email: student.email || '',
      password: '', // Don't populate password for edit
      phone: student.phone || '',
      college: student.college || userProfile?.college || '',
      degree: student.degree || '',
      graduationYear: student.graduationYear?.toString() || '',
      skills: student.skills || '',
    });
    setShowEditModal(true);
    setActionMenuOpen(null);
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      const updateData = {
        name: formData.name,
        rollNumber: formData.rollNumber,
        phone: formData.phone,
        college: formData.college,
        degree: formData.degree,
        graduationYear: formData.graduationYear ? parseInt(formData.graduationYear) : null,
        skills: formData.skills,
      };

      const res = await fetch(`${backendUrl}/api/admin/management/students/${selectedStudent.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        const result = await res.json();
        setMessage(`✅ Student updated successfully!\n• Name: ${result.name}\n• Roll Number: ${result.rollNumber}\n• Email: ${result.email}`);
        setShowEditModal(false);
        setSelectedStudent(null);
        fetchStudents();
        setTimeout(() => setMessage(''), 5000);
      } else {
        const errorText = await res.text();
        setMessage(`❌ Update Failed: ${errorText.substring(0, 200)}`);
        setTimeout(() => setMessage(''), 6000);
      }
    } catch (error) {
      setMessage(`❌ Network Error: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteStudent = (student) => {
    setSelectedStudent(student);
    setShowDeleteModal(true);
    setActionMenuOpen(null);
  };

  const confirmDeleteStudent = async () => {
    if (!selectedStudent) return;

    setUploading(true);
    try {
      const res = await fetch(`${backendUrl}/api/admin/management/students/${selectedStudent.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        setMessage(`✅ Student "${selectedStudent.name}" deleted successfully!`);
        setShowDeleteModal(false);
        setSelectedStudent(null);
        fetchBatchCounts();
        fetchStudents();
        setTimeout(() => setMessage(''), 4000);
      } else {
        const errorText = await res.text();
        setMessage(`❌ Delete Failed: ${errorText.substring(0, 200)}`);
        setTimeout(() => setMessage(''), 6000);
      }
    } catch (error) {
      setMessage(`❌ Network Error: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setUploading(false);
    }
  };

  const handleToggleActive = async (student) => {
    setActionMenuOpen(null);

    try {
      const res = await fetch(`${backendUrl}/api/admin/management/students/${student.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !student.isActive,
        }),
      });

      if (res.ok) {
        setMessage(`✅ Student ${!student.isActive ? 'activated' : 'deactivated'} successfully!`);
        fetchStudents();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const errorText = await res.text();
        setMessage(`❌ Status Update Failed: ${errorText.substring(0, 200)}`);
        setTimeout(() => setMessage(''), 6000);
      }
    } catch (error) {
      setMessage(`❌ Network Error: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleViewProfile = async (student) => {
    setActionMenuOpen(null);
    setSelectedStudent(student);
    setShowProfileModal(true);
    setLoadingExperiences(true);
    setStudentExperiences([]);

    try {
      const res = await fetch(`${backendUrl}/api/admin/management/students/${student.id}/experiences?size=100`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStudentExperiences(data.content || []);
      }
    } catch (error) {
      console.error('Failed to fetch experiences:', error);
    } finally {
      setLoadingExperiences(false);
    }
  };

  return (
    <AdminLayout user={user} userProfile={userProfile}>
      {message && (
        <div
          style={{
            position: 'fixed',
            top: '2rem',
            right: '2rem',
            background: message.includes('Error') ? '#fee2e2' : '#dcfce7',
            color: message.includes('Error') ? '#991b1b' : '#166534',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
          }}
        >
          {message}
        </div>
      )}

      <div className="admin-page">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar-section">
            <h3 className="admin-sidebar-title">Batches</h3>
            <div className="admin-sidebar-list">
              {loadingBatches ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>
                  Loading...
                </div>
              ) : batches.length > 0 ? (
                batches.map((batch) => (
                  <button
                    key={batch.year}
                    className={`admin-sidebar-item ${
                      selectedBatch === batch.year ? 'active' : ''
                    }`}
                    onClick={() => setSelectedBatch(batch.year)}
                  >
                    <span className="admin-sidebar-item-icon">📁</span>
                    <div className="admin-sidebar-item-content">
                      <span className="admin-sidebar-item-title">Batch {batch.year}</span>
                      <span className="admin-sidebar-item-subtitle">{batch.count} Students</span>
                    </div>
                  </button>
                ))
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>
                  No batches found
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="admin-main">
          <div className="admin-page-header">
            <h1 className="admin-page-title">Students Management</h1>
            <p className="admin-page-subtitle">
              Manage student records and batch assignments.
            </p>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">Batch {selectedBatch} Students</h2>
              <div className="admin-card-actions">
                <div className="admin-search-input">
                  <Search size={16} className="admin-search-icon" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="admin-btn-primary" onClick={() => setShowAddModal(true)}>
                    <Plus size={16} />
                    Add Student
                  </button>
                  <button className="admin-btn-secondary" onClick={() => setShowBatchModal(true)}>
                    <Upload size={16} />
                    Batch Upload
                  </button>
                </div>
              </div>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        className="admin-checkbox"
                        checked={selectedStudents.length === filteredStudents.length}
                        onChange={(e) =>
                          setSelectedStudents(
                            e.target.checked ? filteredStudents.map((s) => s.id) : []
                          )
                        }
                      />
                    </th>
                    <th>Student Name</th>
                    <th>ID Number</th>
                    <th>Experience</th>
                    <th>Risk</th>
                    <th>Status</th>
                    <th style={{ width: '80px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="admin-empty-state">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <tr key={student.id}>
                        <td>
                          <input
                            type="checkbox"
                            className="admin-checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => toggleSelectStudent(student.id)}
                          />
                        </td>
                        <td>
                          <div className="admin-table-user">
                            <img
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=4F46E5&color=fff`}
                              alt={student.name}
                              className="admin-table-avatar"
                            />
                            <div className="admin-table-user-info">
                              <span className="admin-table-user-name">{student.name}</span>
                              <span className="admin-table-user-meta">{student.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                            {student.rollNumber || '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.875rem', color: '#0f172a' }}>
                            {student.interviewExperiencesCount || 0}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`admin-risk-indicator ${getRiskLevel(student)}`}
                          ></span>
                        </td>
                        <td>
                          <span
                            className={`admin-status-badge ${
                              student.isActive ? 'active' : 'inactive'
                            }`}
                          >
                            {student.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div style={{ position: 'relative' }}>
                            <button
                              className="admin-action-menu-btn"
                              onClick={() => setActionMenuOpen(actionMenuOpen === student.id ? null : student.id)}
                            >
                              <MoreVertical size={16} />
                            </button>
                            {actionMenuOpen === student.id && (
                              <div className="admin-action-menu" style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                minWidth: '160px',
                                zIndex: 10,
                                marginTop: '4px'
                              }}>
                                <button
                                  onClick={() => handleViewProfile(student)}
                                  style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    textAlign: 'left',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.875rem',
                                    color: '#6366f1',
                                    fontWeight: 600,
                                    transition: 'background 0.15s'
                                  }}
                                  onMouseEnter={(e) => e.target.style.background = '#eef2ff'}
                                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                >
                                  <Eye size={14} />
                                  View Profile
                                </button>
                                <div style={{ borderTop: '1px solid #e2e8f0', margin: '0.25rem 0' }} />
                                <button
                                  onClick={() => handleEditStudent(student)}
                                  style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    textAlign: 'left',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.875rem',
                                    color: '#0f172a',
                                    transition: 'background 0.15s'
                                  }}
                                  onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                >
                                  <Edit2 size={14} />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleToggleActive(student)}
                                  style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    textAlign: 'left',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.875rem',
                                    color: student.isActive ? '#f59e0b' : '#10b981',
                                    transition: 'background 0.15s'
                                  }}
                                  onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                >
                                  <Eye size={14} />
                                  {student.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(student)}
                                  style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    textAlign: 'left',
                                    border: 'none',
                                    borderTop: '1px solid #e2e8f0',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.875rem',
                                    color: '#dc2626',
                                    transition: 'background 0.15s'
                                  }}
                                  onMouseEnter={(e) => e.target.style.background = '#fef2f2'}
                                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="admin-empty-state">
                        No students found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Student</h3>
              <button className="admin-btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setShowAddModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateStudent}>
              <div className="modal-body">
                {/* Info Box */}
                <div style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                  color: '#1e40af'
                }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'start' }}>
                    <span style={{ fontSize: '1.25rem' }}>ℹ️</span>
                    <div>
                      <strong>One-Click Student Creation</strong><br/>
                      This will automatically create:
                      <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0 }}>
                        <li>✓ Login credentials in Supabase Auth</li>
                        <li>✓ Student record in database</li>
                      </ul>
                      <em style={{ fontSize: '0.8125rem', color: '#3b82f6' }}>Email must be unique!</em>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Name <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Roll Number
                    </label>
                    <input
                      type="text"
                      value={formData.rollNumber}
                      onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Email <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Password <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                        Phone
                      </label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                        Graduation Year
                      </label>
                      <input
                        type="number"
                        value={formData.graduationYear}
                        onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                        style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      College {userProfile?.college && <span style={{ color: '#64748b', fontSize: '0.75rem' }}>(Auto-filled from your profile)</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.college}
                      readOnly
                      disabled={!!userProfile?.college}
                      style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: userProfile?.college ? '#f8fafc' : 'white', cursor: userProfile?.college ? 'not-allowed' : 'text' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Degree
                    </label>
                    <input
                      type="text"
                      value={formData.degree}
                      onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Skills
                    </label>
                    <textarea
                      rows={3}
                      value={formData.skills}
                      onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="admin-btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn-primary" disabled={uploading}>
                  <Save size={16} />
                  {uploading ? '⏳ Creating in Auth + DB...' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Upload Modal */}
      {showBatchModal && (
        <div className="modal-overlay" onClick={() => setShowBatchModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Batch Upload Students</h3>
              <button className="admin-btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setShowBatchModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                Upload an Excel file (.xlsx) with columns: Name, RollNumber, Email, Password, Phone, College, Degree, GraduationYear, Skills
              </p>
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => setBatchFile(e.target.files[0])}
                style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
              />
              {batchFile && (
                <p style={{ fontSize: '0.875rem', color: '#059669', marginTop: '0.5rem' }}>
                  Selected: {batchFile.name}
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="admin-btn-secondary" onClick={() => setShowBatchModal(false)}>
                Cancel
              </button>
              <button className="admin-btn-primary" onClick={handleBatchUpload} disabled={uploading || !batchFile}>
                <Upload size={16} />
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Student</h3>
              <button className="admin-btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setShowEditModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateStudent}>
              <div className="modal-body">
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Name <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Roll Number
                    </label>
                    <input
                      type="text"
                      value={formData.rollNumber}
                      onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Email (cannot be changed)
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      College
                    </label>
                    <input
                      type="text"
                      value={formData.college}
                      disabled
                      style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Degree
                    </label>
                    <input
                      type="text"
                      value={formData.degree}
                      onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Graduation Year
                    </label>
                    <input
                      type="number"
                      value={formData.graduationYear}
                      onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Skills
                    </label>
                    <textarea
                      rows={3}
                      value={formData.skills}
                      onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                      placeholder="e.g., Java, Python, React, Node.js"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="admin-btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn-primary" disabled={uploading}>
                  <Save size={16} />
                  {uploading ? 'Updating...' : 'Update Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Confirm Delete</h3>
              <button className="admin-btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setShowDeleteModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                Are you sure you want to delete this student?
              </p>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '1rem' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#991b1b', marginBottom: '0.25rem' }}>
                  {selectedStudent.name}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#b91c1c' }}>
                  {selectedStudent.email}
                </p>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '1rem' }}>
                ⚠️ This action cannot be undone. The student will be removed from the database.
              </p>
            </div>
            <div className="modal-footer">
              <button className="admin-btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button
                className="admin-btn-primary"
                onClick={confirmDeleteStudent}
                disabled={uploading}
                style={{ background: '#dc2626' }}
              >
                <Trash2 size={16} />
                {uploading ? 'Deleting...' : 'Delete Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Detail Modal */}
      {showProfileModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content" style={{ maxWidth: '900px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Student Profile - {selectedStudent.name}</h3>
              <button className="admin-btn-secondary" onClick={() => setShowProfileModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Profile Information */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: '#0f172a' }}>
                  Profile Information
                </h4>
                <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Email</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f172a' }}>{selectedStudent.email}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Roll Number</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f172a' }}>{selectedStudent.rollNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Phone</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f172a' }}>{selectedStudent.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>College</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f172a' }}>{selectedStudent.college || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Degree</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f172a' }}>{selectedStudent.degree || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Graduation Year</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f172a' }}>{selectedStudent.graduationYear || 'N/A'}</p>
                  </div>
                  {selectedStudent.mentorName && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Mentor</p>
                      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6366f1' }}>{selectedStudent.mentorName}</p>
                    </div>
                  )}
                  {selectedStudent.skills && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Skills</p>
                      <p style={{ fontSize: '0.875rem', color: '#0f172a' }}>{selectedStudent.skills}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Interview Experiences */}
              <div>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: '#0f172a' }}>
                  Interview Experiences ({studentExperiences.length})
                </h4>
                {loadingExperiences ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading experiences...</div>
                ) : studentExperiences.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {studentExperiences.map((exp) => (
                      <div key={exp.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                          <div>
                            <h5 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>
                              {exp.companyName || 'Company'} - {exp.role}
                            </h5>
                            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {exp.interviewDate} • Difficulty: {exp.difficulty}
                            </p>
                          </div>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            background: exp.moderationStatus === 'APPROVED' ? '#dcfce7' : exp.moderationStatus === 'REJECTED' ? '#fee2e2' : '#fef3c7',
                            color: exp.moderationStatus === 'APPROVED' ? '#166534' : exp.moderationStatus === 'REJECTED' ? '#991b1b' : '#854d0e'
                          }}>
                            {exp.moderationStatus}
                          </span>
                        </div>
                        {exp.experience && (
                          <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.5' }}>
                            {exp.experience.substring(0, 200)}{exp.experience.length > 200 ? '...' : ''}
                          </p>
                        )}
                        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#64748b' }}>
                          <span>Result: {exp.interviewResult || 'N/A'}</span>
                          <span>•</span>
                          <span>Rounds: {exp.rounds?.length || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '8px', color: '#64748b' }}>
                    <Eye size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <p>No interview experiences submitted yet</p>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="admin-btn-primary" onClick={() => setShowProfileModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
