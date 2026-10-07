// Formatting helpers shared by the student workspace.

export const formatDate = (value, opts = { month: 'short', day: 'numeric', year: 'numeric' }) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString(undefined, opts);
};

export const countQuestions = (exp) =>
  (exp?.rounds || []).reduce((acc, r) => acc + (r.questions ? r.questions.length : 0), 0);

export const asArray = (data) => (Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : []);
