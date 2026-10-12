# FoodBridge &mdash; Surplus Food Platform & Cloud Computing Suite

FoodBridge is a serverless web platform engineered with plain HTML5, CSS3, and JavaScript (ES Modules) using the **Firebase Web SDK v10 Modular API**, **Chart.js**, and **Leaflet OpenStreetMap** loaded exclusively via CDN. It operates 100% within the free **Firebase Spark Plan** with zero server maintenance.

---

## 🌟 Architecture & Features

### 1. Identity & Role-Based Access Control (RBAC)
- **Firebase Authentication** (Email & Password).
- Three user roles with specialized views and personalized demo tools:
  - **Food Donor**: Post surplus meals with Chennai coordinates, categories, and servings; view live contribution analytics; seed and clear account-specific demo donations.
  - **NGO / Shelter**: Real-time discovery feed of available food across Chennai; atomic claims via `runTransaction`; **Dedicated Claimed Analytics** with 5 live charts, 4 stat cards, and recent claims table; seed and clear account-specific 60-day demo claims.
  - **Cloud Admin**: System-wide live analytics, system demo data seeder, Firestore scalability benchmarking, Cloud Monitor latency telemetry, and cloud cost estimator.

### 2. NGO Dedicated "Claimed Analytics" & 60-Day Seeder
The NGO dashboard features a rich **"📊 Claimed Analytics"** tab:
- **Stat Cards**:
  1. **Total Claims**: Live count of claims made by the logged-in NGO.
  2. **Meals Collected**: Cumulative sum of servings collected.
  3. **Avg Claim Response Time**: Average duration between donation creation (`createdAt`) and claim submission (`claimedAt`) in minutes.
  4. **Pickup Completion Rate %**: Percentage of claimed meals marked as `Picked Up`.
- **Live Reactive Charts (Chart.js via `onSnapshot`)**:
  1. **Bar Chart**: Claims per week (last 8 weeks).
  2. **Line Chart**: Cumulative meals collected over time (last 30 days).
  3. **Pie Chart**: Status breakdown (Picked Up vs Claimed).
  4. **Doughnut Chart**: Meals collected by category (*Cooked Meals, Bakery & Bread, Fresh Produce, Sweets & Dairy, Snacks & Tiffin*).
  5. **Horizontal Bar Chart**: Top 5 donors collected from.
- **Recent Claims Table**:
  - Live table showing the 10 most recent claims: *Food Item, Donor Name, Servings, Status Badge, Claimed Time, Pickup Time*.
- **NGO 60-Day Demo Seeder ("Load My Demo Data")**:
  - Generates ~60 claimed listings with `claimedBy = currentUser.uid`, `claimedByNgoId = currentUser.uid`, `ngoName = ...`, and `isDemo: true`.
  - Realistic timeline spread across the **last 60 days** with organic daily variance.
  - `claimedAt` set realistically between **10 minutes and 3 hours** after `createdAt`.
  - Status mix: ~30% Claimed and ~70% Picked Up (with `pickedUpAt` 1 to 4 hours after `claimedAt`).
  - Uses 8 realistic fictional donors:
    1. *Hostel Block A Mess*
    2. *Sri Annapoorna Restaurant*
    3. *Campus Canteen*
    4. *Hotel Saravana*
    5. *Wedding Hall Kitchen*
    6. *Bakery Fresh*
    7. *Sweet Corner*
    8. *Temple Annadanam Kitchen*
  - Servings from 10 to 250 across Chennai geographic coordinates.
  - Adds ~8 Available listings so the NGO can practice claiming live items on the map or feed.
  - **"Clear My Demo Data"**: Safely deletes only documents where `isDemo: true && (claimedBy == currentUser.uid || claimedByNgoId == currentUser.uid)`.

### 3. Concurrency-Safe Claim Logic (`runTransaction`)
Located in `app.js` (`claimListingTransaction`):
- Both `claimedBy` and `claimedByNgoId`, along with `ngoName`, `claimedByNgoName`, and `claimedAt: Timestamp.now()` are atomically committed.
- When an NGO claims food, exactly one transaction succeeds while concurrent requests abort safely with an alert, preventing double-claims.

