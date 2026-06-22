# Latech MIS

Institutional Management Information System for universities and colleges.

## Stack
- **Backend:** Node.js + Express + PostgreSQL
- **Frontend:** React + Tailwind CSS

## Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env     # fill in DB credentials and JWT_SECRET
npm run db:migrate        # creates all tables
npm run db:seed           # seeds roles + default admin
npm run dev               # starts on port 5000
```

Default admin: `admin@latech.ac.ug` / `Admin@1234`

### Frontend
```bash
cd frontend
npm install
npm start                 # starts on port 3000
```

## Modules (Phase 2 — Academics Core)
- Auth (JWT login, roles)
- Academic Structure (faculties, departments, programmes, intakes)
- Admissions (applications, offers, enrolment)
- Curriculum (courses, programme curriculum per year)
- Student Registration (clearance gate, course registration)
- Marks & Results (entry → HoD approval → Registrar approval → publish)

## API Base URL
`http://localhost:5000/api`

## Role List
`admin`, `registrar`, `admissions_officer`, `dean`, `hod`, `lecturer`, `hr_officer`, `finance_officer`, `bursar`, `student`, `applicant`, `auditor`
