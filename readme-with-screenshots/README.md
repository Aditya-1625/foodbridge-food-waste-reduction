<div align="center">

# 🍽️ FoodBridge

### Food Waste Reduction App: connecting surplus food with the people who need it

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-blue)

**Final Year Project | Problem 14: Food Waste Reduction App | Feature Set A**

<img src="screenshots/01-home.jpg" alt="FoodBridge home page" width="880">

</div>

---

## 📑 Table of Contents

1. [About the Project](#-about-the-project)
2. [Problem Statement](#-problem-statement)
3. [Our Solution](#-our-solution)
4. [Features](#-features)
5. [Screenshots](#-screenshots)
6. [How It Works](#-how-it-works)
7. [Tech Stack](#-tech-stack)
8. [System Architecture](#-system-architecture)
9. [Project Structure](#-project-structure)
10. [Database Design](#-database-design)
11. [API Reference](#-api-reference)
12. [Key Algorithms](#-key-algorithms)
13. [Security](#-security)
14. [Installation and Setup](#-installation-and-setup)
15. [Demo Accounts](#-demo-accounts)
16. [Testing Guide](#-testing-guide)
17. [Troubleshooting](#-troubleshooting)
18. [Future Scope](#-future-scope)
19. [Author](#-author)
20. [Acknowledgements](#-acknowledgements)

---

## 📖 About the Project

**FoodBridge** is a full-stack web application that lets **restaurants** donate their leftover food to **nearby NGOs and shelters** in a few clicks. The restaurant lists the food, picks the closest NGO (or alerts all NGOs nearby), and both sides follow the donation live until the food is delivered to people in need.

This is an **individual final year project** built for:

| | |
|---|---|
| **Problem Statement** | Problem 14: Food Waste Reduction App |
| **Feature Set** | Feature Set A |
| **Type** | Full-stack web application (frontend + backend + database) |

---

## ❗ Problem Statement

Restaurants, hotels and caterers throw away large quantities of perfectly edible food every day, while many people in the same city go hungry. Donating food is difficult because:

- A restaurant does not know **which NGO is nearby** and able to collect the food.
- Food is **perishable**, so there is no time for phone calls and back-and-forth messages.
- Neither side can **see what happened** to a donation after it is offered.

## 💡 Our Solution

FoodBridge removes these gaps with one simple platform:

- **Location-based matching** shows the nearest NGOs first, on a list and on a map.
- **Structured food details** (type, veg or non-veg, quantity, expiry time) tell the NGO exactly what to expect.
- **Direct or open requests** let a restaurant choose one NGO or alert everyone nearby.
- **Live status tracking** and **notifications** keep both sides informed from request to delivery.
- **Impact analytics** show how many meals and how much food were saved.

---

## ✨ Features

### ✅ Feature Set A (assigned features)

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Restaurant registration** | Restaurants (and NGOs) create an account with contact details, FSSAI or NGO registration number, address and GPS coordinates. Separate roles with separate dashboards. |
| 2 | **Nearby shelter / NGO matching** | NGOs within a chosen radius (10 / 25 / 50 / 100 km) are listed nearest first with the distance in km, and pinned on an interactive OpenStreetMap map. |
| 3 | **Food quantity and details** | Food item, type (cooked, raw, packaged, bakery), veg or non-veg, quantity, unit (portions, kg, litres), expiry time, pickup address and notes. |
| 4 | **Donation request** | Send a request to **one chosen NGO** (direct) or to **all NGOs nearby** (open). NGOs can **Accept** or **Decline**. The first NGO to accept an open request gets the food. |
| 5 | **Status tracking** | A visual timeline: **Requested → Accepted → Picked up → Delivered**, with time stamps. Also handles **Declined, Cancelled and Expired** requests. |

### ⭐ Extra features (added beyond the assignment)

| # | Feature | Description |
|---|---------|-------------|
| 6 | **Impact analytics dashboard** | Meals provided, kilograms of food saved, CO₂ emissions avoided, a food-type doughnut chart and a 7-day activity bar chart (Chart.js). |
| 7 | **Notification centre** | A bell icon with an unread count. Instant alerts for new requests, acceptance, pickup and delivery. Refreshes automatically every 15 seconds. |

### 🛠️ Additional touches

- Landing page with **live platform counters** (meals delivered, donations, restaurants, NGOs).
- **Expiry countdown** on every request ("3h 57m left"), highlighted when time is running out.
- **Automatic expiry**: pending food past its expiry time is marked *Expired* and hidden from NGOs.
- One-tap **Call** button to phone the other party during an active donation.
- Fully **responsive** design with a clean green and turmeric colour theme.
- **Quick Demo Access** buttons on the login page for easy testing.

---

## 📸 Screenshots

### 🌐 Public Pages

#### 1. Home Page
The landing page introduces FoodBridge, shows the call-to-action for restaurants and NGOs, and floating cards that preview live activity.

<p align="center"><img src="screenshots/01-home.jpg" alt="Home page" width="900"></p>

#### 13. Workflow: From Kitchen to Community in Four Steps
The simple four-step journey: **Register → List the food → Match nearby → Live tracking**.

<p align="center"><img src="screenshots/13-workflow.jpg" alt="Workflow diagram" width="900"></p>

#### 2. Login Page
Secure login with email and password, plus Quick Demo Access buttons for testers.

<p align="center"><img src="screenshots/02-login.jpg" alt="Login page" width="900"></p>

#### 3. Registration: NGO or Shelter
An NGO selects its account type, enters its registration number and the number of people it can feed per day, and shares its location.

<p align="center"><img src="screenshots/03-register-ngo.jpg" alt="NGO registration" width="900"></p>

#### 4. Registration: Restaurant
A restaurant registers with its FSSAI licence number, address and coordinates. **(Feature 1)**

<p align="center"><img src="screenshots/04-register-restaurant.jpg" alt="Restaurant registration" width="900"></p>

---

### 🍴 Restaurant Dashboard

#### 10. Restaurant Overview
Donations made, meals provided, food saved and CO₂ avoided, with charts. **(Extra feature: Impact analytics)**

<p align="center"><img src="screenshots/10-restaurant-overview.jpg" alt="Restaurant overview" width="900"></p>

#### 9. New Donation: Food Details
The form where the restaurant enters the food item, type, diet, quantity, unit and expiry time. **(Feature 3)**

<p align="center"><img src="screenshots/09-new-donation.jpg" alt="Create new donation" width="900"></p>

#### 14. Search Nearby NGOs and Shelters
Nearby NGOs are listed by distance and shown on a map. The restaurant picks one NGO or sends the request to all of them. **(Features 2 and 4)**

<p align="center"><img src="screenshots/14-nearby-ngos.jpg" alt="Nearby NGOs and shelters" width="520"></p>

#### 8. My Donations: Status Tracking
Every donation with its live timeline, from *Requested* to *Delivered*, plus a one-tap call button. **(Feature 5)**

<p align="center"><img src="screenshots/08-restaurant-my-donations.jpg" alt="Restaurant donations and status tracking" width="900"></p>

#### 11. Restaurant Profile and Notifications
Registration details and the notification bell showing pickup and delivery alerts. **(Extra feature: Notifications)**

<p align="center"><img src="screenshots/11-restaurant-profile-notifications.jpg" alt="Restaurant profile and notifications" width="900"></p>

---

### 🤝 NGO / Shelter Dashboard

#### 5. NGO Overview
Donations accepted, meals provided, food saved and CO₂ avoided, with the *Incoming requests* counter in the sidebar.

<p align="center"><img src="screenshots/05-ngo-overview.jpg" alt="NGO overview" width="900"></p>

#### 15. NGO Impact Analytics (Charts)
The food-by-type doughnut chart and the last-7-days chart for the NGO. **(Extra feature: Impact analytics)**

<p align="center"><img src="screenshots/15-ngo-analytics-charts.jpg" alt="NGO analytics charts" width="900"></p>

#### 7. Incoming Requests
New donation requests from nearby restaurants with distance, quantity, expiry countdown and **Accept** or **Decline** buttons. **(Feature 4)**

<p align="center"><img src="screenshots/07-ngo-incoming-requests.jpg" alt="NGO incoming requests" width="900"></p>

#### 6. My Pickups
Accepted donations with the NGO's buttons to mark food as **picked up** and then **delivered**. **(Feature 5)**

<p align="center"><img src="screenshots/06-ngo-pickups.jpg" alt="NGO pickups" width="900"></p>

#### 12. NGO Profile and Notifications
NGO registration details and alerts for new donation requests. **(Extra feature: Notifications)**

<p align="center"><img src="screenshots/12-ngo-profile-notifications.jpg" alt="NGO profile and notifications" width="900"></p>

---

## 🔄 How It Works

### End-to-end flow

```mermaid
flowchart LR
    A[Restaurant registers] --> B[Lists surplus food]
    B --> C{Choose receiver}
    C -->|One NGO| D[Direct request]
    C -->|All nearby NGOs| E[Open request within 50 km]
    D --> F[NGO receives notification]
    E --> F
    F --> G{NGO decision}
    G -->|Accept| H[Accepted]
    G -->|Decline| I[Rejected or stays open for others]
    H --> J[Food picked up]
    J --> K[Food delivered]
    K --> L[Impact counted in analytics]
```

### Donation status lifecycle

```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Accepted: NGO accepts
    Pending --> Rejected: Chosen NGO declines
    Pending --> Cancelled: Restaurant cancels
    Pending --> Expired: Expiry time passes
    Accepted --> PickedUp: NGO marks picked up
    PickedUp --> Completed: NGO marks delivered
    Completed --> [*]
    Rejected --> [*]
    Cancelled --> [*]
    Expired --> [*]
```

### Who can do what

| Action | Restaurant | NGO |
|--------|:---------:|:---:|
| Register and log in | ✅ | ✅ |
| Create a donation and send a request | ✅ | ❌ |
| Search nearby NGOs | ✅ | ❌ |
| Cancel a pending request | ✅ (own only) | ❌ |
| See incoming requests | ❌ | ✅ |
| Accept or decline a request | ❌ | ✅ |
| Mark picked up / delivered | ❌ | ✅ (only the accepting NGO) |
| View notifications and analytics | ✅ | ✅ |

---

## 🧰 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript | Pages, responsive design, dashboard logic |
| | Chart.js | Doughnut and bar charts |
| | Leaflet + OpenStreetMap | Interactive map of nearby NGOs |
| **Backend** | Node.js, Express.js | REST API and static file server |
| **Database** | MongoDB Atlas, Mongoose | Cloud database and data models |
| **Authentication** | JSON Web Tokens (JWT), bcryptjs | Secure login and password hashing |
| **Tools** | VS Code, Git, GitHub | Development and version control |

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph Client[Browser - Frontend]
        P1[Landing, Login, Register]
        P2[Dashboard: Restaurant or NGO view]
    end
    subgraph Server[Node.js + Express - Backend]
        MW[JWT and Role Middleware]
        R1[auth routes]
        R2[ngos routes - nearby matching]
        R3[donations routes - request and status]
        R4[stats routes - analytics]
        R5[notifications routes]
    end
    DB[(MongoDB Atlas<br/>users, donations, notifications)]
    Client -- REST API / JSON --> MW
    MW --> R1 & R2 & R3 & R4 & R5
    R1 & R2 & R3 & R4 & R5 --> DB
```

The same Express server also serves the frontend, so the whole app runs on a single address: `http://localhost:5000`.

---

## 📂 Project Structure

```
foodbridge/
├── server.js                 # Express app, MongoDB connection, static frontend
├── seed.js                   # Demo data (restaurants, NGOs, donations)
├── package.json
├── .env.example              # Template for environment variables
├── .gitignore
│
├── models/
│   ├── User.js               # Restaurant / NGO account (with location)
│   ├── Donation.js           # Food details, request, status history
│   └── Notification.js       # Bell notifications
│
├── routes/
│   ├── auth.js               # Register, login, profile
│   ├── ngos.js               # Nearby NGO matching
│   ├── donations.js          # Create, accept, decline, status tracking
│   ├── stats.js              # Impact analytics and public counters
│   └── notifications.js      # List and mark as read
│
├── middleware/
│   └── auth.js               # JWT verification and role authorization
│
├── utils/
│   └── helpers.js            # Haversine distance, impact maths, notifications
│
├── frontend/
│   ├── index.html            # Landing page
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html        # Role-based dashboard
│   ├── css/style.css         # Complete design system
│   ├── js/                   # common.js, landing.js, auth.js, dashboard.js
│   └── img/                  # Logo, favicon, illustrations, icons
│
└── screenshots/              # Images used in this README
```

---

## 🗄️ Database Design

Database name: **`foodbridge`** on MongoDB Atlas, with three collections.

### `users` (restaurants and NGOs)

| Field | Type | Notes |
|-------|------|-------|
| `name` | String | Restaurant or NGO name |
| `ownerName` | String | Contact person |
| `email` | String | Unique, lowercase |
| `password` | String | **bcrypt hash**, never plain text |
| `phone`, `address`, `city` | String | Contact details |
| `role` | String | `restaurant` or `ngo` |
| `location` | `{ lat, long }` | Used for nearby matching |
| `registrationNo` | String | FSSAI licence or NGO registration number |
| `capacity` | Number | NGO only: people it can feed per day |

### `donations`

| Field | Type | Notes |
|-------|------|-------|
| `restaurant` | ObjectId → users | Who is donating |
| `foodName`, `foodType`, `isVeg` | String / Boolean | Food details |
| `quantity`, `unit` | Number / String | `kg`, `liter` or `portions` |
| `expiryTime` | Date | Food must be eaten before this |
| `pickupAddress`, `description` | String | Pickup details and notes |
| `requestedNgo` | ObjectId → users | Set for a direct request, `null` for an open request |
| `declinedBy` | [ObjectId] | NGOs that declined an open request |
| `acceptedBy` | ObjectId → users | NGO that accepted |
| `status` | String | `Pending`, `Accepted`, `PickedUp`, `Completed`, `Rejected`, `Cancelled`, `Expired` |
| `statusHistory` | [{ status, at, note }] | Powers the status timeline |
| `restaurantLocation` | `{ lat, long }` | Used to calculate distance for NGOs |

### `notifications`

| Field | Type | Notes |
|-------|------|-------|
| `user` | ObjectId → users | Who receives it |
| `message`, `type` | String | Text and category |
| `donation` | ObjectId → donations | Related donation |
| `read` | Boolean | Drives the unread count |

---

## 🔌 API Reference

Base URL: `http://localhost:5000/api`. Protected routes need the header `Authorization: Bearer <token>`.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/register` | Public | Register a restaurant or NGO |
| POST | `/auth/login` | Public | Log in and receive a JWT |
| GET | `/auth/me` | Logged in | Get own profile |
| GET | `/ngos/nearby?radius=25` | Restaurant | NGOs within the radius, nearest first |
| POST | `/donations` | Restaurant | Create a donation and send the request |
| GET | `/donations/mine` | Logged in | Restaurant: own donations. NGO: accepted pickups |
| GET | `/donations/incoming` | NGO | Pending requests for this NGO |
| GET | `/donations/:id` | Logged in | One donation |
| POST | `/donations/:id/accept` | NGO | Accept a request |
| POST | `/donations/:id/reject` | NGO | Decline a request |
| PUT | `/donations/:id/status` | NGO / Restaurant | `PickedUp`, `Completed` (NGO) or `Cancelled` (restaurant) |
| GET | `/stats/impact` | Logged in | Personal impact analytics |
| GET | `/stats/public` | Public | Counters for the landing page |
| GET | `/notifications` | Logged in | Latest notifications and unread count |
| PUT | `/notifications/read-all` | Logged in | Mark all as read |
| GET | `/health` | Public | Server health check |

---

## 🧮 Key Algorithms

### 1. Nearby NGO matching (Haversine formula)

Every user stores a latitude and longitude. The straight-line distance between a restaurant and each NGO is calculated with the Haversine formula, then NGOs are filtered by the selected radius and sorted nearest first.

```
a = sin²(Δlat / 2) + cos(lat1) · cos(lat2) · sin²(Δlon / 2)
distance = 2 · R · atan2(√a, √(1 − a))        where R = 6371 km
```

### 2. Direct vs open requests

| Type | Visible to | Rule |
|------|-----------|------|
| **Direct** | Only the chosen NGO | If the NGO declines, status becomes *Rejected* |
| **Open** | All NGOs within 50 km | The first NGO to accept gets it. Others who decline just hide it |

Accepting uses an atomic database update that only matches donations still in *Pending*, so two NGOs can never accept the same donation.

### 3. Impact analytics (estimates)

Only **completed** donations count.

| Unit | Kilograms | Meals |
|------|-----------|-------|
| kg | 1 kg | × 3 per kg |
| litre | 1 kg | × 4 per litre |
| portions | × 0.4 kg per portion | 1 per portion |

**CO₂ avoided** ≈ 2.5 kg of CO₂ equivalent for every kg of food saved from being wasted. These are approximate planning figures, shown to illustrate impact.

---

## 🔐 Security

- **Passwords** are hashed with **bcrypt** before saving.
- **JWT tokens** (valid 7 days) authenticate every protected request.
- **Role-based access control**: only restaurants can create donations; only NGOs can accept or update pickups.
- **Ownership checks**: only the accepting NGO can move a donation forward; only the owning restaurant can cancel it.
- **Input validation** on the server for registration and donation creation (e.g. expiry time must be in the future).
- **XSS protection**: all user-entered text is escaped before it is shown on the page.
- Secrets live in a `.env` file that is **excluded from Git**.

---

## ⚙️ Installation and Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or newer (LTS recommended)
- [Git](https://git-scm.com/downloads)
- A free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) account
- An internet connection (for map tiles, charts and fonts)

### 1. Set up MongoDB Atlas

1. Create a free **M0** cluster.
2. **Database Access**: create a user (for example `foodadmin`) with a simple letters-and-numbers password.
3. **Network Access**: add `0.0.0.0/0` (Allow Access From Anywhere).
4. Click **Connect → Drivers** and copy your `mongodb+srv://...` connection string.

### 2. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/foodbridge.git
cd foodbridge
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` (`copy` on Windows, `cp` on Mac/Linux) and fill in your values:

```env
MONGODB_URI=mongodb+srv://foodadmin:YourPassword@cluster0.xxxxx.mongodb.net/foodbridge?retryWrites=true&w=majority
JWT_SECRET=any-long-random-secret-text
PORT=5000
```

> Make sure `/foodbridge` appears before the `?` so data is saved in the `foodbridge` database.

### 4. (Optional) Load demo data

```bash
npm run seed
```

> ⚠️ This clears existing data and adds demo restaurants, NGOs and donations.

### 5. Start the app

```bash
npm start
```

You should see `MongoDB connected` and `FoodBridge running at http://localhost:5000`. Open **http://localhost:5000** in your browser.

---

## 🔑 Demo Accounts

After running `npm run seed` (password for all: `demo123`):

| Role | Email | Name |
|------|-------|------|
| Restaurant | `restaurant@demo.com` | Spice Garden Restaurant |
| Restaurant | `annapurna@demo.com` | Hotel Annapurna |
| NGO | `ngo@demo.com` | Asha Kiran Shelter |
| NGO | `seva@demo.com` | Seva Foundation |
| NGO | `rotibank@demo.com` | Roti Bank Belagavi |

---

## 🧪 Testing Guide

Open two windows: a normal one for the **restaurant** and an **Incognito** one for the **NGO**.

| # | Scenario | Steps | Expected result |
|---|----------|-------|-----------------|
| 1 | Restaurant registration | Register → Restaurant → fill details and coordinates | Redirected to the restaurant dashboard |
| 2 | NGO registration | Register → NGO or Shelter → fill details | Redirected to the NGO dashboard |
| 3 | Nearby NGO matching | New donation → view the right panel, change radius | NGOs sorted by km, pins on the map |
| 4 | Food details | Fill all food fields | Saved. A past expiry time shows an error |
| 5 | Donation request | Select an NGO (or all) → Send | Status *Pending*, NGO gets a notification |
| 6 | Accept / Decline | NGO → Incoming requests → Accept | Restaurant sees *Accepted* |
| 7 | Status tracking | NGO → My pickups → Picked up → Delivered | Restaurant timeline reaches *Delivered* |
| 8 | Cancel | Restaurant cancels a pending request | Status *Cancelled* |
| 9 | Impact analytics | Open Overview | Meals, kg, CO₂ and charts update |
| 10 | Notifications | Click the bell → Mark all as read | Unread count goes to zero |
| 11 | Invalid input | Duplicate email, wrong password | Clear error messages are shown |

---

## 🩺 Troubleshooting

| Problem | Fix |
|---------|-----|
| `Missing MONGODB_URI or JWT_SECRET` | Create the `.env` file in the project root and save it |
| `bad auth` | Wrong database user or password in `MONGODB_URI` |
| `Server selection timed out` | In Atlas, allow access from anywhere (Network Access) |
| Port 5000 already in use | Set `PORT=5001` in `.env` and open `localhost:5001` |
| No NGOs in the nearby list | Increase the radius, or register NGOs with coordinates close to the restaurant |
| Map or charts not loading | Check your internet connection and refresh |
| Page says it cannot reach the server | Make sure `npm start` is running and use `http://localhost:5000` |

---

## 🚀 Future Scope

- SMS and WhatsApp alerts for urgent requests
- Volunteer delivery partners and live route tracking
- Photo upload for food safety verification
- Ratings and feedback between restaurants and NGOs
- Recurring donations for hotels and caterers
- Multi-language support and a mobile app
- Admin panel to verify FSSAI and NGO registration numbers

---

## 👨‍💻 Author

**Aditya Kharat**
Final Year Student | Roll No: *YOUR ROLL NO* | *YOUR COLLEGE NAME*

- GitHub: [@YOUR_USERNAME](https://github.com/YOUR_USERNAME)
- Email: *your-email@example.com*

---

## 🙏 Acknowledgements

- [OpenStreetMap](https://www.openstreetmap.org/) and [Leaflet](https://leafletjs.com/) for the maps
- [Chart.js](https://www.chartjs.org/) for the analytics charts
- [MongoDB Atlas](https://www.mongodb.com/atlas) for free cloud database hosting
- Our faculty guide for the problem statement and guidance

---

<div align="center">

**Good food belongs on a plate, not in a bin.** 🌱

*If you like this project, please give it a ⭐ on GitHub.*

</div>
