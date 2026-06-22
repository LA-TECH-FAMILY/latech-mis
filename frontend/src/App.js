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
import ApplicantList from './pages/Admissions/ApplicantList';
import NewApplication from './pages/Admissions/NewApplication';
import MarkEntry from './pages/Marks/MarkEntry';
import MarkApproval from './pages/Marks/MarkApproval';
import StudentResults from './pages/Marks/StudentResults';
import RegistrationWindows from './pages/Registration/RegistrationWindows';

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

      {/* Admissions */}
      <PrivateRoute exact path="/admissions"><ApplicantList /></PrivateRoute>
      <PrivateRoute path="/admissions/new"><NewApplication /></PrivateRoute>

      {/* Registration */}
      <PrivateRoute path="/registration/windows"><RegistrationWindows /></PrivateRoute>

      {/* Marks */}
      <PrivateRoute path="/marks/enter"><MarkEntry /></PrivateRoute>
      <PrivateRoute path="/marks/approval"><MarkApproval /></PrivateRoute>
      <PrivateRoute path="/marks/results"><StudentResults /></PrivateRoute>

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
