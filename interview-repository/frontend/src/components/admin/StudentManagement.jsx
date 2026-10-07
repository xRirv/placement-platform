import { useState, useEffect } from 'react';
import {
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Upload,
  X,
  Save,
  UserCheck,
  UserX,
} from 'lucide-react';

export const StudentManagement = ({ session }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'view'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    email: '',
    password: '',
    phone: '',
    college: '',
    degree: '',
    graduationYear: '',
    skills: '',
    bio: '',
  });

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/admin/management/students?size=100`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(data.content || []);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.access_token) fetchStudents();
  }, [session]);

  const handleCreate = async (e) => {
    e.preventDefault();
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
        setMessage('Student created successfully!');
        setShowModal(false);
        resetForm();
        fetchStudents();
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
        `${backendUrl}/api/admin/management/students/${selectedStudent.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            rollNumber: formData.rollNumber,
            phone: formData.phone,
            college: formData.college,
            degree: formData.degree,
            graduationYear: formData.graduationYear ? parseInt(formData.graduationYear) : null,
            skills: formData.skills,
            bio: formData.bio,
            isActive: formData.isActive,
          }),
        }
      );

      if (res.ok) {
        setMessage('Student updated successfully!');
        setShowModal(false);
        resetForm();
        fetchStudents();
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
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
      const res = await fetch(`${backendUrl}/api/admin/management/students/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        setMessage('Student deleted successfully!');
        fetchStudents();
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

  const openEditModal = (student) => {
    setSelectedStudent(student);
    setFormData({
      name: student.name || '',
      rollNumber: student.rollNumber || '',
      email: student.email || '',
      phone: student.phone || '',
      college: student.college || '',
      degree: student.degree || '',
      graduationYear: student.graduationYear || '',
      skills: student.skills || '',
      bio: student.bio || '',
      isActive: student.isActive,
    });
    setModalMode('edit');
    setShowModal(true);
  };

  const openViewModal = (student) => {
    setSelectedStudent(student);
    setModalMode('view');
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      rollNumber: '',
      email: '',
      password: '',
      phone: '',
      college: '',
      degree: '',
      graduationYear: '',
      skills: '',
      bio: '',
    });
    setSelectedStudent(null);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.college?.toLowerCase().includes(searchQuery.toLowerCase())
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
          <span>Student Management</span>
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
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreateModal}>
              <UserPlus size={16} />
              <span>Add Student</span>
            </button>
          </div>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Name / Roll Number</th>
              <th>Email</th>
              <th>College</th>
              <th>Degree</th>
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
            ) : filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{student.name}</div>
                    {student.rollNumber && (
                      <div style={{ fontSize: '0.8rem', color: '#353454' }}>
                        Roll: {student.rollNumber}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{student.email}</td>
                  <td>{student.college || '—'}</td>
                  <td>{student.degree || '—'}</td>
                  <td>
                    {student.isActive ? (
                      <span className="badge-active">Active</span>
                    ) : (
                      <span className="badge-inactive">Inactive</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => openViewModal(student)}
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() => openEditModal(student)}
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => handleDelete(student.id)}
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
                  No students found.
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
                  ? 'Add New Student'
                  : modalMode === 'edit'
                  ? 'Edit Student'
                  : 'Student Details'}
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
                    <strong>Name:</strong> {selectedStudent?.name}
                  </div>
                  <div>
                    <strong>Roll Number:</strong> {selectedStudent?.rollNumber || '—'}
                  </div>
                  <div>
                    <strong>Email:</strong> {selectedStudent?.email}
                  </div>
                  <div>
                    <strong>Phone:</strong> {selectedStudent?.phone || '—'}
                  </div>
                  <div>
                    <strong>College:</strong> {selectedStudent?.college || '—'}
                  </div>
                  <div>
                    <strong>Degree:</strong> {selectedStudent?.degree || '—'}
                  </div>
                  <div>
                    <strong>Graduation Year:</strong> {selectedStudent?.graduationYear || '—'}
                  </div>
                  <div>
                    <strong>Skills:</strong> {selectedStudent?.skills || '—'}
                  </div>
                  <div>
                    <strong>Bio:</strong> {selectedStudent?.bio || '—'}
                  </div>
                  <div>
                    <strong>Status:</strong>{' '}
                    {selectedStudent?.isActive ? (
                      <span className="badge-active">Active</span>
                    ) : (
                      <span className="badge-inactive">Inactive</span>
                    )}
                  </div>
                  <div>
                    <strong>Interview Experiences:</strong>{' '}
                    {selectedStudent?.interviewExperiencesCount || 0}
                  </div>
                  <div>
                    <strong>Applications:</strong> {selectedStudent?.applicationCount || 0}
                  </div>
                  {selectedStudent?.mentorName && (
                    <div>
                      <strong>Mentor:</strong> {selectedStudent.mentorName}
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
                      <label className="input-label">Roll Number</label>
                      <input
                        type="text"
                        className="text-input"
                        value={formData.rollNumber}
                        onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
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
                      <label className="input-label">Phone</label>
                      <input
                        type="text"
                        className="text-input"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="input-label">College</label>
                      <input
                        type="text"
                        className="text-input"
                        value={formData.college}
                        onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="input-label">Degree</label>
                      <input
                        type="text"
                        className="text-input"
                        value={formData.degree}
                        onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
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
                      <label className="input-label">Skills</label>
                      <textarea
                        className="text-input"
                        rows={3}
                        value={formData.skills}
                        onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="input-label">Bio</label>
                      <textarea
                        className="text-input"
                        rows={3}
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
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
    </div>
  );
};
