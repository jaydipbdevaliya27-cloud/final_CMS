# 🏥 Dhyey Clinic Management System (CMS)

A modern, high-performance, full-stack **MERN** (MongoDB, Express, React, Node.js) Clinic Management System engineered specifically for fast-paced outpatient department (OPD) workflows, instant patient retrieval, and streamlined clinical administration.

---

## ⚡ Highlights & Innovations

- **🚀 0ms In-Memory Caching Architecture**: Ultra-fast patient search and master data resolution powered by client-side RAM caching (`window.patientCache` and `window.masterDataCache`), reducing typical cloud query round-trip latency from ~1,250ms down to sub-millisecond responses.
- **⚡ Rapid Keyboard Shortcut Engine**: Complete OPD consultation typing with configurable shorthand tokens (e.g., typing `PCM` automatically expands to `Paracetamol 500mg - 1 Tab TDS after meals`).
- **👨‍👩‍👧‍👦 Family-Centric Patient Records**: Group family members under a single family head with auto-generated sequential IDs (`F-XXXX`, `P-XXXX`), unified billing, and medical history.
- **🖨️ Clinical Documentation & Certificates**: One-click generation of formatted Medical Certificates, fitness assessments, and lab reports with customizable clinic header branding.
- **📱 PWA & Offline Support**: Progressive Web App enabled with Service Worker caching for seamless desktop app installation and offline resilience.
- **🔒 Enterprise Security**: Secure JWT authentication, HTTP-only cookie support, bcrypt password hashing, and MongoDB compound indexing for high query throughput.

---

## 🛠️ Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite | Lightning-fast component rendering and hot module replacement |
| **Styling & UI** | Tailwind CSS & Lucide Icons | Clean, responsive clinical interface optimized for desktop and tablets |
| **State & Cache** | Custom RAM Cache + React Context | Synchronous zero-latency lookup with automated server synchronization |
| **Backend** | Node.js, Express 5 | Scalable RESTful API architecture with centralized error handling |
| **Database** | MongoDB Atlas, Mongoose 9 | Cloud document database with optimized compound indexes on search fields |
| **Authentication**| JWT (JSON Web Tokens) & Cookies | Secure session management with role-based route protection |
| **Deployment** | Render Web Service | Unified production build where Express serves the optimized Vite client |

---

## 📁 Project Structure

```text
Final_CMS/
├── backend/
│   ├── src/
│   │   ├── config/             # Database connection & Atlas configuration
│   │   ├── controllers/        # Route logic (Auth, Patient, Visit, Search, MasterData)
│   │   ├── middleware/         # Auth verification & route guards
│   │   ├── models/             # Mongoose schemas (Doctor, Family, Patient, Visit, etc.)
│   │   ├── routes/             # RESTful API endpoints
│   │   ├── utils/              # Token generation and helper functions
│   │   └── server.js           # Server bootstrap & static asset serving
│   ├── .env.example            # Backend environment template
│   └── nodemon.json            # Nodemon live reload configuration
├── frontend/
│   ├── public/                 # Static assets, PWA manifest, and service worker
│   ├── src/
│   │   ├── assets/             # Brand logos and iconography
│   │   ├── components/         # Reusable UI widgets, inputs & report modals
│   │   │   ├── common/         # MasterDataInput, ProtectedRoute, SidebarTabs
│   │   │   └── reports/        # Investigation report modal
│   │   ├── context/            # AuthContext & global session state
│   │   ├── hooks/              # Custom React hooks (useDebounce, etc.)
│   │   ├── pages/              # Core application views
│   │   │   ├── Dashboard.jsx   # Clinical overview, universal search & KPI metrics
│   │   │   ├── PatientRecord.jsx # Comprehensive patient registry & history
│   │   │   ├── MasterDataManagement.jsx # Shortcuts, medicines & categories
│   │   │   ├── FamilyHeadRegistration.jsx
│   │   │   ├── AddMember.jsx
│   │   │   ├── Reports.jsx     # Financial & visit analytics
│   │   │   ├── MedicalCertificate.jsx # Certificate generation
│   │   │   └── DoctorProfile.jsx # Clinic letterhead & doctor settings
│   │   ├── services/           # Axios API service client
│   │   └── utils/              # Client-side cache (patientCache.js)
│   ├── .env.example            # Frontend environment template
│   └── vite.config.js          # Vite build & bundler configuration
├── .gitignore                  # Git exclusion rules
├── package.json                # Root scripts for installation and build
└── README.md                   # Project documentation
```

---

## 🚀 Key Modules & Features

### 1. Universal Search & Patient Registry
- **Instant Autocomplete**: Search by Patient Name, Phone Number, Patient ID, Family ID, Society, or Family Head Name.
- **Compound Database Indexes**: Database queries indexed on `{ name: 1, phone: 1 }` and `{ headName: 1, phone: 1 }` with query limits to prevent full database table scans.
- **Family Tree Integration**: Quickly attach new members to an existing family without re-entering address or contact details.

