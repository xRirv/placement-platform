const STAGES = [
  { key: 'api', label: 'API request', short: 'API' },
  { key: 'queue', label: 'RabbitMQ queue', short: 'Queue' },
  { key: 'worker', label: 'Ingestion worker', short: 'Worker' },
  { key: 'prepare', label: 'Prepare', short: 'Prepare' },
  { key: 'extract', label: 'Extract', short: 'Extract' },
  { key: 'normalize', label: 'Normalize', short: 'Normalize' },
  { key: 'resolve', label: 'Resolve', short: 'Resolve' },
  { key: 'classify', label: 'Classify', short: 'Classify' },
  { key: 'database', label: 'PostgreSQL', short: 'DB' },
]

function stageIndex(status, stage) {
  if (status === 'COMPLETED') return STAGES.length - 1
  if (status === 'FAILED' || status === 'ERROR') {
    return stageIndex('PROCESSING', stage)
  }
  if (status === 'QUEUED') return 1

  const normalized = String(stage || '').toUpperCase()
  if (normalized.includes('PERSIST')) return 8
  if (normalized.includes('CLASS')) return 7
  if (normalized.includes('RESOL')) return 6
  if (normalized.includes('NORMAL')) return 5
  if (normalized.includes('EXTRACT')) return 4
  if (normalized.includes('PREPARE')) return 3
  if (normalized.includes('AI')) return 2
  return 2
}

function Pipeline({ status, stage }) {
  const currentIndex = stageIndex(status, stage)
  const failed = status === 'FAILED' || status === 'ERROR'

  return (
    <section className="panel pipeline-panel" aria-labelledby="pipeline-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Observed path</p>
          <h2 id="pipeline-title">Processing pipeline</h2>
        </div>
        <span className="stage-readout">{stage || 'Awaiting request'}</span>
      </div>
      <div className="pipeline-track">
        {STAGES.map((item, index) => {
          const isCurrent = status !== 'COMPLETED' && index === currentIndex
          const isFailed = failed && isCurrent
          const state = isFailed ? 'failed' : index < currentIndex || status === 'COMPLETED' ? 'completed' : isCurrent ? 'processing' : 'pending'
          return (
            <div className="pipeline-step" key={item.key}>
              <div className={`step-node ${state}`}>
                {state === 'completed' && '✓'}
                {state === 'failed' && '!'}
                {state === 'processing' && <span className="pulse-dot" />}
                {state === 'pending' && <span>{String(index + 1).padStart(2, '0')}</span>}
              </div>
              <div className="step-copy">
                <strong>{item.short}</strong>
                <span>{item.label}</span>
              </div>
              {index < STAGES.length - 1 && <div className={`step-connector ${index < currentIndex ? 'complete' : ''}`} />}
            </div>
          )
        })}
      </div>
      <p className="pipeline-note">Stage detail is inferred only from the status fields exposed by the backend.</p>
    </section>
  )
}

export default Pipeline
