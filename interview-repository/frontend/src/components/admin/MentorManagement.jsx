import { useState, useEffect } from 'react';
import { UserPlus, Search, Edit2, Trash2, Eye, X, Save, Users, UserMinus } from 'lucide-react';

export const MentorManagement = ({ session }) => {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [message, setMessage] = useState('');

  // Mentees management state
  const [showMenteesModal, setShowMenteesModal] = useState(false);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [menteesLoading, setMenteesLoading] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    facultyId: '',
    email: '',
    password: '',
    bio: '',
    expertise: '',
  });

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

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

  useEffect(() => {
    if (session?.access_token) fetchMentors();
  }, [session]);

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

  const handleCreate = async (e) => {
    e.preventDefault();
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
        setMessage('Mentor created successfully!');
        setShowModal(false);
        resetForm();
        fetchMentors();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await res.text();
        setMessage(`Error: ${error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(
        `${backendUrl}/api/admin/management/mentors/${selectedMentor.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            facultyId: formData.facultyId,
            bio: formData.bio,
            expertise: formData.expertise,
            isActive: formData.isActive,
          }),
        }
      );

      if (res.ok) {
        setMessage('Mentor updated successfully!');
        setShowModal(false);
        resetForm();
        fetchMentors();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await res.text();
        setMessage(`Error: ${error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this mentor?')) return;

    try {
      const res = await fetch(`${backendUrl}/api/admin/management/mentors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        setMessage('Mentor deleted successfully!');
        fetchMentors();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setShowModal(true);
  };

  const openEditModal = (mentor) => {
    setSelectedMentor(mentor);
    setFormData({
      name: mentor.name || '',
      facultyId: mentor.facultyId || '',
      email: mentor.email || '',
      bio: mentor.bio || '',
      expertise: mentor.expertise || '',
      isActive: mentor.isActive,
    });
    setModalMode('edit');
    setShowModal(true);
  };

  const openViewModal = (mentor) => {
    setSelectedMentor(mentor);
    setModalMode('view');
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      facultyId: '',
      email: '',
      password: '',
      bio: '',
      expertise: '',
    });
    setSelectedMentor(null);
  };

  const filteredMentors = mentors.filter(
    (m) =>
      m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.facultyId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.expertise?.toLowerCase().includes(searchQuery.toLowerCase())
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
          <span>Mentor Management</span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6766B7',
                }}
              />
              <input
                type="text"
                className="text-input"
                style={{ paddingLeft: '2.2rem', paddingBottom: '0.4rem', paddingTop: '0.4rem' }}
                placeholder="Search mentors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreateModal}>
              <UserPlus size={16} />
              <span>Add Mentor</span>
            </button>
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Name / Faculty ID</th>
              <th>Email</th>
              <th>Expertise</th>
              <th>Students</th>
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
            ) : filteredMentors.length > 0 ? (
              filteredMentors.map((mentor) => (
                <tr key={mentor.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{mentor.name}</div>
                    {mentor.facultyId && (
                      <div style={{ fontSize: '0.8rem', color: '#353454' }}>
                        Faculty ID: {mentor.facultyId}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{mentor.email}</td>
                  <td>{mentor.expertise || '—'}</td>
                  <td>{mentor.studentsCount || 0}</td>
                  <td>
                    {mentor.isActive ? (
                      <span className="badge-active">Active</span>
                    ) : (
                      <span className="badge-inactive">Inactive</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() => openMenteesModal(mentor)}
                        title="Manage Mentees"
                      >
                        <Users size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => openViewModal(mentor)}
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() => openEditModal(mentor)}
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => handleDelete(mentor.id)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="empty-state">
                  No mentors found.
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
                  ? 'Add New Mentor'
                  : modalMode === 'edit'
                  ? 'Edit Mentor'
                  : 'Mentor Details'}
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
                    <strong>Name:</strong> {selectedMentor?.name}
                  </div>
                  <div>
                    <strong>Faculty ID:</strong> {selectedMentor?.facultyId || '—'}
                  </div>
                  <div>
                    <strong>Email:</strong> {selectedMentor?.email}
                  </div>
                  <div>
                    <strong>Bio:</strong> {selectedMentor?.bio || '—'}
                  </div>
                  <div>
                    <strong>Expertise:</strong> {selectedMentor?.expertise || '—'}
                  </div>
                  <div>
                    <strong>Students Count:</strong> {selectedMentor?.studentsCount || 0}
                  </div>
                  <div>
                    <strong>Status:</strong>{' '}
                    {selectedMentor?.isActive ? (
                      <span className="badge-active">Active</span>
                    ) : (
                      <span className="badge-inactive">Inactive</span>
                    )}
                  </div>
                  {selectedMentor?.students && selectedMentor.students.length > 0 && (
                    <div>
                      <strong>Students:</strong>
                      <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                        {selectedMentor.students.map((s) => (
                          <li key={s.studentId}>
                            {s.name} ({s.email})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={modalMode === 'create' ? handleCreate : handleUpdate}>
                <div className="modal-body">
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
                      <label className="input-label">Faculty ID</label>
                      <input
                        type="text"
                        className="text-input"
                        value={formData.facultyId}
                        onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                      />
                    </div>

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
                      <label className="input-label">Bio</label>
                      <textarea
                        className="text-input"
                        rows={3}
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="input-label">Expertise</label>
                      <input
                        type="text"
                        className="text-input"
                        value={formData.expertise}
                        onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                        placeholder="e.g., Backend Development, System Design"
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
                    <span>{modalMode === 'create' ? 'Create' : 'Update'}</span>
                  </button>
                </div>
              </form>
            )}
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
                className="btn btn-secondary btn-xs"
                onClick={() => setShowMenteesModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Current Mentees Section */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#23304D' }}>
                  Current Mentees ({selectedMentor.students?.length || 0})
                </h4>
                {menteesLoading ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: '#353454' }}>Loading...</div>
                ) : selectedMentor.students && selectedMentor.students.length > 0 ? (
                  <div style={{ border: '1px solid #C8C7EB', borderRadius: '8px', overflow: 'hidden' }}>
                    {selectedMentor.students.map((student) => (
                      <div
                        key={student.studentId}
                        style={{
                          padding: '0.75rem 1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid #C8C7EB',
                          background: '#EAEAF7',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: '#23304D' }}>{student.name}</div>
                          <div style={{ fontSize: '0.875rem', color: '#353454' }}>
                            {student.email} • {student.college}
                          </div>
                          {student.degree && (
                            <div style={{ fontSize: '0.75rem', color: '#6766B7' }}>{student.degree}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => handleUnassignStudent(student.studentId)}
                          style={{ background: '#f8e6ee', color: '#b3405f', border: 'none' }}
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
                      background: '#EAEAF7',
                      borderRadius: '8px',
                      color: '#353454',
                    }}
                  >
                    No mentees assigned yet
                  </div>
                )}
              </div>

              {/* Add Mentee Section */}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#23304D' }}>
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
                      color: '#6766B7',
                    }}
                  />
                  <input
                    type="text"
                    className="text-input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="Search students by name or email..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                  />
                </div>
                {menteesLoading ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: '#353454' }}>Loading...</div>
                ) : (
                  <div style={{ border: '1px solid #C8C7EB', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {availableStudents
                      .filter((student) => {
                        // Filter out students already assigned to this mentor
                        const isAlreadyAssigned = selectedMentor.students?.some(
                          (s) => s.studentId === student.id
                        );
                        if (isAlreadyAssigned) return false;

                        // Search filter
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
                            borderBottom: '1px solid #C8C7EB',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: '#23304D' }}>{student.name}</div>
                            <div style={{ fontSize: '0.875rem', color: '#353454' }}>
                              {student.email} • {student.college}
                            </div>
                            {student.mentorName && (
                              <div style={{ fontSize: '0.75rem', color: '#9a7a3a' }}>
                                Currently assigned to: {student.mentorName}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
                            onClick={() => handleAssignStudent(student.id)}
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
                          color: '#353454',
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
                className="btn btn-primary"
                onClick={() => setShowMenteesModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
