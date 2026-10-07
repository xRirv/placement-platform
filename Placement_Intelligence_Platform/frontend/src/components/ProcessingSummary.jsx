function displayValue(value) {
  return value === undefined || value === null || value === '' ? 'Not provided' : value
}

function ProcessingSummary({ record }) {
  const questions = Array.isArray(record?.questions) ? record.questions : []
  const topicCount = new Set(
    questions.map((question) => question?.topic || question?.category).filter(Boolean),
  ).size

  const metrics = [
    ['Status', displayValue(record?.status)],
    ['Stage', displayValue(record?.stage)],
    ['Questions', questions.length || 'Not provided'],
    ['Topics', topicCount || 'Not provided'],
  ]

  return (
    <section className="panel summary-panel" aria-labelledby="summary-title">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">Live response</p>
          <h2 id="summary-title">Processing summary</h2>
        </div>
        <span className={`status-chip status-${String(record?.status || 'idle').toLowerCase()}`}>
          {record?.status || 'IDLE'}
        </span>
      </div>
      <div className="metric-grid">
        {metrics.map(([label, value]) => (
          <div className="metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="source-fields">
        <div><span>Experience ID</span><code>{record?.experience_id || '—'}</code></div>
        <div><span>Questions summary</span><p>{displayValue(record?.questions_summary)}</p></div>
        <div><span>Tips</span><p>{displayValue(record?.tips)}</p></div>
      </div>
    </section>
  )
}

export default ProcessingSummary
