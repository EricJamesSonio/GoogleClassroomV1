# Process

1️⃣ Tech Stack
2️⃣ System Architecture
3️⃣ Database Schemas (MongoDB) + Why
4️⃣ Backend Folder Structure
5️⃣ API Design
6️⃣ Step-by-Step Development Plan

---

# 1️⃣ Tech Stack

Since you're using **MongoDB**, you **should NOT use SQLAlchemy**. Use a MongoDB ODM instead.

### Backend

* **Language:** Python
* **Framework:** FastAPI
* **Database:** MongoDB
* **ODM (Object Document Mapper):** Beanie
* **Async Mongo Driver:** Motor
* **Authentication:** JWT (using python-jose / FastAPI security)
* **Real-time communication:** FastAPI **WebSockets**

---

### Frontend

* **Framework:** React
* **Data fetching:** TanStack Query
* **HTTP client:** Axios
* **Routing:** React Router
* **State (optional):** Zustand or Context API

---

### Realtime & Video

* **Chat:** WebSockets
* **Video calls:** WebRTC
* React helper libraries:

  * simple-peer
  * socket signaling via FastAPI

---

### Development Tools

* Docker (optional)
* Postman / Insomnia
* MongoDB Compass
* Vite (for React)

---

# 2️⃣ System Architecture

```
React (Frontend)
     |
React Query + Axios
     |
FastAPI (REST API + WebSockets)
     |
Beanie ODM
     |
MongoDB
```

Realtime features:

```
WebSocket
   |
FastAPI
   |
Meeting Chat
```

Video meetings:

```
WebRTC
   |
FastAPI (signaling server)
```

---

# 3️⃣ Database Schema Design (MongoDB)

MongoDB uses **collections** instead of tables.

You will need **7 main collections**.

---

# 👤 1. Users

Collection:

```
users
```

Schema

```json
{
  "_id": "ObjectId",
  "name": "John Doe",
  "email": "john@email.com",
  "password_hash": "hashed_password",
  "role": "student | educator",
  "created_at": "date"
}
```

### Why

Stores all system users.

`role` determines permissions:

* educator → create classes
* student → join classes

---

# 🏫 2. Classes

Collection:

```
classes
```

Schema

```json
{
  "_id": "ObjectId",
  "name": "Software Engineering",
  "educator_id": "user_id",
  "description": "optional",
  "created_at": "date"
}
```

### Why

Represents a classroom created by an educator.

Relationship:

```
educator → classes
```

---

# 👥 3. Class Members

Collection:

```
class_members
```

Schema

```json
{
  "_id": "ObjectId",
  "class_id": "class_id",
  "user_id": "user_id",
  "role": "student | educator",
  "joined_at": "date"
}
```

### Why

This is needed because:

A class has **many students**.

This collection represents the **membership relationship**.

---

# 📩 4. Class Invitations

Collection:

```
class_invitations
```

Schema

```json
{
  "_id": "ObjectId",
  "class_id": "class_id",
  "student_id": "user_id",
  "invited_by": "educator_id",
  "status": "pending | accepted | rejected",
  "created_at": "date"
}
```

### Why

Students must **accept before joining**.

Flow:

```
Educator invites student
        ↓
Student accepts
        ↓
Added to class_members
```

---

# 🎥 5. Meetings

Collection

```
meetings
```

Schema

```json
{
  "_id": "ObjectId",
  "class_id": "class_id",
  "created_by": "educator_id",
  "title": "Lecture 1",
  "status": "scheduled | live | ended",
  "created_at": "date"
}
```

### Why

Represents video meetings within a class.

---

# 📩 6. Meeting Invitations

Collection

```
meeting_invitations
```

Schema

```json
{
  "_id": "ObjectId",
  "meeting_id": "meeting_id",
  "student_id": "user_id",
  "invited_by": "educator_id",
  "status": "invited | requested | accepted | rejected"
}
```

### Why

Handles these scenarios:

1️⃣ invite **all students**
2️⃣ invite **selected students**
3️⃣ invite **external students**
4️⃣ student **requests to join**

---

