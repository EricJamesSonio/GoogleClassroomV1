
---

# Classroom App Backend API Documentation

## Overview

The backend provides APIs for:

* Authentication
* Class management
* Student invitations and join requests
* Meeting scheduling and management
* Meeting invitations
* Real-time meeting chat (WebSocket)
* Agora video call token generation

The system supports two roles:

* **Educator** – can create classes, schedule meetings, invite students.
* **Student** – can join classes and participate in meetings.

Authentication is handled using **JWT access tokens**.

---

# 1. Authentication Routes

Base path:

```
/auth
```

## POST `/auth/register`

Registers a new user.

### Request

```
{
  "name": "John Doe",
  "email": "john@email.com",
  "password": "password123",
  "role": "student | educator"
}
```

### Behavior

* Validates role.
* Checks if email already exists.
* Hashes password.
* Creates new user.
* Returns JWT token.

### Response

```
{
  "access_token": "...",
  "user": { ... }
}
```

---

## POST `/auth/login`

Logs in a user.

### Request

```
{
  "email": "user@email.com",
  "password": "password123"
}
```

### Behavior

* Verifies credentials.
* Generates JWT access token.

---

## GET `/auth/me`

Returns current authenticated user.

### Behavior

* Requires JWT authentication.
* Returns user profile information.

---

# 2. Class Management Routes

## POST `/classes`

Create a new class.

### Access

Educator only.

### Request

```
{
  "name": "Software Engineering",
  "description": "Course about system design"
}
```

### Behavior

* Creates class.
* Educator automatically added as class member.

---

## GET `/classes`

Get classes where the current user is a member.

### Behavior

Returns:

* Classes where user is educator or student.

---

## GET `/classes/{class_id}`

Get full class details.

### Behavior

Returns:

* Class metadata
* All members
* Member roles

User must belong to the class.

---

# 3. Class Invitations

## POST `/classes/{class_id}/invite`

Invite a student to a class.

### Access

Educator only.

### Request

```
{
  "email": "student@email.com"
}
```

### Behavior

* Finds student by email.
* Creates pending invitation.

---

## GET `/invitations`

Get pending class invitations for student.

### Access

Student only.

---

## POST `/invitations/{invitation_id}/accept`

Accept class invitation.

### Behavior

* Adds student to class
* Marks invitation as accepted

---

## POST `/invitations/{invitation_id}/reject`

Reject class invitation.

---

# 4. Class Join Requests

Students can request to join a class.

---

## POST `/classes/{class_id}/request-join`

Student requests to join class.

### Behavior

Creates join request for educator approval.

---

## GET `/classes/{class_id}/join-requests`

Educator views join requests.

---

## POST `/join-requests/{request_id}/accept`

Educator accepts join request.

### Behavior

* Student becomes class member.

---

## POST `/join-requests/{request_id}/reject`

Educator rejects join request.

---

# 5. Meeting Management

Meetings belong to classes.

They can be:

* `scheduled`
* `live`
* `ended`

Meetings automatically start using **APScheduler**.

---

## POST `/classes/{class_id}/meetings`

Create a meeting.

### Access

Educator only.

### Request

```
{
  "title": "Week 1 Lecture",
  "scheduled_at": "2026-03-10T09:00:00Z"
}
```

or

```
{
  "title": "Quick Meeting",
  "start_in_minutes": 5
}
```

### Behavior

* Creates meeting
* Generates Agora channel
* Schedules automatic start

---

## GET `/classes/{class_id}/meetings`

Get meetings of a class.

### Access

Class members only.

---

## GET `/meetings/{meeting_id}`

Get meeting details.

### Access

Class members only.

---

## PATCH `/meetings/{meeting_id}/end`

End meeting.

### Access

Meeting creator only.

### Behavior

* Marks meeting status as `ended`
* Saves end time

---

# 6. Meeting Invitations

Meetings support **invitation-based access**.

---

## POST `/meetings/{meeting_id}/invite-all`

Invite all students in the class.

### Access

Educator only.

---

## POST `/meetings/{meeting_id}/invite`

Invite selected students.

### Request

```
{
  "user_ids": ["user1", "user2"]
}
```

---

## GET `/meeting-invitations`

Get meeting invitations for student.

---

## POST `/meeting-invitations/{invitation_id}/accept`

Student accepts meeting invitation.

---

## POST `/meeting-invitations/{invitation_id}/reject`

Student rejects meeting invitation.

---

# 7. Meeting Join Requests

Students can request to join a meeting.

---

## POST `/meetings/{meeting_id}/request-join`

Student requests access to meeting.

---

## GET `/meetings/{meeting_id}/requests`

Educator views join requests.

---

## POST `/meeting-requests/{invitation_id}/accept`

Educator approves join request.

---

## POST `/meeting-requests/{invitation_id}/reject`

Educator rejects join request.

---

# 8. Agora Video Token

## GET `/meetings/{meeting_id}/agora-token`

Generates an Agora RTC token for video call.

### Behavior

* Checks if meeting is **live**
* Verifies user invitation
* Generates Agora token

### Response

```
{
  "token": "...",
  "channel": "meeting_xxx",
  "app_id": "...",
  "uid": 123456
}
```

If Agora keys are not configured:

```
{
  "token": "dev_mock_token"
}
```

Used only for development.

---

# 9. Meeting Chat (WebSocket)

Real-time meeting chat using **WebSockets**.

---

## WebSocket Endpoint

```
/ws/meetings/{meeting_id}?token=JWT
```

### Behavior

* Authenticates user via JWT
* Validates meeting access
* Sends message history
* Broadcasts messages to all connected users

---

## WebSocket Message Format

### Send Message

```
{
  "message": "Hello everyone!"
}
```

---

### Receive Message

```
{
  "type": "message",
  "sender_name": "Alice",
  "message": "Hello everyone!",
  "created_at": "..."
}
```

---

### User Joined

```
{
  "type": "user_joined",
  "name": "Alice"
}
```

---

### User Left

```
{
  "type": "user_left",
  "name": "Alice"
}
```

---

# 10. Chat History API

## GET `/meetings/{meeting_id}/messages`

Retrieve paginated chat messages.

### Query Parameters

```
page=1
limit=50
```

### Response

```
{
  "page": 1,
  "limit": 50,
  "messages": [...]
}
```

---

# 11. Meeting Scheduler

The system uses **APScheduler** to automatically start meetings.

### Behavior

When a meeting reaches its `scheduled_at` time:

```
status: scheduled → live
```

This allows:

* automatic meeting start
* no manual educator action required

---

# Summary of Features

| Feature             | Description                        |
| ------------------- | ---------------------------------- |
| Authentication      | JWT-based login & registration     |
| Class Management    | Educators create classes           |
| Invitations         | Educators invite students          |
| Join Requests       | Students request to join classes   |
| Meeting Scheduling  | Meetings scheduled with auto-start |
| Meeting Invitations | Invite students to meetings        |
| Video Calls         | Agora RTC integration              |
| Real-time Chat      | WebSocket meeting chat             |
| Chat History        | Persistent message storage         |

---

