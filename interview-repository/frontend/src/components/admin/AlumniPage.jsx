import { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, X, Save, Edit2, Trash2, Eye } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import './AdminStyles.css';

export const AlumniPage = ({ user, session, userProfile }) => {
  const [alumni, setAlumni] = useState([]);
  const [selectedClass, setSelectedClass] = useState('2021');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedAlumni, setSelectedAlumni] = useState([]);
  const [graduationClasses, setGraduationClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingAlumni, setEditingAlumni] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [alumniToDelete, setAlumniToDelete] = useState(null);
  const [message, setMessage] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState(null);

  // Profile modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [alumniExperiences, setAlumniExperiences] = useState([]);
  const [loadingExperiences, setLoadingExperiences] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    email: '',
    position: '',
    graduationYear: '',
    experienceYears: '',
    linkedinUrl: '',
    advice: '',
  });

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  useEffect(() => {
    fetchGraduationClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchAlumni();
    }
  }, [selectedClass]);

  const fetchGraduationClasses = async () => {
    setLoadingClasses(true);
    try {
      // Fetch all alumni to count by graduation year
      const res = await fetch(
        `${backendUrl}/api/admin/management/alumni?size=10000`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const allAlumni = data.content || [];

        // Group alumni by graduation year
        const yearCounts = {};
        allAlumni.forEach(alumniItem => {
          const year = alumniItem.graduationYear;
          if (year) {
            yearCounts[year] = (yearCounts[year] || 0) + 1;
          }
        });

        // Convert to class array format
        const classData = Object.entries(yearCounts)
          .map(([year, count]) => ({ year: String(year), count }))
          .sort((a, b) => b.year.localeCompare(a.year)); // Sort descending

        setGraduationClasses(classData);

        // Set first class as selected
        if (classData.length > 0) {
          setSelectedClass(classData[0].year);
        }
      }
    } catch (error) {
      console.error('Failed to fetch graduation classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchAlumni = async () => {
    if (!selectedClass) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${backendUrl}/api/admin/management/alumni?size=10000`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        // Filter by selected class
        const filtered = (data.content || []).filter(
          a => String(a.graduationYear) === String(selectedClass)
        );
        setAlumni(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch alumni:', error);
      setAlumni([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredAlumni = alumni.filter(
    (a) =>
      a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelectAlumni = (id) => {
    setSelectedAlumni((prev) =>
      prev.includes(id) ? prev.filter((aid) => aid !== id) : [...prev, id]
    );
  };

  // Modal handlers
  const openCreateModal = () => {
    console.log('Opening create modal');
    resetForm();
    setModalMode('create');
    setEditingAlumni(null);
    setShowModal(true);
  };

  const openEditModal = (alumniItem) => {
    console.log('Opening edit modal for:', alumniItem);
    setEditingAlumni(alumniItem);
    setFormData({
      name: alumniItem.name || '',
      rollNumber: alumniItem.rollNumber || '',
      email: alumniItem.email || '',
      password: '',
      position: alumniItem.position || '',
      graduationYear: alumniItem.graduationYear || '',
      experienceYears: alumniItem.experienceYears || '',
      linkedinUrl: alumniItem.linkedinUrl || '',
      advice: alumniItem.advice || '',
    });
    setModalMode('edit');
    setShowModal(true);
    setActionMenuOpen(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      rollNumber: '',
      email: '',
      position: '',
      graduationYear: '',
      experienceYears: '',
      linkedinUrl: '',
      advice: '',
    });
  };

  // Create Alumni
  const handleCreate = async (e) => {
    e.preventDefault();
    console.log('Creating alumni with data:', formData);

    try {
      const res = await fetch(`${backendUrl}/api/admin/management/alumni`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          graduationYear: formData.graduationYear ? parseInt(formData.graduationYear) : null,
          experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : null,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        // Store credentials to display
        setCreatedCredentials({
          name: result.name,
          email: result.email,
          password: result.generatedPassword
        });
        setMessage('');
        setShowModal(false);
        resetForm();
        fetchGraduationClasses();
        fetchAlumni();
      } else {
        const errorText = await res.text();
        console.error('Failed to create alumni:', errorText);
        setMessage(`❌ Failed to create alumni: ${errorText}`);
        setTimeout(() => setMessage(''), 6000);
      }
    } catch (error) {
      console.error('Error creating alumni:', error);
      setMessage(`❌ Network Error: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // Update Alumni
  const handleUpdate = async (e) => {
    e.preventDefault();
    console.log('Updating alumni:', editingAlumni.id, formData);

    try {
      const res = await fetch(`${backendUrl}/api/admin/management/alumni/${editingAlumni.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          rollNumber: formData.rollNumber,
          position: formData.position,
          graduationYear: formData.graduationYear ? parseInt(formData.graduationYear) : null,
          experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : null,
          linkedinUrl: formData.linkedinUrl,
          advice: formData.advice,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setMessage(`✅ Alumni updated successfully! ${result.name}`);
        setShowModal(false);
        resetForm();
        fetchAlumni();
        setTimeout(() => setMessage(''), 5000);
      } else {
        const errorText = await res.text();
        console.error('Failed to update alumni:', errorText);
        setMessage(`❌ Failed to update alumni: ${errorText}`);
        setTimeout(() => setMessage(''), 6000);
      }
    } catch (error) {
      console.error('Error updating alumni:', error);
      setMessage(`❌ Network Error: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // Delete Alumni
  const handleDeleteAlumni = (alumniItem) => {
    setAlumniToDelete(alumniItem);
    setShowDeleteModal(true);
    setActionMenuOpen(null);
  };

  const confirmDeleteAlumni = async () => {
    if (!alumniToDelete) return;

    console.log('Deleting alumni:', alumniToDelete.id);

    try {
      const res = await fetch(`${backendUrl}/api/admin/management/alumni/${alumniToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        setMessage(`✅ Alumni "${alumniToDelete.name}" deleted successfully!`);
        setShowDeleteModal(false);
        setAlumniToDelete(null);
        fetchGraduationClasses();
        fetchAlumni();
        setTimeout(() => setMessage(''), 5000);
      } else {
        const errorText = await res.text();
        console.error('Failed to delete alumni:', errorText);
        setMessage(`❌ Failed to delete: ${errorText}`);
        setShowDeleteModal(false);
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error deleting alumni:', error);
      setMessage(`❌ Network Error: ${error.message}`);
      setShowDeleteModal(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (alumniItem) => {
    console.log('Toggling active status for:', alumniItem.id);

    try {
      const res = await fetch(`${backendUrl}/api/admin/management/alumni/${alumniItem.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...alumniItem,
          isActive: !alumniItem.isActive,
        }),
      });

      if (res.ok) {
        setMessage(`✅ Alumni ${!alumniItem.isActive ? 'activated' : 'deactivated'} successfully!`);
        setActionMenuOpen(null);
        fetchAlumni();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const errorText = await res.text();
        console.error('Failed to toggle status:', errorText);
        setMessage(`❌ Failed to update status: ${errorText}`);
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      setMessage(`❌ Network Error: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // View Profile
  const handleViewProfile = async (alumniItem) => {
    setActionMenuOpen(null);
    setEditingAlumni(alumniItem);
    setShowProfileModal(true);
    setLoadingExperiences(true);
    setAlumniExperiences([]);

    try {
      const res = await fetch(`${backendUrl}/api/admin/management/alumni/${alumniItem.id}/experiences?size=100`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAlumniExperiences(data.content || []);
      }
    } catch (error) {
      console.error('Failed to fetch experiences:', error);
    } finally {
      setLoadingExperiences(false);
    }
  };

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActionMenuOpen(null);
    if (actionMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [actionMenuOpen]);

  return (
    <AdminLayout user={user} userProfile={userProfile}>
      <div className="admin-page">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar-section">
            <h3 className="admin-sidebar-title">Graduation Batches</h3>
            <div className="admin-sidebar-list">
              {loadingClasses ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#6766B7' }}>
                  Loading...
                </div>
              ) : graduationClasses.length > 0 ? (
                graduationClasses.map((cls) => (
                  <button
                    key={cls.year}
                    className={`admin-sidebar-item ${
                      selectedClass === cls.year ? 'active' : ''
                    }`}
                    onClick={() => setSelectedClass(cls.year)}
                  >
                    <span className="admin-sidebar-item-icon">📁</span>
                    <div className="admin-sidebar-item-content">
                      <span className="admin-sidebar-item-title">Class of {cls.year}</span>
                      <span className="admin-sidebar-item-subtitle">{cls.count} Alumni</span>
                    </div>
                  </button>
                ))
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#6766B7' }}>
                  No alumni found
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="admin-main">
          {message && (
            <div
              style={{
                background: message.includes('✅') ? '#d1fae5' : '#f8e6ee',
                border: `1px solid ${message.includes('✅') ? '#3d8c74' : '#b3405f'}`,
                color: message.includes('✅') ? '#2f6b59' : '#8c2f4a',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.875rem',
              }}
            >
              {message}
            </div>
          )}

          <div className="admin-page-header">
            <h1 className="admin-page-title">Alumni Management</h1>
            <p className="admin-page-subtitle">Stay connected with our global alumni network.</p>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">
                {selectedClass ? `Class of ${selectedClass} Alumni` : 'Alumni'}
              </h2>
              <div className="admin-card-actions">
                <div className="admin-search-input">
                  <Search size={16} className="admin-search-icon" />
                  <input
                    type="text"
                    placeholder="Search alumni..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="admin-btn-primary" onClick={openCreateModal}>
                  <Plus size={16} />
                  Add Alumni
                </button>
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
                        checked={selectedAlumni.length === filteredAlumni.length}
                        onChange={(e) =>
                          setSelectedAlumni(
                            e.target.checked ? filteredAlumni.map((a) => a.id) : []
                          )
                        }
                      />
                    </th>
                    <th>Alumni Name</th>
                    <th>Current Company</th>
                    <th>Industry</th>
                    <th>Status</th>
                    <th style={{ width: '80px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="admin-empty-state">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredAlumni.length > 0 ? (
                    filteredAlumni.map((alumniItem) => (
                      <tr key={alumniItem.id}>
                        <td>
                          <input
                            type="checkbox"
                            className="admin-checkbox"
                            checked={selectedAlumni.includes(alumniItem.id)}
                            onChange={() => toggleSelectAlumni(alumniItem.id)}
                          />
                        </td>
                        <td>
                          <div className="admin-table-user">
                            <img
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(alumniItem.name)}&background=9333ea&color=fff`}
                              alt={alumniItem.name}
                              className="admin-table-avatar"
                            />
                            <div className="admin-table-user-info">
                              <span className="admin-table-user-name">{alumniItem.name}</span>
                              <span className="admin-table-user-meta">
                                Class of {alumniItem.graduationYear || '—'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.875rem', color: '#23304D' }}>
                            {alumniItem.companyName || '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.875rem', color: '#353454' }}>
                            {alumniItem.position || '—'}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`admin-status-badge ${
                              alumniItem.isActive
                                ? alumniItem.interviewExperiencesCount > 0
                                  ? 'contributor'
                                  : 'active'
                                : 'inactive'
                            }`}
                          >
                            {alumniItem.isActive
                              ? alumniItem.interviewExperiencesCount > 0
                                ? 'Contributor'
                                : 'Active'
                              : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ position: 'relative' }}>
                          <button
                            className="admin-action-menu-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuOpen(actionMenuOpen === alumniItem.id ? null : alumniItem.id);
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {actionMenuOpen === alumniItem.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                right: '0',
                                top: '100%',
                                marginTop: '0.25rem',
                                background: 'white',
                                border: '1px solid #C8C7EB',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                zIndex: 10,
                                minWidth: '160px',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => handleViewProfile(alumniItem)}
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
                                  color: '#9230E3',
                                  fontWeight: 600,
                                  transition: 'background 0.15s'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#F2E1FF'}
                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                              >
                                <Eye size={14} />
                                View Profile
                              </button>
                              <div style={{ borderTop: '1px solid #C8C7EB', margin: '0.25rem 0' }} />
                              <button
                                type="button"
                                onClick={() => openEditModal(alumniItem)}
                                style={{
                                  width: '100%',
                                  padding: '0.6rem 1rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  color: '#23304D',
                                  transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#EAEAF7')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                              >
                                <Edit2 size={14} />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleActive(alumniItem)}
                                style={{
                                  width: '100%',
                                  padding: '0.6rem 1rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  color: alumniItem.isActive ? '#9a7a3a' : '#3d8c74',
                                  transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#EAEAF7')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                              >
                                <Eye size={14} />
                                <span>{alumniItem.isActive ? 'Deactivate' : 'Activate'}</span>
                              </button>

                              <div style={{ borderTop: '1px solid #C8C7EB', margin: '0.25rem 0' }} />

                              <button
                                type="button"
                                onClick={() => handleDeleteAlumni(alumniItem)}
                                style={{
                                  width: '100%',
                                  padding: '0.6rem 1rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  color: '#b3405f',
                                  transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8e6ee')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                              >
                                <Trash2 size={14} />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="admin-empty-state">
                        No alumni found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.5rem',
                borderBottom: '1px solid #C8C7EB',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#23304D' }}>
                {modalMode === 'create' ? 'Add New Alumni' : 'Edit Alumni'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '6px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={modalMode === 'create' ? handleCreate : handleUpdate}>
              <div style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
                {modalMode === 'create' && (
                  <div
                    style={{
                      background: '#EAEAF7',
                      border: '1px solid #C8C7EB',
                      borderRadius: '6px',
                      padding: '1rem',
                    }}
                  >
                    <strong style={{ color: '#6766B7' }}>One-Click Alumni Creation</strong>
                    <br />
                    <span style={{ fontSize: '0.875rem', color: '#6766B7' }}>
                      This will automatically:
                    </span>
                    <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', fontSize: '0.875rem', color: '#6766B7' }}>
                      <li>✓ Create login credentials in Supabase Auth</li>
                      <li>✓ Generate secure password (12 characters)</li>
                      <li>✓ Create alumni record in database</li>
                    </ul>
                    <em style={{ fontSize: '0.75rem', color: '#6766B7' }}>
                      📧 Email must be unique! 🔐 Password will be shown after creation.
                    </em>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                    Name <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #C8C7EB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                    Roll Number
                  </label>
                  <input
                    type="text"
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #C8C7EB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                {modalMode === 'edit' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #C8C7EB',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        background: '#EAEAF7',
                        cursor: 'not-allowed',
                      }}
                    />
                  </div>
                )}

                {modalMode === 'create' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                      Email <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #C8C7EB',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                      }}
                    />
                    <small style={{ display: 'block', marginTop: '0.25rem', color: '#353454', fontSize: '0.75rem' }}>
                      ℹ️ Password will be auto-generated and displayed after creation
                    </small>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                    Position
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #C8C7EB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                    }}
                    placeholder="e.g., Software Engineer"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                    Graduation Year
                  </label>
                  <input
                    type="number"
                    value={formData.graduationYear}
                    onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #C8C7EB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                    Experience Years
                  </label>
                  <input
                    type="number"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #C8C7EB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={formData.linkedinUrl}
                    onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #C8C7EB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                    }}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                    Advice for Students
                  </label>
                  <textarea
                    rows={3}
                    value={formData.advice}
                    onChange={(e) => setFormData({ ...formData, advice: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #C8C7EB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '1.5rem',
                  borderTop: '1px solid #C8C7EB',
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #C8C7EB',
                    background: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    background: '#9230E3',
                    color: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Save size={16} />
                  <span>{modalMode === 'create' ? 'Create Alumni' : 'Update'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && alumniToDelete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '400px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '1.5rem',
                borderBottom: '1px solid #C8C7EB',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#23304D' }}>Confirm Delete</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem', color: '#b3405f', fontWeight: 600 }}>
                ⚠️ Are you sure you want to delete this alumni?
              </div>

              <div
                style={{
                  background: '#f8e6ee',
                  border: '1px solid #ecc5d3',
                  borderRadius: '6px',
                  padding: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Name:</strong> {alumniToDelete.name}
                </div>
                <div>
                  <strong>Email:</strong> {alumniToDelete.email}
                </div>
              </div>

              <div style={{ fontSize: '0.875rem', color: '#353454' }}>
                This action cannot be undone. The alumni account and all associated data will be permanently removed.
              </div>
            </div>

            <div
              style={{
                padding: '1.5rem',
                borderTop: '1px solid #C8C7EB',
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #C8C7EB',
                  background: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAlumni}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  background: '#b3405f',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Trash2 size={16} />
                <span>Delete Alumni</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Detail Modal */}
      {showProfileModal && editingAlumni && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content" style={{ maxWidth: '900px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Alumni Profile - {editingAlumni.name}</h3>
              <button className="admin-btn-secondary" onClick={() => setShowProfileModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Profile Information */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: '#23304D' }}>
                  Profile Information
                </h4>
                <div style={{ background: '#EAEAF7', borderRadius: '8px', padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#353454', marginBottom: '0.25rem' }}>Email</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#23304D' }}>{editingAlumni.email}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#353454', marginBottom: '0.25rem' }}>Roll Number</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#23304D' }}>{editingAlumni.rollNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#353454', marginBottom: '0.25rem' }}>Current Company</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#23304D' }}>{editingAlumni.companyName || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#353454', marginBottom: '0.25rem' }}>Current Role</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#23304D' }}>{editingAlumni.position || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#353454', marginBottom: '0.25rem' }}>Graduation Year</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#23304D' }}>{editingAlumni.graduationYear || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: '#353454', marginBottom: '0.25rem' }}>Experience Years</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#23304D' }}>{editingAlumni.experienceYears || 'N/A'}</p>
                  </div>
                  {editingAlumni.linkedinUrl && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <p style={{ fontSize: '0.75rem', color: '#353454', marginBottom: '0.25rem' }}>LinkedIn</p>
                      <a
                        href={editingAlumni.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.875rem', fontWeight: 500, color: '#9230E3', textDecoration: 'underline' }}
                      >
                        {editingAlumni.linkedinUrl}
                      </a>
                    </div>
                  )}
                  {editingAlumni.advice && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <p style={{ fontSize: '0.75rem', color: '#353454', marginBottom: '0.25rem' }}>Advice for Students</p>
                      <p style={{ fontSize: '0.875rem', color: '#23304D', lineHeight: '1.5' }}>{editingAlumni.advice}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Interview Experiences */}
              <div>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: '#23304D' }}>
                  Interview Experiences ({alumniExperiences.length})
                </h4>
                {loadingExperiences ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#353454' }}>Loading experiences...</div>
                ) : alumniExperiences.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {alumniExperiences.map((exp) => (
                      <div key={exp.id} style={{ background: '#EAEAF7', border: '1px solid #C8C7EB', borderRadius: '8px', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                          <div>
                            <h5 style={{ fontSize: '1rem', fontWeight: 600, color: '#23304D', marginBottom: '0.25rem' }}>
                              {exp.companyName || 'Company'} - {exp.role}
                            </h5>
                            <p style={{ fontSize: '0.75rem', color: '#353454' }}>
                              {exp.interviewDate} • Difficulty: {exp.difficulty}
                            </p>
                          </div>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            background: exp.moderationStatus === 'APPROVED' ? '#DBB0FF' : exp.moderationStatus === 'REJECTED' ? '#f8e6ee' : '#f6eedb',
                            color: exp.moderationStatus === 'APPROVED' ? '#2f6b59' : exp.moderationStatus === 'REJECTED' ? '#8c2f4a' : '#7a5c22'
                          }}>
                            {exp.moderationStatus}
                          </span>
                        </div>
                        {exp.experience && (
                          <p style={{ fontSize: '0.875rem', color: '#353454', lineHeight: '1.5' }}>
                            {exp.experience.substring(0, 200)}{exp.experience.length > 200 ? '...' : ''}
                          </p>
                        )}
                        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#353454' }}>
                          <span>Result: {exp.interviewResult || 'N/A'}</span>
                          <span>•</span>
                          <span>Rounds: {exp.rounds?.length || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem', background: '#EAEAF7', borderRadius: '8px', color: '#353454' }}>
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

      {/* Generated Credentials Modal */}
      {createdCredentials && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setCreatedCredentials(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '500px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '1.5rem',
                borderBottom: '1px solid #C8C7EB',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#3d8c74' }}>✅ Alumni Created Successfully!</h3>
              <button
                onClick={() => setCreatedCredentials(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div
                style={{
                  background: '#d1fae5',
                  border: '2px solid #3d8c74',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ color: '#2f6b59' }}>Name:</strong>
                  <div style={{ fontSize: '1.125rem', marginTop: '0.25rem' }}>{createdCredentials.name}</div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ color: '#2f6b59' }}>Email:</strong>
                  <div style={{ fontSize: '1.125rem', marginTop: '0.25rem' }}>{createdCredentials.email}</div>
                </div>

                <div style={{ marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#2f6b59' }}>Generated Password:</strong>
                  <div
                    style={{
                      background: 'white',
                      padding: '1rem',
                      borderRadius: '6px',
                      marginTop: '0.5rem',
                      fontFamily: 'monospace',
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      border: '2px dashed #3d8c74',
                      textAlign: 'center',
                    }}
                  >
                    {createdCredentials.password}
                  </div>
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdCredentials.password);
                    alert('Password copied to clipboard!');
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#3d8c74',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    marginTop: '0.75rem',
                  }}
                >
                  📋 Copy Password
                </button>
              </div>

              <div
                style={{
                  background: '#f6eedb',
                  border: '1px solid #9a7a3a',
                  borderRadius: '6px',
                  padding: '1rem',
                  fontSize: '0.875rem',
                  color: '#7a5c22',
                }}
              >
                <strong>⚠️ Important:</strong> Save this password now! It will not be shown again. Share these credentials
                with the alumni so they can log in.
              </div>
            </div>

            <div
              style={{
                padding: '1.5rem',
                borderTop: '1px solid #C8C7EB',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setCreatedCredentials(null)}
                style={{
                  padding: '0.5rem 1.5rem',
                  border: 'none',
                  background: '#3d8c74',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
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