### 4. Real-Time Leaflet OpenStreetMap (Chennai Area)
- Centered on Chennai (`[13.0827, 80.2707]`).
- Visual status pins across Chennai (T. Nagar, Adyar, Velachery, Anna Nagar, Guindy, Mylapore, Tambaram, OMR, etc.).
- Interactive popups allow NGOs to claim available food directly from the map pins.

### 5. Cloud Monitor, Scalability Simulator & Cost Estimator
- **Cloud Monitor**: Live write and read latency benchmark in milliseconds against Firestore (`asia-south1` Mumbai).
- **Scalability Simulator**: Benchmarks Firestore writeBatch at 50, 100, 250, and 500 listings, outputting a live results table and throughput chart.
- **Cloud Cost Estimator**: Calculates estimated monthly costs under Spark and Blaze tiers with sliders for DAU, Reads, Writes, and Storage, comparing against an \$18.50/mo 24/7 IaaS Linux VM.
- **Cloud Architecture**: Topology diagram and cloud computing theory (PaaS vs IaaS, Elasticity, Pay-as-you-go).
- **Offline Persistence**: Handled via `enableMultiTabIndexedDbPersistence(db)` with an offline alert banner.

---

## 🔒 Recommended Firestore Security Rules

Deploy under **Firestore Database > Rules** in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function isAdmin() {
      return isAuthenticated() && getUserData().role == 'Admin';
    }

    // Users Collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId) || isAdmin();
    }

    // Listings Collection
    match /listings/{listingId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow delete: if isAuthenticated() && (
        resource.data.donorId == request.auth.uid || 
        resource.data.claimedBy == request.auth.uid || 
        resource.data.claimedByNgoId == request.auth.uid || 
        isAdmin()
      );
      allow update: if isAuthenticated();
    }

    // Telemetry Collection (for latency ping)
    match /_telemetry/{userId} {
      allow read, write: if isOwner(userId);
    }
  }
}
```

---

## 🚀 Pre-Deployment Guide for Vercel & Render

Before deploying to Vercel or Render, complete these two critical steps to prevent runtime authentication failures:

### 1. Authorize Your Deployment Domain in Firebase
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your project: **`foodbridge-50468`**.
3. In the left navigation, go to **Build &rarr; Authentication &rarr; Settings &rarr; Authorized domains**.
4. Click **Add domain** and enter your production domain (e.g., `foodbridge.vercel.app` or `foodbridge.onrender.com`).

### 2. Static Site Deployment Settings
- **Vercel**: Framework Preset: **Other**, Build Command: empty, Output Directory: `.`.
- **Render**: Create **Static Site**, Publish Directory: `.`, Build Command: empty.

---

## 📸 Presentation / Viva Testing Checklist

1. **Log in as NGO**:
   - Register an account with role **NGO / Shelter** (or log in).
   - Click **🌱 Load My Demo Data (~68 Listings)** on the Available Feed or Claimed Analytics view.
2. **Inspect NGO Claimed Analytics**:
   - Click **📊 Claimed Analytics** in the top navigation.
   - Verify the **4 stat cards**: Total Claims (~60), Meals Collected (~5,000+), Avg Response Time (~45-90 min), Pickup Completion Rate (~70%).
   - Verify all **5 charts**:
     1. Claims per week (last 8 weeks)
     2. Meals collected over time (last 30 days)
     3. Status breakdown (Picked Up vs Claimed)
     4. Meals by category
     5. Top 5 donors collected from
   - Verify the **10 Most Recent Claims Table** shows food items, donor names, servings, status badges, and formatted timestamps.
3. **Inspect Firestore Console**:
   - Open any seeded listing in Firestore: confirm it contains `claimedBy`, `claimedByNgoId`, `claimedAt`, and `isDemo: true`.
4. **Screenshot**:
   - Capture clean screenshots of the Claimed Analytics page and Recent Claims table for your presentation slides.
