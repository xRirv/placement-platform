import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, ToggleLeft, X, Save, Upload, MoreVertical, Eye, Users, UserPlus, UserMinus } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import './AdminStyles.css';

export const MentorsPage = ({ user, session, userProfile }) => {
  const [mentors, setMentors] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  // Mentees management state
  const [showMenteesModal, setShowMenteesModal] = useState(false);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [menteesLoading, setMenteesLoading] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Profile modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileMentor, setProfileMentor] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    facultyId: '',
    email: '',
    password: '',
    bio: '',
    expertise: '',
  });
  const [batchFile, setBatchFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  useEffect(() => {
    fetchMentors();
  }, []);

  const fetchMentors = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/admin/management/mentors?size=100`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMentors(data.content || []);
      }
    } catch (error) {
      console.error('Failed to fetch mentors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch available students (those without a mentor or all students)
  const fetchAvailableStudents = async () => {
    setMenteesLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/admin/management/students?size=1000`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableStudents(data.content || []);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setMenteesLoading(false);
    }
  };

  // Fetch mentor details with students
  const fetchMentorDetails = async (mentorId) => {
    try {
      const res = await fetch(`${backendUrl}/api/admin/management/mentors/${mentorId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedMentor(data);
      }
    } catch (error) {
      console.error('Failed to fetch mentor details:', error);
    }
  };

  // Open mentees management modal
  const openMenteesModal = async (mentor) => {
    setSelectedMentor(mentor);
    setShowMenteesModal(true);
    setActionMenuOpen(null);
    await fetchMentorDetails(mentor.id);
    await fetchAvailableStudents();
  };

  // Assign student to mentor
  const handleAssignStudent = async (studentId) => {
    try {
      const res = await fetch(
        `${backendUrl}/api/admin/management/students/${studentId}/assign-mentor/${selectedMentor.id}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );

      if (res.ok) {
        setMessage(`✅ Student assigned to ${selectedMentor.name} successfully!`);
        await fetchMentorDetails(selectedMentor.id);
        await fetchAvailableStudents();
        fetchMentors();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await res.text();
        setMessage(`❌ Failed to assign student: ${error}`);
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // Unassign student from mentor
  const handleUnassignStudent = async (studentId) => {
    try {
      const res = await fetch(
        `${backendUrl}/api/admin/management/students/${studentId}/unassign-mentor`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );

      if (res.ok) {
        setMessage('✅ Student unassigned successfully!');
        await fetchMentorDetails(selectedMentor.id);
        await fetchAvailableStudents();
        fetchMentors();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await res.text();
        setMessage(`❌ Failed to unassign student: ${error}`);
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const filteredMentors = mentors.filter(
    (m) =>
      (activeTab === 'all' || (activeTab === 'review' && m.studentsCount === 0)) &&
      (m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.expertise?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateMentor = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const res = await fetch(`${backendUrl}/api/admin/management/mentors`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const result = await res.json();
        setMessage(`✅ Mentor created successfully!
          • Name: ${result.name}
          • Faculty ID: ${result.facultyId}
          • Email: ${result.email}
          • Created in both Supabase Auth and Database!`);
        setShowAddModal(false);
        setFormData({
          name: '',
          facultyId: '',
          email: '',
          password: '',
          bio: '',
          expertise: '',
        });
        fetchMentors();
        setTimeout(() => setMessage(''), 5000);
      } else {
        let errorMessage = 'Failed to create mentor';
        const errorText = await res.text();

        // Specific error handling
        if (errorText.includes('email_exists') || errorText.includes('email address has already been registered')) {
          errorMessage = `❌ Email Already Registered!\n\nThe email "${formData.email}" is already registered in the system.\n\nPlease use a different email address.`;
        } else if (errorText.includes('duplicate key') && errorText.includes('faculty_id')) {
          errorMessage = `❌ Faculty ID Already Exists!\n\nThe faculty ID "${formData.facultyId}" is already assigned to another mentor.`;
        } else if (res.status === 401) {
          errorMessage = '❌ Unauthorized!\n\nYour session may have expired. Please log out and log in again.';
        } else if (res.status === 403) {
          errorMessage = '❌ Permission Denied!\n\nYou do not have permission to create mentors.';
        } else if (res.status === 500) {
          errorMessage = `❌ Server Error!\n\nAn internal server error occurred. Please try again.\n\nDetails: ${errorText.substring(0, 100)}`;
        } else {
          errorMessage = `❌ Error: ${errorText}`;
        }
        setMessage(errorMessage);
      }
    } catch (error) {
      setMessage(`❌ Network Error: ${error.message}\n\nPlease check your connection and try again.`);
    } finally {
      setUploading(false);
    }
  };

  const handleBatchUpload = async () => {
    if (!batchFile) {
      setMessage('❌ Please select a file');
      return;
    }

    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', batchFile);

    try {
      const res = await fetch(`${backendUrl}/api/admin/management/mentors/batch-upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formDataUpload,
      });

      if (res.ok) {
        const result = await res.json();
        setMessage(`✅ Batch Upload Complete!\n\n✓ Successfully created: ${result.successCount} mentors\n${result.failureCount > 0 ? `✗ Failed: ${result.failureCount}` : ''}\n\nAll mentors created in Supabase Auth + Database!`);
        setShowBatchModal(false);
        setBatchFile(null);
        fetchMentors();
        setTimeout(() => setMessage(''), 6000);
      } else {
        const errorText = await res.text();
        setMessage(`❌ Batch Upload Failed!\n\n${errorText.substring(0, 200)}`);
      }
    } catch (error) {
      setMessage(`❌ Network Error: ${error.message}\n\nPlease check your connection and try again.`);
    } finally {
      setUploading(false);
    }
  };

  const handleEditMentor = (mentor) => {
    setSelectedMentor(mentor);
    setFormData({
      name: mentor.name || '',
      facultyId: mentor.facultyId || '',
      email: mentor.email || '',
      password: '', // Don't populate password for edit
      bio: mentor.bio || '',
      expertise: mentor.expertise || '',
    });
    setShowEditModal(true);
    setActionMenuOpen(null);
  };

  const handleUpdateMentor = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      const updateData = {
        name: formData.name,
        facultyId: formData.facultyId,
        bio: formData.bio,
        expertise: formData.expertise,
      };

      const res = await fetch(`${backendUrl}/api/admin/management/mentors/${selectedMentor.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        const result = await res.json();
        setMessage(`✅ Mentor updated successfully!\n• Name: ${result.name}\n• Faculty ID: ${result.facultyId}\n• Email: ${result.email}`);
        setShowEditModal(false);
        setSelectedMentor(null);
        fetchMentors();
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

  const handleDeleteMentor = (mentor) => {
    setSelectedMentor(mentor);
    setShowDeleteModal(true);
    setActionMenuOpen(null);
  };

  const confirmDeleteMentor = async () => {
    if (!selectedMentor) return;

    setUploading(true);
    try {
      const res = await fetch(`${backendUrl}/api/admin/management/mentors/${selectedMentor.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        setMessage(`✅ Mentor "${selectedMentor.name}" deleted successfully!`);
        setShowDeleteModal(false);
        setSelectedMentor(null);
        fetchMentors();
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

  const handleToggleActive = async (mentor) => {
    setActionMenuOpen(null);

    try {
      const res = await fetch(`${backendUrl}/api/admin/management/mentors/${mentor.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !mentor.isActive,
        }),
      });

      if (res.ok) {
        setMessage(`✅ Mentor ${!mentor.isActive ? 'activated' : 'deactivated'} successfully!`);
        fetchMentors();
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

  // View Profile
  const handleViewProfile = async (mentor) => {
    setActionMenuOpen(null);
    setShowProfileModal(true);
    setProfileMentor(null);

    try {
      const res = await fetch(`${backendUrl}/api/admin/management/mentors/${mentor.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfileMentor(data);
      }
    } catch (error) {
      console.error('Failed to fetch mentor details:', error);
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
        <main className="admin-main" style={{ maxWidth: '100%' }}>
          <div className="admin-page-header">
            <h1 className="admin-page-title">Mentors Management</h1>
            <p className="admin-page-subtitle">Oversee mentorship assignments and performance.</p>
          </div>

          {/* Tabs */}
          <div className="admin-tabs">
            <button
              className={`admin-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Mentors
            </button>
            <button
              className={`admin-tab ${activeTab === 'review' ? 'active' : ''}`}
              onClick={() => setActiveTab('review')}
            >
              Needs Review
            </button>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <div className="admin-search-input">
                <Search size={16} className="admin-search-icon" />
                <input
                  type="text"
                  placeholder="Search mentors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="admin-btn-primary" onClick={() => setShowAddModal(true)}>
                  <Plus size={16} />
                  Add Mentor
                </button>
                <button className="admin-btn-secondary" onClick={() => setShowBatchModal(true)}>
                  <Upload size={16} />
                  Batch Upload
                </button>
              </div>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Mentor</th>
                    <th>Department</th>
                    <th>Mentees</th>
                    <th>Status</th>
                    <th style={{ width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="admin-empty-state">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredMentors.length > 0 ? (
                    filteredMentors.map((mentor) => (
                      <tr key={mentor.id}>
                        <td>
                          <div className="admin-table-user">
                            <img
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.name)}&background=059669&color=fff`}
                              alt={mentor.name}
                              className="admin-table-avatar"
                            />
                            <div className="admin-table-user-info">
                              <span className="admin-table-user-name">{mentor.name}</span>
                              <span className="admin-table-user-meta">
                                {mentor.facultyId || 'Faculty ID Not Set'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.875rem', color: '#0f172a' }}>
                            {mentor.expertise || 'Not Specified'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', marginLeft: '-0.5rem' }}>
                              {mentor.students &&
                                mentor.students.slice(0, 3).map((student, idx) => (
                                  <img
                                    key={idx}
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=4F46E5&color=fff`}
                                    alt={student.name}
                                    style={{
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '50%',
                                      border: '2px solid white',
                                      marginLeft: '-0.5rem',
                                    }}
                                  />
                                ))}
                            </div>
                            {mentor.studentsCount > 3 && (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  color: '#64748b',
                                  fontWeight: 600,
                                }}
                              >
                                +{mentor.studentsCount - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`admin-status-badge ${
                              mentor.isActive ? 'active' : 'inactive'
                            }`}
                          >
                            {mentor.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div style={{ position: 'relative' }}>
                            <button
                              className="admin-action-menu-btn"
                              onClick={() => setActionMenuOpen(actionMenuOpen === mentor.id ? null : mentor.id)}
                            >
                              <MoreVertical size={16} />
                            </button>
                            {actionMenuOpen === mentor.id && (
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
                                  onClick={() => handleViewProfile(mentor)}
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
                                  onClick={() => openMenteesModal(mentor)}
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
                                  <Users size={14} />
                                  Manage Mentees
                                </button>
                                <div style={{ borderTop: '1px solid #e2e8f0', margin: '0.25rem 0' }} />
                                <button
                                  onClick={() => handleEditMentor(mentor)}
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
                                  onClick={() => handleToggleActive(mentor)}
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
                                    color: mentor.isActive ? '#f59e0b' : '#10b981',
                                    transition: 'background 0.15s'
                                  }}
                                  onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                >
                                  <Eye size={14} />
                                  {mentor.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => handleDeleteMentor(mentor)}
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
                      <td colSpan={5} className="admin-empty-state">
                        No mentors found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Add Mentor Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Mentor</h3>
              <button className="admin-btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setShowAddModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateMentor}>
              <div className="modal-body">
                {/* Info Box */}
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
                  <strong style={{ color: '#1e40af' }}>One-Click Mentor Creation</strong><br/>
                  <span style={{ fontSize: '0.875rem', color: '#1e40af' }}>
                    This will automatically create:
                  </span>
                  <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', fontSize: '0.875rem', color: '#1e40af' }}>
                    <li>✓ Login credentials in Supabase Auth</li>
                    <li>✓ Mentor record in database</li>
                  </ul>
                  <em style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Email must be unique!</em>
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
                      Faculty ID
                    </label>
                    <input
                      type="text"
                      value={formData.facultyId}
                      onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
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
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Bio
                    </label>
                    <textarea
                      rows={3}
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Expertise
                    </label>
                    <input
                      type="text"
                      value={formData.expertise}
                      onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                      placeholder="e.g., Backend Development, System Design"
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
                  {uploading ? '⏳ Creating in Auth + DB...' : 'Create Mentor'}
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
              <h3>Batch Upload Mentors</h3>
              <button className="admin-btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setShowBatchModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                Upload an Excel file (.xlsx) with columns: Name, FacultyId, Email, Password, Bio, Expertise
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

      {/* Edit Mentor Modal */}
      {showEditModal && selectedMentor && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Mentor</h3>
              <button className="admin-btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setShowEditModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateMentor}>
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
                      Faculty ID
                    </label>
                    <input
                      type="text"
                      value={formData.facultyId}
                      onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
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
                      Bio
                    </label>
                    <textarea
                      rows={3}
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Expertise
                    </label>
                    <textarea
                      rows={2}
                      value={formData.expertise}
                      onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                      style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                      placeholder="e.g., Java, Spring Boot, Cloud Computing"
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
                  {uploading ? 'Updating...' : 'Update Mentor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedMentor && (
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
                Are you sure you want to delete this mentor?
              </p>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '1rem' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#991b1b', marginBottom: '0.25rem' }}>
                  {selectedMentor.name}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#b91c1c' }}>
                  {selectedMentor.email}
                </p>
                {selectedMentor.studentsCount > 0 && (
                  <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.5rem' }}>
                    ⚠️ This mentor has {selectedMentor.studentsCount} assigned student(s)
                  </p>
                )}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '1rem' }}>
                ⚠️ This action cannot be undone. The mentor will be removed from the database.
              </p>
            </div>
            <div className="modal-footer">
              <button className="admin-btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button
                className="admin-btn-primary"
                onClick={confirmDeleteMentor}
                disabled={uploading}
                style={{ background: '#dc2626' }}
              >
                <Trash2 size={16} />
                {uploading ? 'Deleting...' : 'Delete Mentor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Detail Modal */}
      {showProfileModal && profileMentor && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content" style={{ maxWidth: '900px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Mentor Profile - {profileMentor.name}</h3>
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
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f172a' }}>{profileMentor.email}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Faculty ID</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f172a' }}>{profileMentor.facultyId || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Department</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f172a' }}>{profileMentor.department || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Expertise</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f172a' }}>{profileMentor.expertise || 'N/A'}</p>
                  </div>
                  {profileMentor.bio && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Bio</p>
                      <p style={{ fontSize: '0.875rem', color: '#0f172a', lineHeight: '1.5' }}>{profileMentor.bio}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Current Mentees */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>
                    Current Mentees ({profileMentor.students?.length || 0})
                  </h4>
                  <button
                    className="admin-btn-primary"
                    onClick={() => {
                      setShowProfileModal(false);
                      openMenteesModal(profileMentor);
                    }}
                    style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                  >
                    <UserPlus size={14} />
                    <span>Add Mentee</span>
                  </button>
                </div>
                {profileMentor.students && profileMentor.students.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {profileMentor.students.map((student) => (
                      <div key={student.studentId} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="admin-table-user">
                          <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=4F46E5&color=fff`}
                            alt={student.name}
                            className="admin-table-avatar"
                          />
                          <div className="admin-table-user-info">
                            <span className="admin-table-user-name">{student.name}</span>
                            <span className="admin-table-user-meta">{student.email}</span>
                            {student.college && (
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{student.college}</span>
                            )}
                          </div>
                        </div>
                        <button
                          className="admin-btn-secondary"
                          onClick={async () => {
                            await handleUnassignStudent(student.studentId);
                            // Refresh profile data
                            const res = await fetch(`${backendUrl}/api/admin/management/mentors/${profileMentor.id}`, {
                              headers: { Authorization: `Bearer ${session.access_token}` },
                            });
                            if (res.ok) {
                              const data = await res.json();
                              setProfileMentor(data);
                            }
                          }}
                          style={{ background: '#fee2e2', color: '#dc2626', border: 'none', fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
                        >
                          <UserMinus size={14} />
                          <span>Remove</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '8px', color: '#64748b' }}>
                    <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <p>No mentees assigned yet</p>
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

      {/* Mentees Management Modal */}
      {showMenteesModal && selectedMentor && (
        <div className="modal-overlay" onClick={() => setShowMenteesModal(false)}>
          <div className="modal-content" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Manage Mentees - {selectedMentor.name}</h3>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setShowMenteesModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Current Mentees Section */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#0f172a' }}>
                  Current Mentees ({selectedMentor.students?.length || 0})
                </h4>
                {menteesLoading ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>Loading...</div>
                ) : selectedMentor.students && selectedMentor.students.length > 0 ? (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    {selectedMentor.students.map((student) => (
                      <div
                        key={student.studentId}
                        style={{
                          padding: '0.75rem 1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid #e2e8f0',
                          background: '#f8fafc',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{student.name}</div>
                          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                            {student.email} • {student.college}
                          </div>
                          {student.degree && (
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{student.degree}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="admin-btn-secondary"
                          onClick={() => handleUnassignStudent(student.studentId)}
                          style={{ background: '#fee2e2', color: '#dc2626', border: 'none', fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
                        >
                          <UserMinus size={14} />
                          <span>Remove</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '2rem',
                      textAlign: 'center',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      color: '#64748b',
                    }}
                  >
                    No mentees assigned yet
                  </div>
                )}
              </div>

              {/* Add Mentee Section */}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#0f172a' }}>
                  Add Mentee
                </h4>
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                    }}
                  />
                  <input
                    type="text"
                    className="text-input"
                    style={{ paddingLeft: '2.5rem', width: '100%', padding: '0.625rem 0.625rem 0.625rem 2.5rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    placeholder="Search students by name or email..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                  />
                </div>
                {menteesLoading ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>Loading...</div>
                ) : (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {availableStudents
                      .filter((student) => {
                        const isAlreadyAssigned = selectedMentor.students?.some(
                          (s) => s.studentId === student.id
                        );
                        if (isAlreadyAssigned) return false;
                        if (!studentSearchQuery) return true;
                        const query = studentSearchQuery.toLowerCase();
                        return (
                          student.name?.toLowerCase().includes(query) ||
                          student.email?.toLowerCase().includes(query) ||
                          student.college?.toLowerCase().includes(query)
                        );
                      })
                      .map((student) => (
                        <div
                          key={student.id}
                          style={{
                            padding: '0.75rem 1rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid #e2e8f0',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{student.name}</div>
                            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                              {student.email} • {student.college}
                            </div>
                            {student.mentorName && (
                              <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>
                                Currently assigned to: {student.mentorName}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className="admin-btn-primary"
                            onClick={() => handleAssignStudent(student.id)}
                            style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
                          >
                            <UserPlus size={14} />
                            <span>Add</span>
                          </button>
                        </div>
                      ))}
                    {availableStudents.filter((student) => {
                      const isAlreadyAssigned = selectedMentor.students?.some(
                        (s) => s.studentId === student.id
                      );
                      if (isAlreadyAssigned) return false;
                      if (!studentSearchQuery) return true;
                      const query = studentSearchQuery.toLowerCase();
                      return (
                        student.name?.toLowerCase().includes(query) ||
                        student.email?.toLowerCase().includes(query) ||
                        student.college?.toLowerCase().includes(query)
                      );
                    }).length === 0 && (
                      <div
                        style={{
                          padding: '2rem',
                          textAlign: 'center',
                          color: '#64748b',
                        }}
                      >
                        No available students found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="admin-btn-primary"
                onClick={() => setShowMenteesModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
