-- ============================================================
-- Latech MIS — Database Schema
-- Single-institution MVP
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- FOUNDATION — Users & RBAC
-- ============================================================

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  other_names VARCHAR(100),
  phone VARCHAR(20),
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  date_of_birth DATE,
  profile_photo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role_id)
);

-- ============================================================
-- ACADEMIC STRUCTURE
-- ============================================================

CREATE TABLE faculties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  dean_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  faculty_id UUID NOT NULL REFERENCES faculties(id) ON DELETE RESTRICT,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  hod_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE programmes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  award_type VARCHAR(50) NOT NULL CHECK (award_type IN ('certificate', 'diploma', 'degree', 'postgrad_diploma', 'masters', 'phd')),
  duration_years NUMERIC(3,1) NOT NULL,
  study_mode VARCHAR(20) NOT NULL CHECK (study_mode IN ('full_time', 'part_time', 'distance', 'weekend')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label VARCHAR(20) UNIQUE NOT NULL, -- e.g. "2025/2026"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE intakes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  programme_id UUID NOT NULL REFERENCES programmes(id),
  intake_label VARCHAR(50) NOT NULL, -- e.g. "August 2025"
  intake_month VARCHAR(20) NOT NULL CHECK (intake_month IN ('january', 'may', 'august')),
  capacity INT,
  is_open BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (programme_id, academic_year_id, intake_month)
);

-- ============================================================
-- CURRICULUM
-- ============================================================

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  credit_units NUMERIC(4,1) NOT NULL DEFAULT 3,
  level VARCHAR(20) NOT NULL CHECK (level IN ('100', '200', '300', '400', '500', '600', '700')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Programme curriculum: courses per year/semester, versioned per intake year
CREATE TABLE programme_curriculum (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  programme_id UUID NOT NULL REFERENCES programmes(id),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id), -- curriculum version
  course_id UUID NOT NULL REFERENCES courses(id),
  year_of_study INT NOT NULL CHECK (year_of_study BETWEEN 1 AND 6),
  semester INT NOT NULL CHECK (semester IN (1, 2, 3)),
  is_core BOOLEAN DEFAULT TRUE, -- core vs elective
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (programme_id, academic_year_id, course_id)
);

-- ============================================================
-- ADMISSIONS
-- ============================================================

CREATE TABLE applicants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_no VARCHAR(30) UNIQUE NOT NULL, -- e.g. APP-2025-000001
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  other_names VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  date_of_birth DATE,
  nationality VARCHAR(100),
  district_of_origin VARCHAR(100),
  disability_status VARCHAR(100),
  application_type VARCHAR(20) NOT NULL CHECK (application_type IN ('online', 'walk_in')),
  status VARCHAR(30) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'shortlisted', 'interviewed', 'offered', 'accepted', 'rejected', 'withdrawn', 'enrolled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE application_programmes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  applicant_id UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  intake_id UUID NOT NULL REFERENCES intakes(id),
  preference_order INT NOT NULL DEFAULT 1,
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'offered', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE applicant_qualifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  applicant_id UUID NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  qualification_type VARCHAR(50) NOT NULL, -- e.g. 'O-Level', 'A-Level', 'Diploma', 'Degree'
  institution_name VARCHAR(255) NOT NULL,
  year_obtained INT,
  grade_or_gpa VARCHAR(50),
  document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE admission_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  applicant_id UUID NOT NULL REFERENCES applicants(id),
  intake_id UUID NOT NULL REFERENCES intakes(id),
  offer_letter_url TEXT,
  offered_at TIMESTAMPTZ DEFAULT NOW(),
  offered_by UUID REFERENCES users(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired'))
);

-- ============================================================
-- STUDENTS
-- ============================================================

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  student_no VARCHAR(30) UNIQUE NOT NULL, -- e.g. UCU-2025-000001
  applicant_id UUID REFERENCES applicants(id),
  intake_id UUID NOT NULL REFERENCES intakes(id),
  programme_id UUID NOT NULL REFERENCES programmes(id),
  year_of_study INT NOT NULL DEFAULT 1,
  student_type VARCHAR(20) NOT NULL DEFAULT 'government'
    CHECK (student_type IN ('government', 'private', 'international', 'staff_dependent')),
  nationality VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('admitted','active','deferred','discontinued','completed','graduated','suspended','transfer','pending_transcript')),
  enrollment_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REGISTRATION
-- ============================================================

