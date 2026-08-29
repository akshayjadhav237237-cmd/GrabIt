# GrabIt 📦✨
> **"Why own it, when you can Grabit?"** — Modern Peer-to-Peer Equipment Rental Marketplace

GrabIt connects people who need high-value gear (cameras, drones, power tools, event audio, electronics, and outdoor equipment) with trusted neighbors who own it.

---

## 🌟 Key Features

- **"Warm Utility" Design System**: Earthy forest green (`#1F4D3A`), warm cream (`#FAF6EE`), and terracotta (`#D97D3F`) accents. 100% theme design token compliance.
- **Auto-Sliding Featured Stories Carousel**: Instagram Stories-style animated progress segments with 4s timer, manual swipe reset, and direct product detail navigation.
- **Dedicated 2-Column Catalog & Instant Search**: Two-column responsive listing grid with categories, price range filters, and live search.
- **Voice Search Modal**: Speech-to-text integration with Web Speech API support, waveform visualizer, and 1-tap demo voice query chips.
- **Interactive Calendar Date-Range Picker**: Multi-day month calendar with disabled blackout/booked date guards and smooth range highlight.
- **Instant Booking & Overlap Protection**: Instant booking flow with automated overlap protection against double-booking.
- **Dual Payment Methods**:
  - **Grabit Wallet**: Instant 1-swipe checkout with dynamic balance verification (₹20,000 balance).
  - **Razorpay**: Cards, UPI, and NetBanking checkout.
- **Drag-to-Book Slider**: PanResponder gesture-driven slider with snap-back physics and confirmation triggers.
- **Itemized Booking Receipt**: Clear P2P rental start/pickup date notices, itemized INR breakdowns, copyable reference IDs, and direct booking management.
- **In-App Messaging & Notifications**: Real-time rental chat, push notification preferences, and booking state alerts.
- **Dispute & Report Center**: In-app listing and user reporting, cancellation reasons with late cancellation policies, and booking dispute flags.
- **Owner Suite**: My Listings management (archive, edit, soft/hard delete with booking check) and earnings summary (total earned, pending payouts).

---

## 🏗️ Architecture & Tech Stack

### Frontend (`grabit-app`)
- **React Native / Expo** (Expo SDK 51, TypeScript)
- **React Navigation v6** (Bottom Tabs & Native Stack)
- **Theme Design System** (`src/theme/theme.ts`)
- **Custom Vector Icon Set** (Stroke-based SVGs)
- **Dynamic Image Resolver** (`src/utils/imageUrl.ts`)
- **Currency Formatter** (`src/utils/currency.ts` with `en-IN` INR `₹` formatting)

### Backend (`grabit-backend`)
- **Node.js & Express**
- **MongoDB & Mongoose ODM**
- **Firebase Auth** (Token sync & verification)
- **Razorpay Payments**
- **Expo Server SDK** (Push notifications)
- **AWS S3 / Local Static Serving** (Disk mock storage fallback)

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd grabit-backend
npm install
npm run seed     # Seeds 12 realistic Indian listings with authentic Unsplash photos
npm start        # Starts backend server on port 5000
```

### 2. Frontend Setup
```bash
cd grabit-app
npm install
npm start        # Launches Expo Dev Server
npm run web      # Opens Web browser build
```

---

## 🧪 Verification & Test Suites

### Frontend
```bash
cd grabit-app
npm run typecheck                                   # TypeScript compiler check (0 errors)
node verify_carousel_seed_inr_wallet_flow.js        # Carousel, Seed, INR, Wallet & Receipt verification
node verify_module6_calendar_picker.js              # Calendar Range Picker 3-state machine
node verify_home_search_instant_booking.js          # Home feed & 2-column search grid
node verify_modules_1_to_5.js                       # Reviews, Verification, Search, Profile, Availability
node verify_payments_chat.js                        # Payments & Realtime Chat
node verify_wishlist.js                             # Wishlist & Heart Toggles
```

### Backend
```bash
cd grabit-backend
node test_payments.js                               # Razorpay & Wallet payment verification
node test_bookings.js                               # Booking lifecycle & double-booking guards
node test_wishlist.js                               # Wishlist routing & CRUD
node test_10_backlog_modules.js                     # Backlog integration suites
```

---

## 📄 License
MIT © GrabIt
