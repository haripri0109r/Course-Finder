# Course Discovery Platform 🎓

A professional full-stack platform for discovering courses, tracking learning progress, and engaging with a community of students. Built with React Native (Expo) and Node.js.

## 🚀 Project Overview

This repository contains both the frontend mobile application and the backend API service.

- **Frontend**: React Native with Expo, features high-performance lists, smooth animations, and a premium UI design.
- **Backend**: Node.js & Express API with MongoDB, providing secure authentication, social interactions (likes/follows), and course management.

## 📁 Project Structure

```text
course_finder/
  ├── backend/    # Node.js + Express + MongoDB
  ├── frontend/   # React Native + Expo
  ├── README.md   # Project Documentation
  └── .gitignore  # Root-level ignore rules
```

## 🛠️ Tech Stack

### Frontend
- **Framework**: React Native (Expo)
- **Navigation**: React Navigation (Bottom Tabs + Native Stack)
- **Styling**: Custom Theme Engine (Vanilla CSS-in-JS)
- **Animations**: Reanimated & Haptics for tactile feedback
- **Icons**: Emoji-based (System Native)

### Backend
- **Server**: Node.js / Express
- **Database**: MongoDB (via Mongoose)
- **Auth**: JWT (JSON Web Tokens) with Bcrypt password hashing
- **Security**: Helmet, CORS, and Express Rate Limit
- **Storage**: Cloudinary (integrated for uploads)

## ⚙️ Quick Start

### Backend
1. `cd backend`
2. `npm install`
3. Create `.env` from `.env.example`
4. `npm run dev`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npx expo start`

## 📄 License
MIT License.