### 2. High-Speed OPD Consultation
- **Smart Master Data Input**: As you type in Complaint, Examination, Medicine, or Investigation fields, suggestions appear in **0ms** from preloaded local memory.
- **Dynamic Shortcut Replacement**: Hit `Space` or `Enter` after typing shorthand keywords to automatically populate detailed instructions, dosages, and notes.

### 3. Master Data Management
- Maintain central catalogs for:
  - **Medicines** (Brand, Generic, Default Dosages, Timings)
  - **Complaints & Symptoms**
  - **Findings & Clinical Observations**
  - **Investigations & Lab Tests**
  - **Dietary & Lifestyle Advice**
  - **Navigation Shortcuts** (Configurable `Alt + 1` through `Alt + 8` keybindings)

### 4. Billing, Analytics & Reports
- **Daily OPD Register**: View today's patient queue, consultation status, and prescription details.
- **Financial Analytics**: Real-time revenue tracking, fee collection summary, and exportable financial reports.
- **Investigation Tracking**: Dedicated modal for tracking diagnostic lab tests and status.

---

## ⌨️ Default Keyboard Shortcuts

| Shortcut | Destination / Action | Description |
| :--- | :--- | :--- |
| `Alt + 1` | **Dashboard** | Overview, KPI counters, and quick actions |
| `Alt + 2` | **Family Head Registration** | Create new family account and register head |
| `Alt + 3` | **Add Member** | Register member under an existing family ID |
| `Alt + 4` | **Patient Record** | Search patients and start OPD consultation |
| `Alt + 5` | **Reports** | OPD register, revenue summary, and exports |
| `Alt + 6` | **Medical Certificate** | Issue and print patient medical certificates |
| `Alt + 7` | **Master Data** | Configure medicines, shortcuts, and categories |
| `Alt + 8` | **Doctor Profile** | Manage clinic branding and credentials |

*(All shortcuts can be dynamically mapped inside **Master Data Management** > **Navigation Shortcuts**).*

---

## 📦 Getting Started (Local Setup)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.x or v20.x recommended)
- [MongoDB Atlas Account](https://www.mongodb.com/atlas) or a local MongoDB server
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/jaydipbdevaliya27-cloud/final_CMS.git
cd final_CMS
```

### 2. Install Dependencies
Install dependencies for both backend and frontend using the root script:
```bash
npm run install:all
```
*Alternatively, install manually:*
```bash
npm install --prefix backend
npm install --prefix frontend
```

### 3. Configure Environment Variables

#### Backend Configuration
Create a `.env` file in the `backend/` folder:
```bash
cp backend/.env.example backend/.env
```
Fill in your configuration:
```env
PORT=5001
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/clinic_management_db?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

#### Frontend Configuration
Create a `.env` file in the `frontend/` folder:
```bash
cp frontend/.env.example frontend/.env
```
Ensure the API endpoint is set:
```env
VITE_API_URL=http://localhost:5001/api
```

### 4. Run the Application

Start the backend API server:
```bash
npm run dev --prefix backend
```

In a separate terminal, start the Vite frontend development server:
```bash
npm run dev --prefix frontend
```

Open your browser at `http://localhost:5173`.

---

## 🌐 Production Deployment (Render)

This project is configured for single-service deployment on **Render**:
- The backend serves the compiled frontend static files from `frontend/dist` whenever `NODE_ENV=production`.

### Render Build & Start Configuration:
- **Environment**: `Node`
- **Build Command**:
  ```bash
  npm run build
  ```
  *(This installs backend & frontend dependencies, then runs `vite build`).*
- **Start Command**:
  ```bash
  node backend/src/server.js
  ```
- **Environment Variables on Render**:
  - `NODE_ENV`: `production`
  - `PORT`: `10000` (or leave default assigned by Render)
  - `MONGODB_URI`: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/clinic_management_db?retryWrites=true&w=majority`
  - `JWT_SECRET`: `<secure-random-string>`
  - `CLIENT_URL`: `https://your-service-name.onrender.com`

---

## 🔒 Security Best Practices

- **Zero Credential Leaks**: Never commit `.env` files. Both `backend/.env` and `frontend/.env` are strictly included in `.gitignore`.
- **Database Access Control**: MongoDB Atlas IP Whitelisting enabled with database-user-specific role permissions.
- **Encrypted Credentials**: Doctor passwords are encrypted with `bcryptjs` salted hashing.
- **Guarded API Endpoints**: All patient and visit endpoints are secured behind JWT authentication middleware.

---

## 📄 License

This project is private and maintained for clinic administration. All rights reserved.
