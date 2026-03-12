# Keboli – Frontend

The **Frontend** is the user interface for the AI Interview Bot platform.
It provides interfaces for **recruiters and candidates** to interact with the system, manage assessments, participate in interviews, and view evaluation results.

The frontend communicates with the backend through **REST APIs** and connects to **LiveKit** to enable real-time interview sessions.

---

# 1. Project Information

## Overview

The Frontend provides a responsive and interactive interface for the AI Interview Bot system.

It allows recruiters to create assessments and manage candidates, while candidates can join interview sessions and interact with the AI interviewer.

The frontend communicates with the backend APIs to fetch and display data, and integrates with **LiveKit** for real-time interview interactions.

---

## Responsibilities

The Frontend is responsible for:

* providing recruiter and candidate user interfaces
* managing authentication and user sessions
* displaying assessments and candidate data
* allowing candidates to join interview sessions
* integrating with LiveKit for real-time communication
* displaying evaluation results and feedback

---

## Key Features

* recruiter dashboard for assessment management
* candidate interview interface
* real-time interview session integration
* API-based data fetching
* responsive and modern UI
* interview results visualization

---

## Technology Stack

| Component             | Technology                 |
| --------------------- | -------------------------- |
| Framework             | React                      |
| Language              | TypeScript                 |
| State Management      | Redux Toolkit              |
| Styling               | Tailwind                   |
| HTTP Client           | Axios                      |
| Routing               | React Router               |
| Real-time Integration | LiveKit Client SDK         |

---

# 2. Architecture Overview

The frontend acts as the **presentation layer** of the AI Interview Bot platform and communicates with multiple backend services.

## System Architecture

```
                +------------------------+
                |       Frontend UI      |
                |        (React)         |
                +-----------+------------+
                            |
                            | REST API Requests
                            |
                            v
                 +------------------------+
                 |      FastAPI Backend   |
                 |                        |
                 |  Auth APIs             |
                 |  Assessment APIs       |
                 |  Candidate APIs        |
                 |  Session APIs          |
                 +-----------+------------+
                             |
                             v
                      +--------------+
                      |   LiveKit    |
                      | Interview    |
                      |  Sessions    |
                      +--------------+
```

---

## Component Responsibilities

### Recruiter Interface

Provides dashboards and tools for recruiters to:

* create and manage assessments
* invite candidates
* view candidate interview results
* monitor interview sessions

---

### Candidate Interface

Allows candidates to:

* access interview invitations
* join interview sessions
* interact with the AI interviewer
* complete interview tasks

---

### API Integration Layer

Handles communication with the backend APIs for:

* authentication
* assessment management
* candidate management
* session handling
* evaluation result retrieval

---

### LiveKit Integration

The frontend integrates with **LiveKit client SDK** to enable:

* real-time audio/video sessions
* communication with the Interview Agent
* interactive interview experiences

---

# 3. Service Interaction Flow

```
Recruiter Login
       |
       v
Frontend Dashboard
       |
       v
Backend API
       |
       v
Create Assessment
       |
       v
Invite Candidate
       |
       v
Candidate Receives Link
       |
       v
Candidate Opens Frontend
       |
       v
Join Interview Session
       |
       v
LiveKit Connection
       |
       v
Interview Agent Interaction
       |
       v
Interview Completed
       |
       v
Evaluation Agent Generates Results
       |
       v
Frontend Displays Results
```

---


# 4. Frontend Workflow

The frontend follows a structured workflow for both recruiters and candidates.

---

### 1. Recruiter Authentication

Recruiters log into the platform and access the dashboard.

---

### 2. Assessment Management

Recruiters can:

* create interview assessments
* manage candidate invitations
* configure interview parameters

---

### 3. Candidate Invitation

Candidates receive secure interview links via email.

---

### 4. Candidate Interview Session

Candidates open the link and join the interview interface.

The frontend connects to **LiveKit** to establish the interview session.

---

### 5. Interview Interaction

The candidate interacts with the **Interview Agent** through the LiveKit session.

---

### 6. Evaluation Result Display

Once the **Evaluation Agent** processes the responses, the frontend fetches evaluation results and displays them in the recruiter dashboard.

---

# 5. Running the Frontend Locally

## Prerequisites

Install:

* Node.js (v18 or higher)
* npm 

---

# Step 1 – Clone Repository

```
git clone https://github.com/JeneshaMalar/keboli-frontend.git
cd keboli-frontend
```

---

# Step 2 – Install Dependencies

```
npm install
```

---

# Step 3 – Configure Environment Variables

Create a `.env` file.

Example:

```
VITE_API_BASE_URL=http://localhost:8000
```

---

# Step 4 – Start Development Server

```
npm run dev
```

---

### Application URL

```
http://localhost:5173
```

---

# 6. Build for Production

Create production build:

```
npm run build
```

Preview production build:

```
npm run preview
```

---

# 7. Error Handling and Logging

The frontend includes mechanisms for:

* API error handling
* user-friendly error messages
* session timeout handling

These ensure a stable and smooth user experience.

---



# Author

**Jenesha Malar**
AI Interview Bot – Frontend Development