# 💬 7. Meeting Messages

Collection

```
meeting_messages
```

Schema

```json
{
  "_id": "ObjectId",
  "meeting_id": "meeting_id",
  "sender_id": "user_id",
  "message": "hello everyone",
  "created_at": "date"
}
```

### Why

Stores chat messages inside meetings.

Messages are also sent through **WebSockets in real time**.

---

# 4️⃣ Backend Folder Structure

Example **FastAPI project structure**.

```
backend
│
├── app
│   ├── main.py
│   │
│   ├── core
│   │   ├── config.py
│   │   └── security.py
│   │
│   ├── db
│   │   └── database.py
│   │
│   ├── models
│   │   ├── user.py
│   │   ├── class_model.py
│   │   ├── class_member.py
│   │   ├── class_invitation.py
│   │   ├── meeting.py
│   │   ├── meeting_invitation.py
│   │   └── message.py
│   │
│   ├── schemas
│   │   ├── user_schema.py
│   │   ├── class_schema.py
│   │   └── meeting_schema.py
│   │
│   ├── services
│   │   ├── auth_service.py
│   │   ├── class_service.py
│   │   └── meeting_service.py
│   │
│   ├── routes
│   │   ├── auth_routes.py
│   │   ├── class_routes.py
│   │   ├── meeting_routes.py
│   │   └── chat_routes.py
│   │
│   └── websocket
│       └── meeting_chat.py
```

---

# 5️⃣ API Design

### Auth

```
POST /auth/register
POST /auth/login
GET  /auth/me
```

---

### Classes

```
POST /classes
GET  /classes
GET  /classes/{class_id}
```

---

### Class Invitations

```
POST /classes/{id}/invite
GET  /invitations
POST /invitations/{id}/accept
POST /invitations/{id}/reject
```

---

### Meetings

```
POST /classes/{id}/meetings
GET  /classes/{id}/meetings
GET  /meetings/{id}
```

---

### Meeting Invitations

```
POST /meetings/{id}/invite
POST /meetings/{id}/request-join
POST /meetings/{id}/accept
POST /meetings/{id}/reject
```

---

### Chat

WebSocket endpoint:

```
/ws/meetings/{meeting_id}
```

---

# 6️⃣ Step-by-Step Development Plan

Build the project in **phases**.

---

# Phase 1 — Project Setup

Install backend dependencies.

```
fastapi
uvicorn
beanie
motor
python-jose
passlib
```

Create:

```
FastAPI app
MongoDB connection
Beanie models
```

---

# Phase 2 — Authentication

Implement:

```
User registration
User login
JWT authentication
```

Endpoints:

```
/auth/register
/auth/login
```

---

# Phase 3 — Classes

Educator can:

```
create class
view classes
```

Endpoints:

```
POST /classes
GET /classes
```

---

# Phase 4 — Class Invitations

Educator invites students.

Student can:

```
accept invitation
reject invitation
```

Endpoints:

```
POST /classes/{id}/invite
POST /invitations/{id}/accept
```

When accepted:

```
insert into class_members
```

---

# Phase 5 — Meetings

Educator creates meetings.

```
POST /classes/{id}/meetings
```

Students can view meetings.

---

# Phase 6 — Meeting Invitations

Allow:

* invite all students
* invite selected students
* invite external students

---

# Phase 7 — Join Requests

Students not invited can:

```
request join
```

Educator:

```
accept or reject
```

---

# Phase 8 — Live Chat

Implement WebSockets.

Flow:

```
User joins meeting
     ↓
WebSocket connects
     ↓
Send messages
     ↓
Broadcast to participants
```

---

# Phase 9 — Video Meetings

Use **WebRTC**.

FastAPI only acts as:

```
signaling server
```

Exchange:

```
offer
answer
ICE candidates
```

---

# 7️⃣ Final Feature List

Your system will support:

✅ Authentication
✅ Role-based users
✅ Class creation
✅ Student invitations
✅ Invitation acceptance
✅ Meetings
✅ Meeting invitations
✅ Join requests
✅ Live chat
✅ Video meetings

---


