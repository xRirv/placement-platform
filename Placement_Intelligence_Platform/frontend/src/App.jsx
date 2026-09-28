import { useEffect, useRef, useState } from 'react'
import ExperienceForm from './components/ExperienceForm'
import Pipeline from './components/Pipeline'
import ProcessingSummary from './components/ProcessingSummary'
import QuestionsList from './components/QuestionsList'
import { fetchExperienceStatus, submitExperience } from './services/api'
import './index.css'
import './dashboard.css'

const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'ERROR'])

function App() {
  const [experienceId, setExperienceId] = useState('exp_001')
  const [record, setRecord] = useState(null)
  const [requestState, setRequestState] = useState('idle')
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  async function pollStatus(id) {
    try {
      const nextRecord = await fetchExperienceStatus(id)
      setRecord(nextRecord)
      setLastUpdated(new Date())
      setError(nextRecord.error || '')

      if (TERMINAL_STATUSES.has(String(nextRecord.status || '').toUpperCase())) {
        setRequestState('complete')
        return
      }

      setRequestState('polling')
      timerRef.current = window.setTimeout(() => pollStatus(id), 1500)
    } catch (pollError) {
      setError(pollError.message || 'Unable to read processing status.')
      setRequestState('error')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const id = experienceId.trim()
    if (!id) return

    window.clearTimeout(timerRef.current)
    setError('')
    setRecord({ experience_id: id, status: 'QUEUED', stage: 'INGESTION', questions: [] })
    setRequestState('submitting')

    try {
      await submitExperience(id)
      await pollStatus(id)
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit this experience.')
      setRequestState('error')
    }
  }

  const isBusy = requestState === 'submitting' || requestState === 'polling'
  const status = record?.status || 'IDLE'

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Placement Intelligence home">
          <span className="brand-mark">PI</span>
          <span>Placement Intelligence</span>
        </a>
        <div className="connection-state"><span /> backend observer</div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">Developer console / async processing</p>
          <h1>Watch an experience<br /><em>move through the system.</em></h1>
          <p className="intro-copy">Submit one existing experience ID and observe the real queue, worker, pipeline, and persistence state as it changes.</p>
        </div>
        <div className="intro-stamp" aria-hidden="true"><span>LIVE</span><strong>01</strong><small>EXPERIENCE<br />TRACE</small></div>
      </section>

      <ExperienceForm experienceId={experienceId} onChange={setExperienceId} onSubmit={handleSubmit} busy={isBusy} />

      {error && (
        <div className="alert" role="alert">
          <span className="alert-icon">!</span>
          <div><strong>Processing needs attention</strong><p>{error}</p></div>
          <button type="button" className="retry-button" onClick={handleSubmit}>Retry</button>
        </div>
      )}

      <Pipeline status={status} stage={record?.stage} />

      {record ? (
        <div className="results-grid">
          <ProcessingSummary record={record} />
          <QuestionsList questions={record.questions} />
        </div>
      ) : (
        <section className="panel empty-panel first-state"><p className="eyebrow">No trace selected</p><h2>Enter an experience ID to begin.</h2></section>
      )}

      <footer className="footer"><span>Placement Intelligence / processing dashboard</span><span>{lastUpdated ? `Last response ${lastUpdated.toLocaleTimeString()}` : 'Awaiting a request'}</span></footer>
    </main>
  )
}

export default App
