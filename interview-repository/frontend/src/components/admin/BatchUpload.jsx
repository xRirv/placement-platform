import { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Download } from 'lucide-react';

export const BatchUpload = ({ session }) => {
  const [uploadType, setUploadType] = useState('students');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.xlsx')) {
      setFile(selectedFile);
      setMessage('');
    } else {
      setMessage('Please select a valid .xlsx file');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file first');
      return;
    }

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const endpoint =
        uploadType === 'students'
          ? '/api/admin/management/students/batch-upload'
          : '/api/admin/management/mentors/batch-upload';

      const res = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setMessage(
          `Upload completed! ${data.successCount} succeeded, ${data.failureCount} failed.`
        );
        setFile(null);
      } else {
        const error = await res.text();
        setMessage(`Upload failed: ${error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = (type) => {
    const templates = {
      students: {
        filename: 'students_template.csv',
        content: 'Name,RollNumber,Email,Password,Phone,College,Degree,GraduationYear,Skills\nJohn Doe,CS2024001,john@example.com,pass123,+1234567890,MIT,Computer Science,2024,"Java, Python, React"',
      },
      mentors: {
        filename: 'mentors_template.csv',
        content: 'Name,FacultyId,Email,Password,Bio,Expertise\nJane Smith,FAC2024001,jane@example.com,pass123,"Senior Engineer","Backend Development, System Design"',
      },
    };

    const template = templates[type];
    const blob = new Blob([template.content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = template.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {message && (
        <div
          className={`auth-alert ${
            result?.failureCount === 0 ? 'auth-alert-success' : 'auth-alert-error'
          }`}
          style={{ marginBottom: '1rem' }}
        >
          {message}
        </div>
      )}

      <div className="dashboard-card">
        <div className="card-heading">
          <span>Batch Upload</span>
        </div>

        <div style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="input-label">Upload Type</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  value="students"
                  checked={uploadType === 'students'}
                  onChange={(e) => setUploadType(e.target.value)}
                />
                <span>Students</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  value="mentors"
                  checked={uploadType === 'mentors'}
                  onChange={(e) => setUploadType(e.target.value)}
                />
                <span>Mentors</span>
              </label>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="input-label">Excel File (.xlsx)</label>
            <div style={{ marginTop: '0.5rem' }}>
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  width: '100%',
                }}
              />
            </div>
            {file && (
              <div
                style={{
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#059669',
                }}
              >
                <FileSpreadsheet size={16} />
                <span style={{ fontSize: '0.875rem' }}>{file.name}</span>
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              <Upload size={16} />
              <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => downloadTemplate(uploadType)}
            >
              <Download size={16} />
              <span>Download Template</span>
            </button>
          </div>

          {uploadType === 'students' && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: '#f1f5f9',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
            >
              <strong>Excel Format:</strong>
              <br />
              Columns: Name | RollNumber | Email | Password | Phone | College | Degree |
              GraduationYear | Skills
            </div>
          )}

          {uploadType === 'mentors' && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: '#f1f5f9',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}
            >
              <strong>Excel Format:</strong>
              <br />
              Columns: Name | FacultyId | Email | Password | Bio | Expertise
            </div>
          )}
        </div>

        {result && (
          <div style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
              Upload Results
            </h4>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle size={20} style={{ color: '#059669' }} />
                <span>
                  <strong>Success:</strong> {result.successCount} / {result.totalProcessed}
                </span>
              </div>

              {result.failureCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <XCircle size={20} style={{ color: '#dc2626', marginTop: '0.2rem' }} />
                  <div>
                    <strong>Failed:</strong> {result.failureCount}
                    {result.errors && result.errors.length > 0 && (
                      <ul
                        style={{
                          marginTop: '0.5rem',
                          paddingLeft: '1.5rem',
                          fontSize: '0.875rem',
                          color: '#64748b',
                        }}
                      >
                        {result.errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {result.successRecords && result.successRecords.length > 0 && (
                <div>
                  <strong>Successfully Created:</strong>
                  <ul
                    style={{
                      marginTop: '0.5rem',
                      paddingLeft: '1.5rem',
                      fontSize: '0.875rem',
                      color: '#64748b',
                    }}
                  >
                    {result.successRecords.slice(0, 10).map((record, idx) => (
                      <li key={idx}>
                        {record.name} ({record.email})
                      </li>
                    ))}
                    {result.successRecords.length > 10 && (
                      <li>... and {result.successRecords.length - 10} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
