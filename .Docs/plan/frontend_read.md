
---

# ClassRoom App — Frontend Overview

## Project Scope

The frontend is a React-based application providing a modern, responsive interface for a Google Classroom-style app. Users can:

* **Authenticate**: Register and login as either students or educators.
* **Manage Classes**: Create classes, view class lists, and see class details.
* **Join/Invite**: Students can request to join, educators can invite students.
* **Real-Time Meetings**: Schedule and join meetings (video/audio) using Agora integration.
* **Role-Based Views**: Educators and students see different UI elements depending on their role.

---

## Tech Stack

* **Framework**: React 18
* **Routing**: `react-router-dom` for SPA navigation
* **State Management**: Zustand (`authStore`) for auth state
* **API & Networking**: Axios with interceptors for authentication and error handling
* **Server Communication**: `@tanstack/react-query` for caching, mutations, and query management
* **Styling**: Inline CSS for components; modularized for each page/component
* **Dev Utilities**: Quick-fill login buttons for rapid testing

---

## Folder Structure (simplified)

```
src/
├─ api/
│  ├─ auth.js        # Auth-related requests (login/register/getMe)
│  ├─ axios.js       # Axios instance with interceptors
│  ├─ classes.js     # Class management API requests
│  └─ meetings.js    # Meeting-related API requests
├─ components/
│  ├─ Layout.jsx      # Sidebar + main layout
│  └─ ProtectedRoute.jsx  # Guards routes for authenticated users
├─ pages/
│  ├─ auth/
│  │  ├─ LoginPage.jsx
│  │  └─ RegisterPage.jsx
│  └─ classes/
│     ├─ ClassesPage.jsx       # Class list page (not included yet)
│     └─ ClassDetailPage.jsx   # View class details & manage members
├─ store/
│  └─ authStore.js  # Zustand store for auth and user state
├─ App.jsx
├─ main.jsx
└─ index.css
```

---

## Key Components & Pages

### **App.jsx**

* Sets up routes for login, registration, dashboard, classes, and class detail.
* Uses `<ProtectedRoute>` to guard routes requiring authentication.

### **Layout.jsx**

* Main shell with fixed sidebar, logo, navigation links, user info, and sign-out.
* Dynamically shows menu items based on `user.role`.
* Provides consistent layout for all pages.

### **ProtectedRoute.jsx**

* Checks auth token via Zustand store.
* Redirects unauthenticated users to `/login`.

### **LoginPage.jsx**

* Form for email & password.
* `react-query` mutation to login.
* Shows error messages from the API.
* Quick-fill buttons for dev testing (student/educator).

### **RegisterPage.jsx**

* Form for name, email, password, and role selection (student/educator).
* Role selection uses toggle buttons.
* Submits registration via `react-query` mutation.

### **ClassDetailPage.jsx**

* Displays detailed info about a class: name, description, members, creation date.
* Educators can:

  * Invite students via modal.
  * Accept/reject join requests.
* Students see members and can view educator info.
* Uses React Query for fetching class details and join requests.
* Tabs for switching between “Members” and “Join Requests”.
* Reusable components: `MemberRow` for each class member.

### **Axios Setup (`axios.js`)**

* Intercepts requests to attach `Bearer` token.
* Intercepts responses to handle `401 Unauthorized` by clearing local storage and redirecting to `/login`.

---

## Styling & UI Design

* **Dark theme**: Gradient backgrounds with soft neon accents.
* **Sidebar**: Fixed, translucent with highlighted active route.
* **Cards**: Glassmorphic look (blur + transparency) for login/register pages.
* **Buttons**: Gradient backgrounds for primary actions, clear hover/disabled states.
* **Responsiveness**: Designed for desktop, some pages can scale for smaller screens.
* **User Feedback**: Error messages, pending states, success indicators.

---

## Pending Features / Notes

* `ClassesPage.jsx` is referenced but not implemented yet.
* Meeting UI and live video integration are pending (only API hooks exist: `getAgoraToken`, `inviteAllToMeeting`).
* Additional mobile responsiveness and accessibility improvements may be needed.
* Some repeated inline styles could be moved to CSS modules or Tailwind in the future.

---

