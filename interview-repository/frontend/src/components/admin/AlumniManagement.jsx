import { useState, useEffect } from 'react';
import { UserPlus, Search, Edit2, Trash2, Eye, X, Save, MoreVertical } from 'lucide-react';

export const AlumniManagement = ({ session }) => {
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedAlumni, setSelectedAlumni] = useState(null);
  const [message, setMessage] = useState('');
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [alumniToDelete, setAlumniToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    email: '',
    password: '',
    position: '',
    graduationYear: '',
    experienceYears: '',
    linkedinUrl: '',
    advice: '',
  });

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  const fetchAlumni = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/admin/management/alumni?size=100`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAlumni(data.content || []);
      }
    } catch (error) {
      console.error('Failed to fetch alumni:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.access_token) fetchAlumni();
  }, [session]);

  useEffect(() => {
    const handleClickOutside = () => setActionMenuOpen(null);
    if (actionMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [actionMenuOpen]);

  const handleCreate = async (e) => {
    e.preventDefault();
    console.log('handleCreate called with formData:', formData);
    console.log('Backend URL:', backendUrl);
    console.log('Session token exists:', !!session?.access_token);

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

      console.log('Response status:', res.status);
      console.log('Response ok:', res.ok);

      if (res.ok) {
        const result = await res.json();
        console.log('Alumni created successfully:', result);
        setMessage(`✅ Alumni created successfully!
          • Name: ${result.name}
          • Roll Number: ${result.rollNumber}
          • Email: ${result.email}
          • Position: ${result.position}
          • Created in both Supabase Auth and Database!`);
        setShowModal(false);
        resetForm();
        fetchAlumni();
        setTimeout(() => setMessage(''), 5000);
      } else {
        let errorMessage = 'Failed to create alumni';
        const errorText = await res.text();
        console.error('Alumni creation failed:', errorText);

        // Specific error handling
        if (errorText.includes('email_exists') || errorText.includes('email address has already been registered')) {
          errorMessage = `❌ Email Already Registered!\n\nThe email "${formData.email}" is already registered in the system.\n\nPlease use a different email address.`;
        } else if (errorText.includes('duplicate key') && errorText.includes('roll_number')) {
          errorMessage = `❌ Roll Number Already Exists!\n\nThe roll number "${formData.rollNumber}" is already assigned to another alumni.`;
        } else if (res.status === 401) {
          errorMessage = '❌ Unauthorized!\n\nYour session may have expired. Please log out and log in again.';
        } else if (res.status === 403) {
          errorMessage = '❌ Permission Denied!\n\nYou do not have permission to create alumni.';
        } else if (res.status === 500) {
          errorMessage = `❌ Server Error!\n\nAn internal server error occurred. Please try again.\n\nDetails: ${errorText.substring(0, 100)}`;
        } else {
          errorMessage = `❌ Error: ${errorText}`;
        }
        setMessage(errorMessage);
        setTimeout(() => setMessage(''), 6000);
      }
    } catch (error) {
      console.error('Network error during alumni creation:', error);
      setMessage(`❌ Network Error: ${error.message}\n\nPlease check your connection and try again.`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${backendUrl}/api/admin/management/alumni/${selectedAlumni.id}`, {
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
          isActive: formData.isActive,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setMessage(`✅ Alumni updated successfully!
          • Name: ${result.name}
          • Roll Number: ${result.rollNumber || 'N/A'}
          • Email: ${result.email}`);
        setShowModal(false);
        resetForm();
        fetchAlumni();
        setTimeout(() => setMessage(''), 5000);
      } else {
        const error = await res.text();
        setMessage(`❌ Update Failed: ${error}`);
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      setMessage(`❌ Network Error: ${error.message}\n\nPlease check your connection and try again.`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleDeleteAlumni = (alumniItem) => {
    setAlumniToDelete(alumniItem);
    setShowDeleteModal(true);
    setActionMenuOpen(null);
  };

  const confirmDeleteAlumni = async () => {
    if (!alumniToDelete) return;

    try {
      const res = await fetch(`${backendUrl}/api/admin/management/alumni/${alumniToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        setMessage(`✅ Alumni "${alumniToDelete.name}" deleted successfully!`);
        setShowDeleteModal(false);
        setAlumniToDelete(null);
        fetchAlumni();
        setTimeout(() => setMessage(''), 5000);
      } else {
        const error = await res.text();
        setMessage(`❌ Delete Failed: ${error}`);
        setShowDeleteModal(false);
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      setMessage(`❌ Network Error: ${error.message}\n\nPlease check your connection and try again.`);
      setShowDeleteModal(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleToggleActive = async (alumniItem) => {
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
        const error = await res.text();
        setMessage(`❌ Status Update Failed: ${error}`);
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      setMessage(`❌ Network Error: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const openCreateModal = () => {
    console.log('openCreateModal called');
    resetForm();
    setModalMode('create');
    setShowModal(true);
    console.log('Modal should be open now, showModal:', true);
  };

  const openEditModal = (alumniItem) => {
    setSelectedAlumni(alumniItem);
    setFormData({
      name: alumniItem.name || '',
      rollNumber: alumniItem.rollNumber || '',
      email: alumniItem.email || '',
      position: alumniItem.position || '',
      graduationYear: alumniItem.graduationYear || '',
      experienceYears: alumniItem.experienceYears || '',
      linkedinUrl: alumniItem.linkedinUrl || '',
      advice: alumniItem.advice || '',
      isActive: alumniItem.isActive,
    });
    setModalMode('edit');
    setShowModal(true);
    setActionMenuOpen(null);
  };

  const openViewModal = (alumniItem) => {
    setSelectedAlumni(alumniItem);
    setModalMode('view');
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      rollNumber: '',
      email: '',
      password: '',
      position: '',
      graduationYear: '',
      experienceYears: '',
      linkedinUrl: '',
      advice: '',
    });
    setSelectedAlumni(null);
  };

  const filteredAlumni = alumni.filter(
    (a) =>
      a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.position?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {message && (
        <div className="auth-alert auth-alert-success" style={{ marginBottom: '1rem' }}>
          {message}
        </div>
      )}

      <div className="dashboard-card">
        <div className="card-heading">
          <span>Alumni Management</span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search
                size={15}
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
                style={{ paddingLeft: '2.2rem', paddingBottom: '0.4rem', paddingTop: '0.4rem' }}
                placeholder="Search alumni..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreateModal}>
              <UserPlus size={16} />
              <span>Add Alumni</span>
            </button>
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Name / Roll Number</th>
              <th>Email</th>
              <th>Company</th>
              <th>Position</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="empty-state">
                  Loading...
                </td>
              </tr>
            ) : filteredAlumni.length > 0 ? (
              filteredAlumni.map((alumniItem) => (
                <tr key={alumniItem.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{alumniItem.name}</div>
                    {alumniItem.rollNumber && (
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Roll: {alumniItem.rollNumber}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{alumniItem.email}</td>
                  <td>{alumniItem.companyName || '—'}</td>
                  <td>{alumniItem.position || '—'}</td>
                  <td>
                    {alumniItem.isActive ? (
                      <span className="badge-active">Active</span>
                    ) : (
                      <span className="badge-inactive">Inactive</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', position: 'relative' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionMenuOpen(actionMenuOpen === alumniItem.id ? null : alumniItem.id);
                      }}
                      title="Actions"
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
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                          zIndex: 10,
                          minWidth: '160px',
                        }}
                      >
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
                            color: '#0f172a',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
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
                            color: alumniItem.isActive ? '#f59e0b' : '#10b981',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                          <Eye size={14} />
                          <span>{alumniItem.isActive ? 'Deactivate' : 'Activate'}</span>
                        </button>

                        <div style={{ borderTop: '1px solid #e2e8f0', margin: '0.25rem 0' }} />

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
                            color: '#dc2626',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
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
                <td colSpan={6} className="empty-state">
                  No alumni found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modalMode === 'create'
                  ? 'Add New Alumni'
                  : modalMode === 'edit'
                  ? 'Edit Alumni'
                  : 'Alumni Details'}
              </h3>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => setShowModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            {modalMode === 'view' ? (
              <div className="modal-body">
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <strong>Name:</strong> {selectedAlumni?.name}
                  </div>
                  <div>
                    <strong>Roll Number:</strong> {selectedAlumni?.rollNumber || '—'}
                  </div>
                  <div>
                    <strong>Email:</strong> {selectedAlumni?.email}
                  </div>
                  <div>
                    <strong>Company:</strong> {selectedAlumni?.companyName || '—'}
                  </div>
                  <div>
                    <strong>Position:</strong> {selectedAlumni?.position || '—'}
                  </div>
                  <div>
                    <strong>Graduation Year:</strong> {selectedAlumni?.graduationYear || '—'}
                  </div>
                  <div>
                    <strong>Experience Years:</strong> {selectedAlumni?.experienceYears || '—'}
                  </div>
                  <div>
                    <strong>LinkedIn:</strong>{' '}
                    {selectedAlumni?.linkedinUrl ? (
                      <a
                        href={selectedAlumni.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#6366f1' }}
                      >
                        Profile Link
                      </a>
                    ) : (
                      '—'
                    )}
                  </div>
                  <div>
                    <strong>Advice:</strong> {selectedAlumni?.advice || '—'}
                  </div>
                  <div>
                    <strong>Interview Experiences:</strong>{' '}
                    {selectedAlumni?.interviewExperiencesCount || 0}
                  </div>
                  <div>
                    <strong>Status:</strong>{' '}
                    {selectedAlumni?.isActive ? (
                      <span className="badge-active">Active</span>
                    ) : (
                      <span className="badge-inactive">Inactive</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={modalMode === 'create' ? handleCreate : handleUpdate}>
                <div className="modal-body">
                  {/* Info Box - Only show in create mode */}
                  {modalMode === 'create' && (
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
                      <strong style={{ color: '#1e40af' }}>One-Click Alumni Creation</strong><br/>
                      <span style={{ fontSize: '0.875rem', color: '#1e40af' }}>
                        This will automatically create:
                      </span>
                      <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', fontSize: '0.875rem', color: '#1e40af' }}>
                        <li>✓ Login credentials in Supabase Auth</li>
                        <li>✓ Alumni record in database</li>
                      </ul>
                      <em style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Email must be unique!</em>
                    </div>
                  )}

                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <label className="input-label">
                        Name <span style={{ color: 'red' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="text-input"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="input-label">Roll Number</label>
                      <input
                        type="text"
                        className="text-input"
                        value={formData.rollNumber}
                        onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                      />
                    </div>

                    {modalMode === 'edit' && (
                      <div>
                        <label className="input-label">Email</label>
                        <input
                          type="email"
                          className="text-input"
                          value={formData.email}
                          disabled
                          style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                        />
                      </div>
                    )}

                    {modalMode === 'create' && (
                      <>
                        <div>
                          <label className="input-label">
                            Email <span style={{ color: 'red' }}>*</span>
                          </label>
                          <input
                            type="email"
                            className="text-input"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                          />
                        </div>

                        <div>
                          <label className="input-label">
                            Password <span style={{ color: 'red' }}>*</span>
                          </label>
                          <input
                            type="password"
                            className="text-input"
                            value={formData.password}
                            onChange={(e) =>
                              setFormData({ ...formData, password: e.target.value })
                            }
                            required
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="input-label">Position</label>
                      <input
                        type="text"
                        className="text-input"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        placeholder="e.g., Software Engineer"
                      />
                    </div>

                    <div>
                      <label className="input-label">Graduation Year</label>
                      <input
                        type="number"
                        className="text-input"
                        value={formData.graduationYear}
                        onChange={(e) =>
                          setFormData({ ...formData, graduationYear: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="input-label">Experience Years</label>
                      <input
                        type="number"
                        className="text-input"
                        value={formData.experienceYears}
                        onChange={(e) =>
                          setFormData({ ...formData, experienceYears: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="input-label">LinkedIn URL</label>
                      <input
                        type="url"
                        className="text-input"
                        value={formData.linkedinUrl}
                        onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>

                    <div>
                      <label className="input-label">Advice for Students</label>
                      <textarea
                        className="text-input"
                        rows={3}
                        value={formData.advice}
                        onChange={(e) => setFormData({ ...formData, advice: e.target.value })}
                      />
                    </div>

                    {modalMode === 'edit' && (
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={(e) =>
                              setFormData({ ...formData, isActive: e.target.checked })
                            }
                          />
                          <span>Active</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <Save size={16} />
                    <span>{modalMode === 'create' ? 'Create Alumni (Auth + DB)' : 'Update'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && alumniToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Delete</h3>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => setShowDeleteModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '1rem', color: '#dc2626', fontWeight: 600 }}>
                ⚠️ Are you sure you want to delete this alumni?
              </div>

              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Name:</strong> {alumniToDelete.name}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Email:</strong> {alumniToDelete.email}
                </div>
                {alumniToDelete.rollNumber && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Roll Number:</strong> {alumniToDelete.rollNumber}
                  </div>
                )}
                {alumniToDelete.interviewExperiencesCount > 0 && (
                  <div style={{ color: '#dc2626', marginTop: '0.75rem', fontSize: '0.875rem' }}>
                    ⚠️ This alumni has <strong>{alumniToDelete.interviewExperiencesCount}</strong> interview experience(s) shared.
                  </div>
                )}
              </div>

              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                This action cannot be undone. The alumni account and all associated data will be permanently removed.
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={confirmDeleteAlumni}
                style={{ background: '#dc2626' }}
              >
                <Trash2 size={16} />
                <span>Delete Alumni</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
