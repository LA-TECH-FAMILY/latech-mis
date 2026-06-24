import React from 'react';
import { BrowserRouter as Router, Switch, Route, Redirect } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Spinner from './components/Spinner';

// Pages
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Faculties from './pages/Academic/Faculties';
import Departments from './pages/Academic/Departments';
import Programmes from './pages/Academic/Programmes';
import AcademicYears from './pages/Academic/AcademicYears';
import Intakes from './pages/Academic/Intakes';
import ApplicantList from './pages/Admissions/ApplicantList';
import NewApplication from './pages/Admissions/NewApplication';
import ApplicantDetail from './pages/Admissions/ApplicantDetail';
import Courses from './pages/Curriculum/Courses';
import ProgrammeCurriculum from './pages/Curriculum/ProgrammeCurriculum';
import MarkEntry from './pages/Marks/MarkEntry';
import MarkApproval from './pages/Marks/MarkApproval';
import StudentResults from './pages/Marks/StudentResults';
import RegistrationWindows from './pages/Registration/RegistrationWindows';
import RegisterStudent from './pages/Registration/RegisterStudent';
import UserList from './pages/Users/UserList';
import NewUser from './pages/Users/NewUser';
import FeeStructure from './pages/Finance/FeeStructure';
import Invoices from './pages/Finance/Invoices';
import InvoiceDetail from './pages/Finance/InvoiceDetail';

function PrivateRoute({ children, ...rest }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  return (
    <Route {...rest}>
      {user ? <Layout>{children}</Layout> : <Redirect to="/login" />}
    </Route>
  );
}

function PublicRoute({ children, ...rest }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  return (
    <Route {...rest}>
      {user ? <Redirect to="/" /> : children}
    </Route>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <PublicRoute path="/login"><Login /></PublicRoute>

      <PrivateRoute exact path="/"><Dashboard /></PrivateRoute>

      {/* Academic Structure */}
      <PrivateRoute path="/academic/faculties"><Faculties /></PrivateRoute>
      <PrivateRoute path="/academic/departments"><Departments /></PrivateRoute>
      <PrivateRoute path="/academic/programmes"><Programmes /></PrivateRoute>
      <PrivateRoute path="/academic/years"><AcademicYears /></PrivateRoute>
      <PrivateRoute path="/academic/intakes"><Intakes /></PrivateRoute>

      {/* Admissions */}
      <PrivateRoute exact path="/admissions"><ApplicantList /></PrivateRoute>
      <PrivateRoute path="/admissions/new"><NewApplication /></PrivateRoute>
      <PrivateRoute path="/admissions/:id"><ApplicantDetail /></PrivateRoute>

      {/* Curriculum */}
      <PrivateRoute path="/curriculum/courses"><Courses /></PrivateRoute>
      <PrivateRoute path="/curriculum/programmes"><ProgrammeCurriculum /></PrivateRoute>

      {/* Registration */}
      <PrivateRoute path="/registration/windows"><RegistrationWindows /></PrivateRoute>
      <PrivateRoute path="/registration/register"><RegisterStudent /></PrivateRoute>

      {/* Marks */}
      <PrivateRoute path="/marks/enter"><MarkEntry /></PrivateRoute>
      <PrivateRoute path="/marks/approval"><MarkApproval /></PrivateRoute>
      <PrivateRoute path="/marks/results"><StudentResults /></PrivateRoute>

      {/* Finance */}
      <PrivateRoute path="/finance/fee-structure"><FeeStructure /></PrivateRoute>
      <PrivateRoute exact path="/finance/invoices"><Invoices /></PrivateRoute>
      <PrivateRoute path="/finance/invoices/:id"><InvoiceDetail /></PrivateRoute>

      {/* Users */}
      <PrivateRoute exact path="/users"><UserList /></PrivateRoute>
      <PrivateRoute path="/users/new"><NewUser /></PrivateRoute>

      <Redirect to="/" />
    </Switch>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
