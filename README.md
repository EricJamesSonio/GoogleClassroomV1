# Classroom App

A simplified **Google Classroom-style platform** that allows educators and students to collaborate through **online classes, scheduled video meetings, and live chat**.

This project focuses on learning modern full-stack development concepts such as **real-time communication, video conferencing integration, authentication, and scalable backend architecture**.

---

## Overview

The Classroom App allows educators to create and manage classes while students can join those classes and participate in scheduled meetings.

Meetings include a **countdown timer**, **automatic start**, **real-time video calls**, and **live chat** so participants can communicate during sessions.

The goal of the project is to build a focused learning platform that demonstrates how modern web applications handle **real-time interaction, cloud services, and structured backend design**.

---

## Key Features

- User authentication with role support (educator or student)
- Class creation and membership management
- Invitation and join request system
- Scheduled meetings with automatic start timers
- Real-time video meetings
- Live chat during meetings
- Optional meeting recording
- Cloud-based media and file storage

---

## Tech Stack

### Backend

- **Python** – Main backend programming language  
- **FastAPI** – High-performance asynchronous web framework  
- **MongoDB** – NoSQL database for flexible data storage  
- **Beanie** – Async ODM built on Motor and Pydantic  
- **Motor** – Asynchronous MongoDB driver  
- **JWT Authentication** – Secure stateless authentication  
- **WebSockets** – Real-time communication for live chat  
- **APScheduler** – Background scheduler for meeting timers and auto-start logic  

### Frontend

- **React** – Component-based UI library  
- **Vite** – Fast development build tool  
- **TanStack Query** – Server state management and caching  
- **Axios** – HTTP client for API communication  
- **React Router** – Client-side routing  
- **Zustand** – Lightweight global state management  

### External Services

- **Agora RTC** – Real-time video and audio communication  
- **Agora Cloud Recording** – Cloud-based meeting recording  
- **Cloudinary** – Media and file storage with CDN delivery  

---

## Project Goal

This project was built as a **learning-focused full-stack application** to explore how modern platforms handle:

- real-time communication
- video conferencing integration
- asynchronous backend systems
- scalable application architecture
- cloud-based services
