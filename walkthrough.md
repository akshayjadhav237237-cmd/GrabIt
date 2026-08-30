# Catalog Update & Deployment: Portronics Toad Mouse Listings

## Summary

4 new Portronics Toad wireless mouse listings have been added under the **"Electronics"** category with realistic Indian retail pricing, daily rental rates at ~1–1.5% of retail, ~30% security deposits, verified working images, and distinct Indian metro cities assigned to the demo owner account.

- **Live Production URL**: [https://grabit-chi.vercel.app](https://grabit-chi.vercel.app)
- **Live Search Query**: `https://grabit-chi.vercel.app/api/products?search=Portronics`
- **GitHub Repository**: [https://github.com/akshayjadhav237237-cmd/GrabIt](https://github.com/akshayjadhav237237-cmd/GrabIt) (Branch: `main`)

---

## 1. Portronics Toad Product Listings Details

| # | Product Name | Real Retail Price | Daily Rate (`perDay`) | Weekly Rate (`perWeek`) | Security Deposit | Damage Protection Fee | Location / City | Images Status |
| :-: | :--- | :-: | :-: | :-: | :-: | :-: | :--- | :-: |
| 1 | **Portronics Toad 12 Wireless Mouse** | ~₹499 | **₹8 / day** | ₹48 / week | **₹150** | **₹20** | Koramangala 5th Block, **Bengaluru** | `200 OK (image/jpeg)` |
| 2 | **Portronics Toad 11 Wireless Mouse** | ~₹399 | **₹6 / day** | ₹36 / week | **₹120** | **₹15** | Andheri East, **Mumbai** | `200 OK (image/jpeg)` |
| 3 | **Portronics Toad One Wireless Mouse** | ~₹799 | **₹12 / day** | ₹72 / week | **₹240** | **₹25** | Hitec City, **Hyderabad** | `200 OK (image/jpeg)` |
| 4 | **Portronics Toad 23 Wireless Mouse** | ~₹549 | **₹9 / day** | ₹54 / week | **₹165** | **₹20** | DLF Cyber City, **Delhi NCR** | `200 OK (image/jpeg)` |

---

## 2. Product Features & Descriptions

1. **Portronics Toad 12 Wireless Mouse**:
   - 2.4GHz wireless optical mouse, 1200 DPI optical sensor, ergonomic contour grip for fatigue-free extended work sessions, 3-million click lifespan switches, smart energy-saving sleep mode, plug-and-play USB nano dongle.
2. **Portronics Toad 11 Wireless Mouse**:
   - Ultra-compact and lightweight, whisper-quiet silent click buttons, adjustable 1600 DPI optical sensor, ambidextrous comfort profile, up to 6 months battery life on a single AA battery.
3. **Portronics Toad One Wireless Mouse**:
   - Triple connectivity (Bluetooth 5.3 + Bluetooth 5.0 + 2.4GHz Wireless USB), 3-level adjustable DPI (800 / 1200 / 1600 DPI), ergonomic thumb rest contour, 500mAh built-in lithium rechargeable battery with fast Type-C charging, RGB multi-color breathing ambient illumination, silent clicks.
4. **Portronics Toad 23 Wireless Mouse**:
   - Premium dual-tone ergonomic body, 2.4GHz lag-free reliable wireless connection up to 10m, silent acoustic click dampers, 1200 DPI optical engine, anti-skid rubberized tactile scroll wheel, auto-sleep battery endurance.

---

## 3. Seed & Codebase Integration

- **Seed Data Source**: Added to [`grabit-backend/src/data/seedData.js`](file:///c:/Users/aksha/Documents/antigravity/happy-borg/grabit-backend/src/data/seedData.js).
- **In-Memory Store**: Automatically loaded by [`grabit-backend/src/data/memoryStore.js`](file:///c:/Users/aksha/Documents/antigravity/happy-borg/grabit-backend/src/data/memoryStore.js).
- **Reproducible Seed Script**: Integrated into [`grabit-backend/scripts/seed-products.js`](file:///c:/Users/aksha/Documents/antigravity/happy-borg/grabit-backend/scripts/seed-products.js).
- **Total Seed Catalog**: Expanded from 12 to **16 products** across all 6 marketplace categories.

---

## 4. Live Production Verification Results

```
--- VERIFYING PORTRONICS TOAD LISTINGS ON LIVE PRODUCTION ---
Search Portronics response status: 200 | Total found: 4

• Title: Portronics Toad 12 Wireless Mouse (66d0a1b2c3d4e5f6a7b8c90d)
  Daily Rate: ₹8/day | Weekly: ₹48 | Deposit: ₹150 | Damage Fee: ₹20
  Location: Koramangala 5th Block, 80 Feet Road, Bengaluru
  Image status: 200 (image/jpeg)

• Title: Portronics Toad 11 Wireless Mouse (66d0a1b2c3d4e5f6a7b8c90e)
  Daily Rate: ₹6/day | Weekly: ₹36 | Deposit: ₹120 | Damage Fee: ₹15
  Location: Andheri East, MIDC Industrial Area, Mumbai
  Image status: 200 (image/jpeg)

• Title: Portronics Toad One Wireless Mouse (66d0a1b2c3d4e5f6a7b8c90f)
  Daily Rate: ₹12/day | Weekly: ₹72 | Deposit: ₹240 | Damage Fee: ₹25
  Location: Hitec City, Madhapur, Hyderabad
  Image status: 200 (image/jpeg)

• Title: Portronics Toad 23 Wireless Mouse (66d0a1b2c3d4e5f6a7b8c910)
  Daily Rate: ₹9/day | Weekly: ₹54 | Deposit: ₹165 | Damage Fee: ₹20
  Location: DLF Cyber City, Phase 2, Delhi NCR
  Image status: 200 (image/jpeg)

Electronics category total listings: 6
✓ ALL 4 PORTRONICS TOAD LISTINGS ARE LIVE AND FULLY FUNCTIONAL ON PRODUCTION!
```
