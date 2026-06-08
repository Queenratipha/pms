# SwiftWheels Enterprises – PMS

**Promotion and Marketing Subsystem** | National Practical Exam 2026

## Stack
- **Backend**: Node.js, Express, MySQL (MariaDB), express-session
- **Frontend**: React.js, Tailwind CSS, Axios, React Router v6
- **Database**: PMS (MySQL/MariaDB)

## Setup

### 1. Database
Import the SQL schema with XAMPP running:
```
mysql -u root < backend/pms_database.sql
```

### 2. Backend
```bash
cd backend
npm install
# Edit .env with your DB credentials
npm start        # runs on http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm start        # runs on http://localhost:3000
```

## Default Login
| Username | Password |
|----------|----------|
| admin    | admin123 |

## Features
- Session-based authentication
- Full CRUD: Vehicles, Customers, Promotions, Promo-Vehicles
- Search on all modules
- Report: Active customers × Active promotions
- Responsive UI with Tailwind CSS
