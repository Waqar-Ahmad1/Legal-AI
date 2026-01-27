# LegalAI — AI-Powered Legal Document Analysis

---

## 🔹 Project Overview
**LegalAI** is a full-stack web application that provides intelligent legal document processing and management. It enables users and admins to register, log in securely, upload legal documents, train models, and manage document analysis tasks.

- **Backend:** FastAPI (Python) + MongoDB Atlas
- **Frontend:** React.js + Material UI (MUI) + Framer Motion
- **Authentication:** JWT-based (JSON Web Tokens)
- **Password Security:** bcrypt hashing

---

## 🔹 Tech Stack


| Layer | Technology |
|-------|-------------|
| **Frontend** | React.js, Material-UI, Framer Motion, Axios, React Router |
| **Backend** | FastAPI, Uvicorn, Pydantic, bcrypt, JWT, PyMongo |
| **Database** | MongoDB Atlas |
| **Dev Tools** | Postman, Swagger UI, MongoDB Compass |

---

## 🔹 Features
- User & Admin registration/login with JWT authentication
- Secure password hashing (bcrypt)
- File upload & document training (admin only)
- Admin dashboard: statistics, training history, document deletion
- Real-time validation and alerts on frontend
- Responsive UI with smooth Framer Motion animations
- Centralized API response model for consistency

---

## 🔹 System Architecture
```text
[React Frontend]  <---Axios--->  [FastAPI Backend]  <---PyMongo--->  [MongoDB Atlas]
     |                                |
     | (token in localStorage)        | (uploads -> data/uploads)
     |                                |
  Browser                         File system
```

---

## 🔹 Repository Structure
```
project/
├── backend/
│   ├── app/
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── routes.py
│   │   └── main.py
│   ├── data/uploads/
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Home.jsx
    │   │   ├── Register.jsx
    │   │   └── Login.jsx
    │   └── App.jsx
    ├── package.json
    └── .env
```

---

## 🔹 Quick Start

### ✅ Prerequisites
- Node.js v16+
- Python 3.10+
- MongoDB Atlas account

---

### 🧩 Backend Setup
```bash
git clone <repo-url>
cd project/backend
python -m venv .venv
source .venv/bin/activate  # (Windows: .venv\Scripts\activate)
pip install -r requirements.txt
```

**Run Backend:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Access Swagger UI → [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 💻 Frontend Setup
```bash
cd ../frontend
npm install
npm start
```
Frontend runs at [http://localhost:3000](http://localhost:3000)

---

## 🔹 Environment Variables

### Backend `.env`
```
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/
DB_NAME=legal_ai
SECRET_KEY=your_secret_key
ADMIN_SECRET_KEY=admin_secret
```

### Frontend `.env`
```
REACT_APP_API_URL=http://localhost:8000
```

---

## 🔹 Backend Details

### Database Connection
- Managed by `DatabaseManager` class in `database.py`
- Includes retry logic & index creation:
  - `users.email` (unique)
  - `admins.email` (unique)

### Authentication Flow (JWT)
1. User logs in → `/login`
2. Backend validates password with bcrypt
3. Token generated via:
```python
jwt.encode({"sub": email, "type": "user"}, SECRET_KEY, algorithm="HS256")
```
4. Frontend stores token in localStorage

### Main API Endpoints
| Method | Endpoint | Description |
|---------|-----------|-------------|
| POST | `/register` | Register user |
| POST | `/login` | Login user & issue JWT |
| POST | `/admin/signup` | Admin registration |
| POST | `/admin/signin` | Admin login |
| POST | `/admin/train` | Upload and train legal documents |
| GET | `/admin/dashboard/stats` | Dashboard statistics |
| GET | `/admin/training/history` | List of past uploads |
| DELETE | `/admin/training/document/{id}` | Delete document |
| GET | `/admin/users` | Paginated users list |

---

## 🔹 Frontend Details
- Built with **React functional components**
- Routing with **React Router DOM**
- State handling with **useState**, **useEffect**, **useNavigate**
- Styled with **MUI components** and **Framer Motion**

### Main Pages
| Page | Description |
|-------|-------------|
| `Home.jsx` | Hero section, feature cards, animated intro |
| `Register.jsx` | Form validation, Axios POST to `/register` |
| `Login.jsx` | Auth flow, saves JWT, redirects to `/try-it` |

### API Integration
```js
axios.post(`${API_URL}/login`, { email, password })
  .then(res => localStorage.setItem('token', res.data.data.access_token))
  .catch(err => alert(err.response.data.message));
```

---

## 🔹 Testing & Debugging
- Use Swagger UI (`/docs`) or Postman for backend testing
- Logs generated via Python `logging`
- MongoDB Compass for DB visualization
- Frontend debugging via browser dev tools (Console + Network tab)

---

## 🔹 Deployment Checklist
- [ ] Add `.env` with production keys
- [ ] Restrict CORS to frontend domain
- [ ] Use HTTPS
- [ ] Deploy backend to **Render/Railway.app**
- [ ] Deploy frontend to **Vercel/Netlify**

---

## 🔹 Security Recommendations
- Store JWT in **HTTP-only cookies** in production
- Set token expiry and refresh tokens
- Use strong passwords and bcrypt salting
- Disable public CORS in production

---

## 🔹 Future Enhancements
- Add document summarization using NLP/LLM models
- Implement admin analytics dashboard (charts, usage stats)
- Cloud storage integration (AWS S3 / Firebase)
- Add dark/light mode toggle
- JWT refresh token system

---

## 🔹 License
This project is licensed under the **MIT License**.

---

## 👤 Author
**Waqar Ahmad**  
Software Engineering Student  
Full-Stack Developer — React | FastAPI | MongoDB  

---

**📢 LegalAI:** An intelligent system that bridges law and AI — simplifying document analysis for legal professionals and researchers.