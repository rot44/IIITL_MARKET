# 🎓 IIITL Market — Campus Marketplace

A peer-to-peer marketplace application exclusively built for the **Indian Institute of Information Technology, Lucknow (IIITL)** community. Allows students to buy, sell, negotiate, and chat in real-time for textbooks, electronics, sports gear, cycles, and hostel essentials.

Inspired by College Bazaar (DTU) and modernized with **Node.js/Express**, **Supabase (PostgreSQL + Auth + Storage + Realtime)**, and a **Vite + React (Vanilla CSS Dark Glassmorphism)** frontend.

---

## 🚀 Key Features

- **Strict Campus Domain Verification**: Sign in with Supabase passwordless OTP restricted exclusively to `@iiitl.ac.in` email addresses (enforced both client-side and server-side).
- **Listing Management**: Post, update, mark as sold, or delete listings with category, condition rating, negotiable pricing, search tags, and campus pickup spot.
- **Image Uploads & Gallery**: Multi-image attachments powered by Supabase Storage bucket (`listing-images`) with demo image fallback presets.
- **Search, Filter & Sort**: Debounced keyword search, category pills, price ranges, condition filters, and sorting by newest, views, or price.
- **Purchase Request Workflow**: Structured order flow (`pending` ➔ `accepted` ➔ `completed` / `rejected` / `cancelled`) between buyer and seller.
- **Real-Time Campus Chat**: Instant messaging for active orders powered by Supabase Realtime WebSocket subscriptions (`postgres_changes`).
- **Wishlist / Saved Items**: 1-click bookmarking of items with heart button.
- **Verified Student Profiles**: View student branch, year of study, hostel residence, sales stats, and campus trust rating.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, React Router 7, Axios, React-Toastify |
| **Styling** | Vanilla CSS (Dark Glassmorphism design system, Inter typography) |
| **Backend** | Node.js, Express.js, Supabase JS SDK (`@supabase/supabase-js`) |
| **Database & Auth** | Supabase (PostgreSQL, Supabase Auth OTP, Realtime, Storage) |

---

## 📁 Project Structure

```
College-market/
├── College_Bazaar-main/        # Reference DTU project
└── iiitl-market/                # IIIT Lucknow Marketplace
    ├── index.js                # Server entry point (starts Express on PORT)
    ├── app.js                  # Express application setup, CORS, routes
    ├── package.json            # Backend dependencies
    ├── .env.example            # Backend environment template
    ├── supabase_schema.sql     # Complete database schema, RLS, triggers & sample data
    ├── src/
    │   ├── config/
    │   │   └── supabaseClient.js # Admin client (service_role) & anon client
    │   ├── middlewares/
    │   │   └── authMiddleware.js # Supabase JWT validation & @iiitl.ac.in check
    │   └── routes/
    │       ├── auth.js         # Domain verification & session check
    │       ├── listings.js     # CRUD, search, filter, categories
    │       ├── orders.js       # Purchase requests & status transitions
    │       ├── chat.js         # Order-based messages & unread counts
    │       ├── profile.js      # Public & private user profile details
    │       └── wishlist.js     # User bookmarking & saved items
    └── frontend/
        ├── package.json        # Frontend dependencies
        ├── vite.config.js      # Vite build configuration
        ├── .env.example        # Frontend environment template
        ├── src/
        │   ├── index.css       # Complete dark glassmorphism design system
        │   ├── main.jsx        # App mounting with BrowserRouter & AuthProvider
        │   ├── App.jsx         # Full route table & layouts
        │   ├── contexts/
        │   │   └── AuthContext.jsx # Supabase OTP auth & session context
        │   ├── lib/
        │   │   ├── api.js      # Axios client with automatic Bearer token
        │   │   └── supabaseClient.js # Frontend Supabase client
        │   ├── components/
        │   │   ├── auth/ProtectedRoute.jsx
        │   │   └── layout/Navbar.jsx
        │   └── pages/
        │       ├── LandingPage.jsx   # Hero, 4-step roadmap, category showcase
        │       ├── Login.jsx         # 2-step OTP flow for @iiitl.ac.in
        │       ├── Home.jsx          # Marketplace search, filters & grid
        │       ├── ListingDetail.jsx # Gallery, buyer request modal, seller info
        │       ├── SellItem.jsx      # Multi-image upload, condition pills, tags
        │       ├── EditListing.jsx   # Edit listing, mark sold, delete
        │       ├── Profile.jsx       # Student stats, my listings, profile edit
        │       ├── UserProfile.jsx   # Public seller profile & active items
        │       ├── Orders.jsx        # Buying/Selling tabs & status transitions
        │       ├── Chat.jsx          # Realtime chat via Supabase subscriptions
        │       └── Wishlist.jsx      # Bookmarked items grid
```

---

## ⚙️ Setup & Installation Instructions

### 1. Supabase Project Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open [`supabase_schema.sql`](./supabase_schema.sql) in this directory, copy its entire contents, and click **Run**.
   - This sets up all 6 tables (`profiles`, `categories`, `listings`, `orders`, `messages`, `wishlist`, `reviews`).
   - Configures triggers for auto-updating timestamps.
   - Sets up Row Level Security (RLS) policies.
   - Seeds initial categories (`Books`, `Electronics`, `Stationary`, `Sports`, `Clothing`, `Daily-use`, `Hostel Essentials`, `Others`).
4. Under **Storage** in Supabase:
   - Create a public bucket named `listing-images`.
   - Create a public bucket named `avatars`.
5. Under **Project Settings ➔ API**:
   - Copy **Project URL**
   - Copy **anon public key**
   - Copy **service_role secret key**

---

### 2. Configure Backend Environment

In `iiitl-market/`:
Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Fill in your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_ANON_KEY=your-supabase-anon-key
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

---

### 3. Configure Frontend Environment

In `iiitl-market/frontend/`:
Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Fill in your frontend environment variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=http://localhost:5000/api
```

---

### 4. Run the Servers

#### Terminal 1 — Start Backend Server:
```bash
cd /Users/prakhar/Desktop/PROJECTSS/College-market/iiitl-market
npm run dev
# Or: npm start
```
*Backend runs on `http://localhost:5000` (Health check at `http://localhost:5000/api/health`).*

#### Terminal 2 — Start Frontend Dev Server:
```bash
cd /Users/prakhar/Desktop/PROJECTSS/College-market/iiitl-market/frontend
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 🔒 Authentication Flow

1. User enters their official college email (must end in `@iiitl.ac.in`).
2. Supabase sends a 6-digit OTP code to that email.
3. User enters the OTP in the UI.
4. On verification, Supabase issues a JWT.
5. The frontend automatically passes this token as `Authorization: Bearer <token>` to the Express backend.
6. The backend `authMiddleware` validates the JWT and checks that the user's email domain is `@iiitl.ac.in`.

---

## 💬 Real-Time Chat

- Built using **Supabase Realtime** (`postgres_changes` event channel on the `messages` table).
- When User A sends a message via `POST /api/chat/order/:orderId`, Supabase inserts the row into `messages`.
- User B's open chat window receives the newly inserted message immediately over the WebSocket connection without polling.
