import { Navigate, Route, Routes } from 'react-router-dom';
import '../styles/workspace.css';
import './Dashboard.css'; // ExperienceModal (submission form) styles
import { StudentDataProvider } from './student/StudentData';
import { StudentShell } from './student/StudentShell';
import { Overview } from './student/Overview';
import { ExperiencesPage, ExperienceDetailPage } from './student/Experiences';
import { SubmissionsPage } from './student/Submissions';
import { QuestionBankPage } from './student/QuestionBankPage';
import { StudyPlanPage } from './student/StudyPlan';
import { AssistantPage } from './student/AssistantPage';
import { ProfilePage } from './student/ProfilePage';
import { CompaniesPage } from './student/CompaniesPage';
import { MentorPage } from './student/MentorPage';

/** Student workspace: shared data provider + sidebar shell + one route per page (mounted at /student/*). */
export const StudentDashboard = ({ user, session, userProfile }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
  return (
    <StudentDataProvider session={session} backendUrl={backendUrl}>
      <Routes>
        <Route element={<StudentShell user={user} userProfile={userProfile} />}>
          <Route index element={<Overview userProfile={userProfile} />} />
          <Route path="experiences" element={<ExperiencesPage />} />
          <Route path="experiences/:id" element={<ExperienceDetailPage />} />
          <Route path="submissions" element={<SubmissionsPage />} />
          <Route path="questions" element={<QuestionBankPage />} />
          <Route path="plan" element={<StudyPlanPage />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="profile" element={<ProfilePage user={user} />} />
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="mentor" element={<MentorPage />} />
          <Route path="*" element={<Navigate to="/student" replace />} />
        </Route>
      </Routes>
    </StudentDataProvider>
  );
};
