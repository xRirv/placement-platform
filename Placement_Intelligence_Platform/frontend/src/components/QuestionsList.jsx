function questionText(question) {
  if (typeof question === 'string') return question
  return question?.question_text || question?.question || question?.canonical_text || 'Untitled question'
}

function QuestionsList({ questions }) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return (
      <section className="panel questions-panel empty-panel">
        <div className="section-heading compact-heading">
          <div><p className="eyebrow">Structured output</p><h2>Extracted questions</h2></div>
        </div>
        <p className="empty-copy">No questions were returned by the backend for this experience.</p>
      </section>
    )
  }

  return (
    <section className="panel questions-panel" aria-labelledby="questions-title">
      <div className="section-heading compact-heading">
        <div><p className="eyebrow">Structured output</p><h2 id="questions-title">Extracted questions</h2></div>
        <span className="count-badge">{questions.length} items</span>
      </div>
      <div className="questions-list">
        {questions.map((question, index) => (
          <article className="question-row" key={`${questionText(question)}-${index}`}>
            <span className="question-number">{String(index + 1).padStart(2, '0')}</span>
            <div className="question-content">
              <p>{questionText(question)}</p>
              <div className="question-meta">
                {question?.category && <span>{question.category}</span>}
                {question?.topic && <span>{question.topic}</span>}
                {question?.difficulty && <span>{question.difficulty}</span>}
                {question?.round && <span>Round {question.round}</span>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default QuestionsList
