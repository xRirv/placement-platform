import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createApi } from '../../lib/api';
import { asArray } from '../../lib/format';

/**
 * Loads one backend resource with explicit loading / error / data states and a reload().
 * reload() switches back to loading in the event handler; the effect only sets state after
 * the request settles (keeps the react-hooks set-state-in-effect rule happy).
 */
const useResource = (fetcher, enabled = true) => {
  const [key, setKey] = useState(0);
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    if (!enabled) return undefined;
    let ignore = false;
    fetcher()
      .then((data) => !ignore && setState({ loading: false, error: null, data }))
      .catch((err) => !ignore && setState((s) => ({ loading: false, error: err.message, data: s.data })));
    return () => {
      ignore = true;
    };
  }, [fetcher, enabled, key]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    setKey((k) => k + 1);
  }, []);

  return { ...state, reload };
};

const StudentDataContext = createContext(null);

export const StudentDataProvider = ({ session, backendUrl, children }) => {
  const token = session?.access_token;
  const api = useMemo(() => createApi(backendUrl, token), [backendUrl, token]);

  const fetchProfile = useCallback(() => api.get('/api/student/profile'), [api]);
  const fetchExperiences = useCallback(() => api.get('/api/interviews?size=100').then(asArray), [api]);
  // /api/interviews/my returns a Spring Page ({ content: [...] }), not an array.
  const fetchSubmissions = useCallback(() => api.get('/api/interviews/my?size=100').then(asArray), [api]);
  const fetchPlans = useCallback(
    () =>
      Promise.all([api.get('/api/study-plans'), api.get('/api/progress/summary')]).then(([plans, summary]) => ({
        plans: Array.isArray(plans) ? plans : [],
        summary,
      })),
    [api],
  );

  const profile = useResource(fetchProfile, Boolean(token));
  const experiences = useResource(fetchExperiences, Boolean(token));
  const submissions = useResource(fetchSubmissions, Boolean(token));
  const plans = useResource(fetchPlans, Boolean(token));

  const value = useMemo(
    () => ({ api, backendUrl, session, profile, experiences, submissions, plans }),
    [api, backendUrl, session, profile, experiences, submissions, plans],
  );
  return <StudentDataContext.Provider value={value}>{children}</StudentDataContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useStudentData = () => {
  const ctx = useContext(StudentDataContext);
  if (!ctx) throw new Error('useStudentData must be used inside StudentDataProvider');
  return ctx;
};
