function ExperienceForm({ experienceId, onChange, onSubmit, busy }) {
  return (
    <form className="experience-form" onSubmit={onSubmit}>
      <label htmlFor="experience-id">Experience ID</label>
      <div className="form-row">
        <input
          id="experience-id"
          value={experienceId}
          onChange={(event) => onChange(event.target.value)}
          placeholder="exp_8842"
          spellCheck="false"
          autoComplete="off"
          disabled={busy}
        />
        <button type="submit" disabled={busy || !experienceId.trim()}>
          {busy ? 'Processing...' : 'Process experience'}
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <p className="form-hint">Submit an existing ID to watch its real backend state.</p>
    </form>
  )
}

export default ExperienceForm
