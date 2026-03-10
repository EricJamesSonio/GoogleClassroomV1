# ClassRoom App 🎓

A modern, responsive **Google Classroom-style platform** built with **React + FastAPI**. Educators and students can create classes, schedule meetings, and collaborate in real-time with **live video, instant chat, and responsive design**.

**🚀 Live Demo:** [ClassRoom on Render](#)

---

## What is ClassRoom?

ClassRoom is a full-stack learning platform that demonstrates modern web development concepts:

- **Class Management** – Educators create classes, students join them
- **Scheduled Meetings** – Automated countdown timers and live video calls
- **Real-time Chat** – WebSocket-powered messaging during meetings
- **Responsive Design** – Works perfectly on desktop, tablet, and mobile (like Google Meet)
- **Authentication** – Secure JWT-based login with role support (educator/student)

---

## Key Features

✅ **User Authentication** – Sign up as educator or student  
✅ **Class Management** – Create, join, and manage classes  
✅ **Meeting Invitations** – Students accept/decline meeting requests  
✅ **Scheduled Meetings** – Countdown timer + automatic start  
✅ **Live Video Calls** – HD video conferencing with Agora  
✅ **Real-time Chat** – Message classmates during meetings  
✅ **Responsive Layout** – Mobile hamburger menu, desktop sidebar  
✅ **Adaptive Video Grid** – Google Meet-style layout for any participant count  
✅ **Meeting Recording** – Optional cloud recording via Agora  
✅ **File Storage** – Media uploads via Cloudinary  

---

## Tech Stack

### Backend
- **FastAPI** – Async Python web framework
- **MongoDB** – NoSQL database (via Beanie + Motor)
- **JWT** – Stateless authentication
- **WebSockets** – Real-time chat
- **APScheduler** – Meeting automations

### Frontend
- **React 18** – Component UI library
- **Vite** – Lightning-fast build tool
- **TanStack Query** – Server state management
- **React Router** – Client-side routing
- **Zustand** – Global state (auth)
- **CSS Variables** – Dark theme design system

### External Services
- **Agora RTC** – Video/audio conferencing
- **Agora Cloud Recording** – Meeting recordings
- **Cloudinary** – Media storage + CDN

---

## Deployment

This app is **deployed on Render**:

- **Backend:** Render Web Service (Python/FastAPI)
- **Frontend:** Render Static Site (React SPA)
- **Database:** MongoDB Atlas (cloud)

> Both frontend and backend automatically deploy on every GitHub push.

---

## Getting Started (Local Development)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` (frontend) and `http://localhost:8000` (API docs)

---

## Project Architecture

```
ClassRoom/
├── backend/
│   ├── main.py              # FastAPI app entry
│   ├── api/                 # API routes
│   │   ├── auth.py
│   │   ├── classes.py
│   │   ├── meetings.py
│   │   └── invitations.py
│   ├── models/              # MongoDB schemas
│   ├── websocket/           # Chat logic
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable UI
│   │   ├── store/           # Zustand state
│   │   ├── api/             # Axios client
│   │   └── index.css        # Design system
│   └── vite.config.js
```

---

## How It Works

1. **Sign Up** – Create an account as educator or student
2. **Create Class** (educator) – Name, description, and optional photo
3. **Join Class** (student) – Enter class code or wait for invitation
4. **Schedule Meeting** – Educator sets meeting time
5. **Countdown Timer** – Automatic display when meeting is near
6. **Live Video** – Click "Join" when timer starts, uses Agora
7. **Real-time Chat** – Message classmates via WebSocket
8. **End Meeting** – Educator ends for everyone, optional recording saved

---

## Design Highlights

- **Dark Theme** – Warm, OLED-friendly color palette
- **Responsive** – Hamburger menu on mobile, fixed sidebar on desktop
- **Video Grid** – Google Meet-style 3×3 adaptive layout
- **Touch Optimized** – 44×44px minimum touch targets
- **Fluid Typography** – Uses CSS `clamp()` for scaling fonts
- **Accessibility** – WCAG-compliant with focus states

---

## Learning Outcomes

This project teaches:

- 🔐 **Authentication** – JWT tokens and role-based access
- 🌐 **Real-time Systems** – WebSockets for live chat
- 📹 **Video Integration** – Agora SDK setup and usage
- ⚡ **Async Backend** – FastAPI with MongoDB
- 📱 **Responsive Design** – Mobile-first CSS with media queries
- 🎯 **State Management** – Zustand + TanStack Query
- ☁️ **Cloud Services** – External APIs (Agora, Cloudinary, MongoDB Atlas)

---

## Future Improvements

- [ ] Screen sharing during meetings
- [ ] Meeting transcripts (speech-to-text)
- [ ] Attendance tracking
- [ ] Assignment submission system
- [ ] Grade tracking
- [ ] Email notifications
- [ ] Two-factor authentication

---

## Contributing

This is a personal learning project. Feel free to fork and experiment!

---

## License

MIT

---

**Built with ❤️ as a learning project**

[View on Render](https://googleclassroomv1.onrender.com) | [GitHub Repository](https://github.com/EricJamesSonio/GoogleClassroomV1)