CREATE TABLE registration_windows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  semester INT NOT NULL CHECK (semester IN (1, 2, 3)),
  open_date TIMESTAMPTZ NOT NULL,
  close_date TIMESTAMPTZ NOT NULL,
  min_clearance_percent NUMERIC(5,2) NOT NULL DEFAULT 60.00,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE student_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  semester INT NOT NULL CHECK (semester IN (1, 2, 3)),
  clearance_percent NUMERIC(5,2) NOT NULL DEFAULT 0,  -- pulled from invoice at initiation
  status VARCHAR(30) NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated','accounts_cleared','academics_cleared','accommodation_cleared','fully_registered','rejected','withdrawn')),
  initiated_by UUID REFERENCES users(id),
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Stage clearances
  accounts_cleared_by UUID REFERENCES users(id),
  accounts_cleared_at TIMESTAMPTZ,
  academics_cleared_by UUID REFERENCES users(id),
  academics_cleared_at TIMESTAMPTZ,
  accommodation_cleared_by UUID REFERENCES users(id),
  accommodation_cleared_at TIMESTAMPTZ,
  -- Financial waiver
  financial_waiver BOOLEAN NOT NULL DEFAULT FALSE,
  waiver_reason TEXT,
  waiver_granted_by UUID REFERENCES users(id),
  waiver_granted_at TIMESTAMPTZ,
  notes TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, academic_year_id, semester)
);

CREATE TABLE registered_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id UUID NOT NULL REFERENCES student_registrations(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (registration_id, course_id)
);

-- ============================================================
-- MARKS & RESULTS
-- ============================================================

CREATE TABLE mark_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  semester INT NOT NULL CHECK (semester IN (1, 2, 3)),
  coursework_mark NUMERIC(5,2),
  exam_mark NUMERIC(5,2),
  total_mark NUMERIC(5,2) GENERATED ALWAYS AS (
    COALESCE(coursework_mark, 0) * 0.4 + COALESCE(exam_mark, 0) * 0.6
  ) STORED,
  grade VARCHAR(5),
  grade_point NUMERIC(4,2),
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'hod_approved', 'registrar_approved', 'published')),
  entered_by UUID REFERENCES users(id),
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  hod_approved_by UUID REFERENCES users(id),
  hod_approved_at TIMESTAMPTZ,
  registrar_approved_by UUID REFERENCES users(id),
  registrar_approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  UNIQUE (student_id, course_id, academic_year_id, semester)
);

-- ============================================================
-- FINANCE
-- ============================================================

-- Fee items catalogue (e.g. Tuition, Functional, Caution)
CREATE TABLE fee_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fee structure: amount per programme / year of study / semester
CREATE TABLE fee_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  programme_id UUID REFERENCES programmes(id),   -- NULL = applies to all programmes
  year_of_study INT,                              -- NULL = applies to all years
  semester INT CHECK (semester IN (1,2,3)),       -- NULL = applies to all semesters
  fee_item_id UUID NOT NULL REFERENCES fee_items(id),
  amount NUMERIC(12,2) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (academic_year_id, programme_id, year_of_study, semester, fee_item_id)
);

-- Invoice generated per student per registration period
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_no VARCHAR(30) UNIQUE NOT NULL,        -- INV-2025-000001
  student_id UUID NOT NULL REFERENCES students(id),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  semester INT NOT NULL CHECK (semester IN (1,2,3)),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  clearance_percent NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_amount = 0 THEN 100
         ELSE ROUND((amount_paid / total_amount) * 100, 2)
    END
  ) STORED,
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'partial', 'paid', 'waived', 'cancelled')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Line items on each invoice
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  fee_item_id UUID NOT NULL REFERENCES fee_items(id),
  description VARCHAR(200) NOT NULL,
  amount NUMERIC(12,2) NOT NULL
);

-- Payment receipts
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_no VARCHAR(30) UNIQUE NOT NULL,        -- RCT-2025-000001
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  student_id UUID NOT NULL REFERENCES students(id),
  amount NUMERIC(12,2) NOT NULL,
  payment_method VARCHAR(30) NOT NULL DEFAULT 'bank'
    CHECK (payment_method IN ('bank', 'mobile_money', 'cash', 'online', 'waiver')),
  reference_no VARCHAR(100),                     -- bank/mobile money ref
  payment_date DATE NOT NULL,
  received_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOG (append-only)
-- ============================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent updates and deletes on audit_log
CREATE RULE audit_log_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE audit_log_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_students_student_no ON students(student_no);
CREATE INDEX idx_students_user ON students(user_id);
CREATE INDEX idx_students_programme ON students(programme_id);
CREATE INDEX idx_applicants_reference ON applicants(reference_no);
CREATE INDEX idx_mark_entries_student ON mark_entries(student_id);
CREATE INDEX idx_mark_entries_course ON mark_entries(course_id);
CREATE INDEX idx_mark_entries_status ON mark_entries(status);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_registered_courses_registration ON registered_courses(registration_id);
CREATE INDEX idx_invoices_student ON invoices(student_id);
CREATE INDEX idx_invoices_year_sem ON invoices(academic_year_id, semester);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_student ON payments(student_id);
