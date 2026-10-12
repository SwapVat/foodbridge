/**
 * FoodBridge - Surplus Food Donation & Cloud Computing Platform
 * Firebase Modular SDK v10 (Loaded via CDN)
 *
 * Core Capabilities:
 * 1. Firebase Authentication with custom roles: "Donor", "NGO", "Admin"
 * 2. Cloud Firestore with Offline Multi-Tab IndexedDB Persistence
 * 3. Atomic Concurrency Claim Logic using runTransaction
 * 4. Real-time Listeners (onSnapshot) syncing UI, Leaflet Maps, and Chart.js
 * 5. Dedicated NGO Claimed Analytics & 60-Day Rich Demo Data Seeder
 * 6. Cloud Latency Telemetry, Scalability Benchmarking, and Quota Cost Model
 */

// ==========================================
// 1. FIREBASE SDK IMPORTS (CDN MODULAR v10)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  runTransaction,
  writeBatch,
  serverTimestamp,
  Timestamp,
  enableMultiTabIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ==========================================
// 2. FIREBASE CONFIGURATION & INITIALIZATION
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBI7sO03Ju2y1hVAi7HXnrTHsV28sp1Hgc",
  authDomain: "foodbridge-50468.firebaseapp.com",
  projectId: "foodbridge-50468",
  storageBucket: "foodbridge-50468.firebasestorage.app",
  messagingSenderId: "833123850612",
  appId: "1:833123850612:web:5801b31d41ec53bf4fb421",
  measurementId: "G-LFKCZWQP8Z"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Services
const auth = getAuth(app);
const db = getFirestore(app);

// Enable Offline Multi-Tab IndexedDB Persistence
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("Multiple tabs open; persistence enabled in first tab.");
  } else if (err.code === "unimplemented") {
    console.warn("Browser does not support IndexedDB offline persistence.");
  }
});

// ==========================================
// 3. APPLICATION STATE & DOM REFERENCES
// ==========================================
let currentUser = null;         // Firebase Auth user object
let currentUserData = null;     // Firestore profile { role, displayName, email }
let unsubscribeListings = null;   // Active Firestore onSnapshot listener
let currentView = "donorView";  // Active tab ID
let allListingsCache = [];      // In-memory cache for live charts & map
let leafletMapInstance = null;  // Leaflet map
let leafletMarkersLayer = null; // Marker cluster/group

// Chart.js Instances (General & Donor/Admin)
let chartListingsPerDay = null;
let chartListingsByStatus = null;
let chartFoodByCategory = null;
let chartMealsSavedLine = null;
let chartTopDonors = null;
let chartTopNgos = null;
let chartScalability = null;
let chartCostComparison = null;

// Chart.js Instances (Dedicated NGO Claimed Analytics)
let chartNgoClaimsPerWeek = null;
let chartNgoMealsOverTime = null;
let chartNgoStatusPie = null;
let chartNgoCategoryDoughnut = null;
let chartNgoTopDonors = null;

// Benchmark history for Scalability Simulator
let benchmarkHistory = [];

// DOM Elements
const offlineBanner = document.getElementById("offlineBanner");
const navUserSection = document.getElementById("navUserSection");
const navUserEmail = document.getElementById("navUserEmail");
const navUserRoleBadge = document.getElementById("navUserRoleBadge");
const navAvatar = document.getElementById("navAvatar");
const logoutBtn = document.getElementById("logoutBtn");
const navTabs = document.getElementById("navTabs");

// Auth Form Elements
const authView = document.getElementById("authView");
const tabLogin = document.getElementById("tabLogin");
const tabSignup = document.getElementById("tabSignup");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const authSubtitle = document.getElementById("authSubtitle");

// View Sections
const views = {
  donorView: document.getElementById("donorView"),
  ngoView: document.getElementById("ngoView"),
  ngoAnalyticsView: document.getElementById("ngoAnalyticsView"),
  mapView: document.getElementById("mapView"),
  analyticsView: document.getElementById("analyticsView"),
  adminView: document.getElementById("adminView"),
  monitorView: document.getElementById("monitorView"),
  costView: document.getElementById("costView"),
  archView: document.getElementById("archView")
};

// Donor Controls
const createListingForm = document.getElementById("createListingForm");
const donorListingsContainer = document.getElementById("donorListingsContainer");
const donorListingCount = document.getElementById("donorListingCount");
const locationPreset = document.getElementById("locationPreset");
const geoCoordinates = document.getElementById("geoCoordinates");

// NGO Controls
const ngoListingsContainer = document.getElementById("ngoListingsContainer");
const ngoListingCount = document.getElementById("ngoListingCount");
const showAllStatusCheckbox = document.getElementById("showAllStatusCheckbox");

// Map Elements
const mapStatusCount = document.getElementById("mapStatusCount");

// Notifications Container
const notificationContainer = document.getElementById("notificationContainer");

// ==========================================
// 4. OFFLINE / ONLINE DETECTION
// ==========================================
function updateOnlineStatus() {
  const isOnline = navigator.onLine;
  if (isOnline) {
    offlineBanner.classList.add("hidden");
  } else {
    offlineBanner.classList.remove("hidden");
  }
  const metricNet = document.getElementById("metricNetworkStatus");
  if (metricNet) {
    metricNet.innerText = isOnline ? "Online" : "Offline";
    metricNet.className = `stat-value ${isOnline ? 'text-success' : 'text-danger'}`;
  }
}
window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();

// ==========================================
// 5. TOAST NOTIFICATION UTILITY
// ==========================================
function showNotification(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  notificationContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==========================================
// 6. AUTH TAB SWITCHING
// ==========================================
tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active");
  tabSignup.classList.remove("active");
  loginForm.classList.remove("hidden");
  signupForm.classList.add("hidden");
  authSubtitle.innerText = "Sign in to access your donation or management dashboard.";
});

tabSignup.addEventListener("click", () => {
  tabSignup.classList.add("active");
  tabLogin.classList.remove("active");
  signupForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  authSubtitle.innerText = "Register as a Food Donor, NGO / Shelter, or Cloud Admin.";
});

// ==========================================
// 7. FIREBASE AUTHENTICATION LOGIC
// ==========================================

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const role = document.querySelector('input[name="roleChoice"]:checked')?.value || "Donor";
  const submitBtn = document.getElementById("signupSubmitBtn");

  submitBtn.disabled = true;
  submitBtn.innerText = "Creating account...";

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      displayName: name,
      email: email,
      role: role,
      createdAt: serverTimestamp()
    });

    showNotification(`Welcome, ${name}! Registered as ${role}.`, "success");
    signupForm.reset();
  } catch (error) {
    console.error("Signup error:", error);
    showNotification(error.message || "Failed to create account.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Create Account";
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const submitBtn = document.getElementById("loginSubmitBtn");

  submitBtn.disabled = true;
  submitBtn.innerText = "Signing in...";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    showNotification("Signed in successfully!", "success");
    loginForm.reset();
  } catch (error) {
    console.error("Login error:", error);
    showNotification(error.message || "Invalid credentials.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Sign In";
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    if (unsubscribeListings) {
      unsubscribeListings();
      unsubscribeListings = null;
    }
    await signOut(auth);
    showNotification("Logged out successfully.", "info");
  } catch (error) {
    console.error("Logout error:", error);
    showNotification("Error logging out.", "error");
  }
});

onAuthStateChanged(auth, async (user) => {
  if (unsubscribeListings) {
    unsubscribeListings();
    unsubscribeListings = null;
  }

  if (user) {
    currentUser = user;
    try {
      const userDocSnap = await getDoc(doc(db, "users", user.uid));
      if (userDocSnap.exists()) {
        currentUserData = userDocSnap.data();
      } else {
        currentUserData = { role: "Donor", email: user.email, displayName: "User" };
      }
      setupUserUI();
    } catch (err) {
      console.error("Error loading user profile:", err);
      currentUserData = { role: "Donor", email: user.email, displayName: "User" };
      setupUserUI();
    }
  } else {
    currentUser = null;
    currentUserData = null;
    tearDownUserUI();
  }
});

// ==========================================
// 8. DYNAMIC NAVIGATION & TAB SWITCHING
// ==========================================

function switchTab(viewId) {
  currentView = viewId;
  Object.keys(views).forEach((v) => {
    if (views[v]) {
      if (v === viewId) {
        views[v].classList.remove("hidden");
      } else {
        views[v].classList.add("hidden");
      }
    }
  });

  document.querySelectorAll(".nav-tab-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.target === viewId);
  });

  // Re-attach listeners to ensure dynamically visible buttons are bound
  initRoleDemoButtons();

  if (viewId === "mapView") {
    setTimeout(initOrRefreshLeafletMap, 150);
  } else if (viewId === "analyticsView") {
    setTimeout(() => updateAnalyticsCharts(allListingsCache), 150);
  } else if (viewId === "ngoAnalyticsView") {
    setTimeout(() => updateNgoClaimedAnalytics(allListingsCache), 150);
  } else if (viewId === "costView") {
    setTimeout(updateCostEstimator, 150);
  }
}

function buildNavigationTabs(role) {
  navTabs.innerHTML = "";
  const tabsConfig = [];

  if (role === "Donor") {
    tabsConfig.push({ id: "donorView", label: "🍲 Donor Dashboard" });
    tabsConfig.push({ id: "analyticsView", label: "📊 My Analytics" });
    tabsConfig.push({ id: "mapView", label: "🗺️ Donation Map" });
    tabsConfig.push({ id: "archView", label: "☁️ Cloud Architecture" });
  } else if (role === "NGO") {
    tabsConfig.push({ id: "ngoView", label: "🤝 Available Feed" });
    tabsConfig.push({ id: "ngoAnalyticsView", label: "📊 Claimed Analytics" });
    tabsConfig.push({ id: "mapView", label: "🗺️ Chennai Map" });
    tabsConfig.push({ id: "archView", label: "☁️ Cloud Architecture" });
  } else if (role === "Admin") {
    tabsConfig.push({ id: "analyticsView", label: "📊 System Analytics" });
    tabsConfig.push({ id: "adminView", label: "⚡ Demo & Simulator" });
    tabsConfig.push({ id: "mapView", label: "🗺️ Chennai Map" });
    tabsConfig.push({ id: "monitorView", label: "📡 Cloud Monitor" });
    tabsConfig.push({ id: "costView", label: "💰 Cost Estimator" });
    tabsConfig.push({ id: "archView", label: "☁️ Cloud Architecture" });
  }

  tabsConfig.forEach((tab, index) => {
    const btn = document.createElement("button");
    btn.className = `nav-tab-item ${index === 0 ? 'active' : ''}`;
    btn.dataset.target = tab.id;
    btn.innerText = tab.label;
    btn.addEventListener("click", () => switchTab(tab.id));
    navTabs.appendChild(btn);
  });

  navTabs.classList.remove("hidden");
  switchTab(tabsConfig[0].id);
}

function setupUserUI() {
  authView.classList.add("hidden");
  navUserSection.classList.remove("hidden");

  const role = currentUserData.role || "Donor";
  navUserEmail.innerText = currentUserData.displayName || currentUser.email;
  navAvatar.innerText = (currentUserData.displayName || currentUser.email)[0].toUpperCase();
  navUserRoleBadge.innerText = role;

  if (role === "Donor") {
    navUserRoleBadge.className = "badge badge-available";
  } else if (role === "NGO") {
    navUserRoleBadge.className = "badge badge-claimed";
  } else {
    navUserRoleBadge.className = "badge badge-pickedup";
  }

  buildNavigationTabs(role);
  initRealtimeDataFeed();
  initCostEstimatorListeners();
  initRoleDemoButtons();
}

function tearDownUserUI() {
  authView.classList.remove("hidden");
  navUserSection.classList.add("hidden");
  navTabs.classList.add("hidden");
  Object.values(views).forEach((el) => el?.classList.add("hidden"));
  allListingsCache = [];
}

// Preset Location Selector Helper
if (locationPreset && geoCoordinates) {
  locationPreset.addEventListener("change", (e) => {
    const val = e.target.value;
    if (val !== "custom") {
      const parts = val.split(",");
      geoCoordinates.value = `${parts[0]}, ${parts[1]}`;
      const addressField = document.getElementById("pickupAddress");
      if (addressField && !addressField.value) {
        addressField.value = `${parts[2]}, Chennai, Tamil Nadu`;
      }
    }
  });
}

// ==========================================
// 9. REAL-TIME DATA LISTENER (onSnapshot)
// ==========================================

function initRealtimeDataFeed() {
  if (unsubscribeListings) unsubscribeListings();

  const q = collection(db, "listings");
  const listenerStatusEl = document.getElementById("metricListenerStatus");

  unsubscribeListings = onSnapshot(q, (snapshot) => {
    if (listenerStatusEl) {
      listenerStatusEl.innerText = "Connected";
      listenerStatusEl.className = "stat-value text-success";
    }

    const items = [];
    snapshot.forEach((docSnap) => items.push({ id: docSnap.id, ...docSnap.data() }));

    allListingsCache = items;

    renderDonorFeed(items);
    renderNgoFeed(items);
    updateLeafletMarkers(items);
    updateAnalyticsCharts(items);
    updateNgoClaimedAnalytics(items);
    updateCloudMonitorMetrics(items);
  }, (error) => {
    console.error("Firestore onSnapshot error:", error);
    if (listenerStatusEl) {
      listenerStatusEl.innerText = "Disconnected";
      listenerStatusEl.className = "stat-value text-danger";
    }
    showNotification("Real-time sync interrupted: " + error.message, "error");
  });
}

// ==========================================
// 10. DONOR DASHBOARD LOGIC
// ==========================================

createListingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const activeUser = auth.currentUser || currentUser;
  if (!activeUser) {
    showNotification("Please log in first.", "error");
    return;
  }

  const foodItem = document.getElementById("foodItem").value.trim();
  const foodCategory = document.getElementById("foodCategory").value;
  const servings = parseInt(document.getElementById("servingsCount").value, 10) || 1;
  const pickupAddress = document.getElementById("pickupAddress").value.trim();
  const coordsStr = document.getElementById("geoCoordinates").value.trim();
  const bestBefore = document.getElementById("bestBefore").value;
  const submitBtn = document.getElementById("postListingBtn");

  let latitude = 13.0827;
  let longitude = 80.2707;
  if (coordsStr.includes(",")) {
    const [lat, lng] = coordsStr.split(",").map((s) => parseFloat(s.trim()));
    if (!isNaN(lat) && !isNaN(lng)) {
      latitude = lat;
      longitude = lng;
    }
  }

  submitBtn.disabled = true;
  submitBtn.innerText = "Posting Listing...";

  try {
    await addDoc(collection(db, "listings"), {
      foodItem,
      category: foodCategory,
      quantity: `${servings} servings`,
      servings: servings,
      pickupAddress,
      latitude,
      longitude,
      bestBefore,
      status: "Available",
      donorId: activeUser.uid,
      donorEmail: activeUser.email,
      donorName: currentUserData?.displayName || activeUser.email,
      claimedBy: null,
      claimedByNgoId: null,
      ngoName: null,
      claimedByNgoName: null,
      claimedAt: null,
      pickedUpAt: null,
      isDemo: false,
      createdAt: serverTimestamp()
    });

    showNotification("Surplus food donation listed successfully!", "success");
    createListingForm.reset();
  } catch (error) {
    console.error("Error creating listing:", error);
    showNotification("Failed to post food: " + error.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Post Food Donation";
  }
});

function renderDonorFeed(allItems) {
  const activeUser = auth.currentUser || currentUser;
  if (!activeUser) return;
  const donorItems = allItems.filter((item) => item.donorId === activeUser.uid);

  donorItems.sort((a, b) => getEpochTime(b.createdAt) - getEpochTime(a.createdAt));

  donorListingCount.innerText = `${donorItems.length} item${donorItems.length === 1 ? '' : 's'}`;
  donorListingsContainer.innerHTML = "";

  if (donorItems.length === 0) {
    donorListingsContainer.innerHTML = `
      <div class="empty-state">
        <p>You haven't posted any food donations yet.</p>
        <button id="btnEmptyDonorInline" class="btn btn-primary btn-sm" style="margin-top: 1rem;">
          🌱 Load My Demo Data (~40 Listings)
        </button>
      </div>`;
    document.getElementById("btnEmptyDonorInline")?.addEventListener("click", seedDonorDemoData);
    return;
  }

  donorItems.forEach((item) => {
    const isExpired = new Date(item.bestBefore).getTime() < Date.now();
    const card = document.createElement("div");
    card.className = `listing-card ${isExpired && item.status === 'Available' ? 'expired' : ''}`;

    let badgeClass = "badge-available";
    let statusDisplay = item.status;
    if (item.status === "Claimed") badgeClass = "badge-claimed";
    if (item.status === "Picked Up") badgeClass = "badge-pickedup";
    if (item.status === "Available" && isExpired) {
      badgeClass = "badge-expired";
      statusDisplay = "Expired";
    }

    card.innerHTML = `
      <div class="listing-top">
        <div>
          <h4 class="listing-title">${escapeHtml(item.foodItem)}</h4>
          <span style="font-size: 0.75rem; color: var(--primary); font-weight: 600;">🏷️ ${escapeHtml(item.category || 'General')}</span>
        </div>
        <span class="badge ${badgeClass}">${statusDisplay}</span>
      </div>

      <div class="listing-meta">
        <div class="meta-item">
          <strong>Quantity:</strong> <span>${escapeHtml(item.quantity || item.servings + ' servings')}</span>
        </div>
        <div class="meta-item">
          <strong>Address:</strong> <span>${escapeHtml(item.pickupAddress)}</span>
        </div>
        <div class="meta-item">
          <strong>Best Before:</strong> <span>${formatDateTime(item.bestBefore)} ${isExpired ? '(Expired)' : ''}</span>
        </div>
        ${(item.ngoName || item.claimedByNgoName) ? `
          <div class="meta-item">
            <strong>NGO:</strong> <span>Claimed by ${escapeHtml(item.ngoName || item.claimedByNgoName)}</span>
          </div>` : ''}
      </div>

      <div class="listing-actions">
        <button class="btn btn-delete btn-sm" data-id="${item.id}">Delete Listing</button>
      </div>
    `;

    card.querySelector(".btn-delete").addEventListener("click", () => deleteListing(item.id));
    donorListingsContainer.appendChild(card);
  });
}

async function deleteListing(listingId) {
  if (!confirm("Are you sure you want to delete this listing?")) return;
  try {
    await deleteDoc(doc(db, "listings", listingId));
    showNotification("Listing deleted successfully.", "info");
  } catch (err) {
    showNotification("Could not delete listing: " + err.message, "error");
  }
}

// ==========================================
// 11. NGO DASHBOARD & CONCURRENCY TRANSACTION
// ==========================================

function renderNgoFeed(allItems) {
  ngoListingsContainer.innerHTML = "";
  const showAll = showAllStatusCheckbox?.checked;
  const activeUser = auth.currentUser || currentUser;

  const docs = [...allItems];
  docs.sort((a, b) => getEpochTime(b.createdAt) - getEpochTime(a.createdAt));

  let activeCount = 0;

  docs.forEach((item) => {
    const isExpired = new Date(item.bestBefore).getTime() < Date.now();
    const isAvailable = item.status === "Available" && !isExpired;
    const isClaimedByMe = (item.status === "Claimed" || item.status === "Picked Up") &&
      (item.claimedBy === activeUser?.uid || item.claimedByNgoId === activeUser?.uid);

    if (isAvailable) activeCount++;
    if (!showAll && !isAvailable && !isClaimedByMe) return;

    const card = document.createElement("div");
    card.className = `listing-card ${isExpired && item.status === 'Available' ? 'expired' : ''} ${item.status === 'Claimed' ? 'claimed' : ''} ${item.status === 'Picked Up' ? 'picked-up' : ''}`;

    let badgeClass = "badge-available";
    let statusDisplay = item.status;
    if (item.status === "Claimed") badgeClass = "badge-claimed";
    if (item.status === "Picked Up") badgeClass = "badge-pickedup";
    if (item.status === "Available" && isExpired) {
      badgeClass = "badge-expired";
      statusDisplay = "Expired";
    }

    card.innerHTML = `
      <div class="listing-top">
        <div>
          <h4 class="listing-title">${escapeHtml(item.foodItem)}</h4>
          <span style="font-size: 0.75rem; color: var(--primary); font-weight: 600;">🏷️ ${escapeHtml(item.category || 'General')}</span>
        </div>
        <span class="badge ${badgeClass}">${statusDisplay}</span>
      </div>

      <div class="listing-meta">
        <div class="meta-item">
          <strong>Quantity:</strong> <span>${escapeHtml(item.quantity || item.servings + ' servings')}</span>
        </div>
        <div class="meta-item">
          <strong>Address:</strong> <span>${escapeHtml(item.pickupAddress)}</span>
        </div>
        <div class="meta-item">
          <strong>Donor:</strong> <span>${escapeHtml(item.donorName || item.donorEmail || 'Anonymous')}</span>
        </div>
        <div class="meta-item">
          <strong>Best Before:</strong> <span>${formatDateTime(item.bestBefore)} ${isExpired ? '(Expired)' : ''}</span>
        </div>
        ${(item.ngoName || item.claimedByNgoName) ? `
          <div class="meta-item">
            <strong>Claimed By:</strong> <span>${escapeHtml(item.ngoName || item.claimedByNgoName)} ${isClaimedByMe ? '(You)' : ''}</span>
          </div>` : ''}
      </div>

      <div class="listing-actions">
        ${renderNgoActions(item, isExpired)}
      </div>
    `;

    const claimBtn = card.querySelector(".btn-claim-action");
    if (claimBtn) {
      claimBtn.addEventListener("click", () => claimListingTransaction(item.id));
    }

    const pickupBtn = card.querySelector(".btn-pickup-action");
    if (pickupBtn) {
      pickupBtn.addEventListener("click", () => markAsPickedUp(item.id));
    }

    ngoListingsContainer.appendChild(card);
  });

  if (ngoListingCount) {
    ngoListingCount.innerText = `${activeCount} available`;
  }

  if (ngoListingsContainer.children.length === 0) {
    ngoListingsContainer.innerHTML = `
      <div class="empty-state">
        <p>No active surplus food donations found right now.</p>
        <button id="btnEmptyNgoInline" class="btn btn-primary btn-sm" style="margin-top: 1rem;">
          🌱 Load My Demo Data (~68 Listings)
        </button>
      </div>`;
    document.getElementById("btnEmptyNgoInline")?.addEventListener("click", seedNgoDemoData);
  }
}

if (showAllStatusCheckbox) {
  showAllStatusCheckbox.addEventListener("change", () => {
    renderNgoFeed(allListingsCache);
  });
}

function renderNgoActions(item, isExpired) {
  const activeUser = auth.currentUser || currentUser;
  const isClaimedByMe = (item.claimedBy === activeUser?.uid || item.claimedByNgoId === activeUser?.uid);

  if (item.status === "Available") {
    if (isExpired) {
      return `<button class="btn btn-sm" disabled style="opacity: 0.5;">Expired</button>`;
    }
    return `<button class="btn btn-claim btn-sm btn-claim-action" data-id="${item.id}">Claim Food</button>`;
  }
  if (item.status === "Claimed") {
    if (isClaimedByMe) {
      return `<button class="btn btn-pickup btn-sm btn-pickup-action" data-id="${item.id}">Mark Picked Up</button>`;
    }
    return `<span style="font-size: 0.8rem; color: var(--text-muted);">Claimed by another NGO</span>`;
  }
  if (item.status === "Picked Up") {
    return `<span style="font-size: 0.8rem; color: var(--text-muted);">✓ Pickup Completed</span>`;
  }
  return "";
}

/**
 * Concurrency Claim Logic with runTransaction (stores claimedBy, ngoName, claimedAt)
 */
async function claimListingTransaction(listingId) {
  const activeUser = auth.currentUser || currentUser;
  if (!activeUser) {
    showNotification("Please log in to claim listings.", "error");
    return;
  }
  const listingRef = doc(db, "listings", listingId);

  try {
    await runTransaction(db, async (transaction) => {
      const listingDoc = await transaction.get(listingRef);
      if (!listingDoc.exists()) {
        throw new Error("This food listing does not exist anymore.");
      }

      const data = listingDoc.data();
      if (data.status !== "Available") {
        throw new Error("Sorry, this food was already claimed by another organization!");
      }
      if (new Date(data.bestBefore).getTime() < Date.now()) {
        throw new Error("This food donation has expired and cannot be claimed.");
      }

      const ngoIdentifier = activeUser.uid;
      const ngoNameStr = currentUserData?.displayName || activeUser.email;

      transaction.update(listingRef, {
        status: "Claimed",
        claimedBy: ngoIdentifier,
        claimedByNgoId: ngoIdentifier,
        ngoName: ngoNameStr,
        claimedByNgoName: ngoNameStr,
        claimedAt: Timestamp.now()
      });
    });

    showNotification("Listing claimed successfully! View under Claimed Analytics.", "success");
  } catch (error) {
    console.error("Transaction failed: ", error);
    showNotification(error.message || "Failed to claim listing.", "error");
  }
}

/**
 * Mark as Picked Up (stores pickedUpAt)
 */
async function markAsPickedUp(listingId) {
  try {
    await updateDoc(doc(db, "listings", listingId), {
      status: "Picked Up",
      pickedUpAt: Timestamp.now()
    });
    showNotification("Marked as Picked Up! Thank you for saving meals.", "success");
  } catch (error) {
    showNotification("Could not update status: " + error.message, "error");
  }
}

// ==========================================
// 12. DEDICATED NGO CLAIMED ANALYTICS VIEW
// ==========================================

function updateNgoClaimedAnalytics(items) {
  const activeUser = auth.currentUser || currentUser;
  if (!activeUser || currentUserData?.role !== "NGO") return;

  const myClaims = items.filter((item) =>
    (item.claimedBy === activeUser.uid || item.claimedByNgoId === activeUser.uid)
  );

  const emptyStateEl = document.getElementById("ngoClaimedEmptyState");

  if (myClaims.length === 0) {
    if (emptyStateEl) emptyStateEl.classList.remove("hidden");
    const seedBtn = document.getElementById("btnEmptyNgoAnalyticsSeed");
    if (seedBtn) seedBtn.onclick = seedNgoDemoData;
  } else {
    if (emptyStateEl) emptyStateEl.classList.add("hidden");
  }

  const totalClaims = myClaims.length;
  const totalMealsCollected = myClaims.reduce((sum, i) => sum + (parseInt(i.servings, 10) || 1), 0);
  const pickedUpCount = myClaims.filter((i) => i.status === "Picked Up").length;
  const pickupRate = totalClaims > 0 ? ((pickedUpCount / totalClaims) * 100).toFixed(1) : 0;

  let responseTimeMinutesSum = 0;
  let responseTimeCount = 0;

  myClaims.forEach((item) => {
    const tCreated = getEpochTime(item.createdAt);
    const tClaimed = getEpochTime(item.claimedAt);
    if (tClaimed > tCreated) {
      const diffMinutes = (tClaimed - tCreated) / (1000 * 60);
      responseTimeMinutesSum += diffMinutes;
      responseTimeCount++;
    }
  });

  const avgResponseTimeMin = responseTimeCount > 0 ? Math.round(responseTimeMinutesSum / responseTimeCount) : 45;

  document.getElementById("ngoStatTotalClaims").innerText = totalClaims.toLocaleString();
  document.getElementById("ngoStatMealsCollected").innerText = totalMealsCollected.toLocaleString();
  document.getElementById("ngoStatAvgResponseTime").innerText = `${avgResponseTimeMin} min`;
  document.getElementById("ngoStatPickupRate").innerText = `${pickupRate}%`;

  renderNgoClaimsPerWeekChart(myClaims);
  renderNgoMealsCollectedLineChart(myClaims);
  renderNgoStatusPieChart(myClaims);
  renderNgoCategoryDoughnutChart(myClaims);
  renderNgoTopDonorsChart(myClaims);
  renderNgoRecentClaimsTable(myClaims);
}

function renderNgoClaimsPerWeekChart(claims) {
  const ctx = document.getElementById("chartNgoClaimsPerWeek")?.getContext("2d");
  if (!ctx) return;
  if (chartNgoClaimsPerWeek) chartNgoClaimsPerWeek.destroy();

  const labels = [];
  const data = [];
  const now = Date.now();
  const ONE_WEEK_MS = 7 * 86400000;

  for (let i = 7; i >= 0; i--) {
    const weekStart = now - (i + 1) * ONE_WEEK_MS;
    const weekEnd = now - i * ONE_WEEK_MS;
    labels.push(i === 0 ? "This Week" : `${i}w ago`);

    const count = claims.filter((item) => {
      const t = getEpochTime(item.claimedAt || item.createdAt);
      return t >= weekStart && t < weekEnd;
    }).length;
    data.push(count);
  }

  chartNgoClaimsPerWeek = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Claims",
        data,
        backgroundColor: "#16a34a",
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

function renderNgoMealsCollectedLineChart(claims) {
  const ctx = document.getElementById("chartNgoMealsOverTime")?.getContext("2d");
  if (!ctx) return;
  if (chartNgoMealsOverTime) chartNgoMealsOverTime.destroy();

  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  const recentClaims = claims
    .filter((i) => getEpochTime(i.claimedAt || i.createdAt) >= thirtyDaysAgo)
    .sort((a, b) => getEpochTime(a.claimedAt || a.createdAt) - getEpochTime(b.claimedAt || b.createdAt));

  let runningTotal = 0;
  const labels = [];
  const values = [];

  recentClaims.forEach((item) => {
    runningTotal += parseInt(item.servings, 10) || 1;
    const dateStr = new Date(getEpochTime(item.claimedAt || item.createdAt)).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    });
    labels.push(dateStr);
    values.push(runningTotal);
  });

  if (labels.length === 0) {
    labels.push("Start");
    values.push(0);
  }

  chartNgoMealsOverTime = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Cumulative Meals Collected",
        data: values,
        borderColor: "#15803d",
        backgroundColor: "rgba(21, 128, 61, 0.12)",
        fill: true,
        tension: 0.35,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderNgoStatusPieChart(claims) {
  const ctx = document.getElementById("chartNgoStatusPie")?.getContext("2d");
  if (!ctx) return;
  if (chartNgoStatusPie) chartNgoStatusPie.destroy();

  const pickedUp = claims.filter((i) => i.status === "Picked Up").length;
  const claimed = claims.filter((i) => i.status === "Claimed").length;

  chartNgoStatusPie = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Picked Up (Complete)", "Claimed (Pending)"],
      datasets: [{
        data: [pickedUp, claimed],
        backgroundColor: ["#4f46e5", "#f59e0b"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } }
    }
  });
}

function renderNgoCategoryDoughnutChart(claims) {
  const ctx = document.getElementById("chartNgoCategoryDoughnut")?.getContext("2d");
  if (!ctx) return;
  if (chartNgoCategoryDoughnut) chartNgoCategoryDoughnut.destroy();

  const categoryMeals = {};
  claims.forEach((i) => {
    const cat = i.category || "Cooked Meals";
    categoryMeals[cat] = (categoryMeals[cat] || 0) + (parseInt(i.servings, 10) || 1);
  });

  const labels = Object.keys(categoryMeals).length > 0 ? Object.keys(categoryMeals) : ["No items"];
  const data = Object.keys(categoryMeals).length > 0 ? Object.values(categoryMeals) : [0];

  chartNgoCategoryDoughnut = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } }
    }
  });
}

function renderNgoTopDonorsChart(claims) {
  const ctx = document.getElementById("chartNgoTopDonors")?.getContext("2d");
  if (!ctx) return;
  if (chartNgoTopDonors) chartNgoTopDonors.destroy();

  const donorMeals = {};
  claims.forEach((i) => {
    const donor = i.donorName || "Unknown Donor";
    donorMeals[donor] = (donorMeals[donor] || 0) + (parseInt(i.servings, 10) || 1);
  });

  const topDonors = Object.entries(donorMeals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  chartNgoTopDonors = new Chart(ctx, {
    type: "bar",
    data: {
      labels: topDonors.map((d) => d[0]),
      datasets: [{
        label: "Servings Collected",
        data: topDonors.map((d) => d[1]),
        backgroundColor: "#16a34a",
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } }
    }
  });
}

function renderNgoRecentClaimsTable(claims) {
  const tbody = document.getElementById("ngoRecentClaimsTableBody");
  const countEl = document.getElementById("ngoRecentClaimsCount");
  if (!tbody) return;

  const sortedClaims = [...claims].sort((a, b) =>
    getEpochTime(b.claimedAt || b.createdAt) - getEpochTime(a.claimedAt || a.createdAt)
  ).slice(0, 10);

  if (countEl) countEl.innerText = `${sortedClaims.length} records`;
  tbody.innerHTML = "";

  if (sortedClaims.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No food claims found.</td></tr>`;
    return;
  }

  sortedClaims.forEach((item) => {
    const isPickedUp = item.status === "Picked Up";
    const badgeClass = isPickedUp ? "badge-pickedup" : "badge-claimed";
    const claimedTime = formatDateTime(item.claimedAt || item.createdAt);
    const pickupTime = item.pickedUpAt ? formatDateTime(item.pickedUpAt) : "--";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(item.foodItem)}</strong></td>
      <td>${escapeHtml(item.donorName || 'Donor')}</td>
      <td><span class="counter-badge">${item.servings || 1}</span></td>
      <td><span class="badge ${badgeClass}">${item.status}</span></td>
      <td>${claimedTime}</td>
      <td>${pickupTime}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================
// 13. GENERAL / DONOR / ADMIN ANALYTICS DASHBOARD
// ==========================================

function updateAnalyticsCharts(items) {
  let filteredItems = items;
  const role = currentUserData?.role || "Admin";
  const activeUser = auth.currentUser || currentUser;

  const titleEl = document.getElementById("analyticsTitle");
  const subtitleEl = document.getElementById("analyticsSubtitle");
  const emptyStateEl = document.getElementById("analyticsEmptyState");

  if (role === "Donor") {
    filteredItems = items.filter((i) => i.donorId === activeUser?.uid);
    if (titleEl) titleEl.innerText = "My Donor Contribution Analytics";
    if (subtitleEl) subtitleEl.innerText = "Real-time metrics for your donated surplus food listings.";
  } else if (role === "NGO") {
    filteredItems = items.filter((i) => (i.claimedBy === activeUser?.uid || i.claimedByNgoId === activeUser?.uid));
    if (titleEl) titleEl.innerText = "My NGO Claim Analytics";
    if (subtitleEl) subtitleEl.innerText = "Real-time metrics for meals rescued and claimed by your shelter.";
  } else {
    if (titleEl) titleEl.innerText = "System-Wide Cloud Analytics";
    if (subtitleEl) subtitleEl.innerText = "Real-time aggregate data across all donors and NGOs.";
  }

  if (filteredItems.length === 0) {
    if (emptyStateEl) emptyStateEl.classList.remove("hidden");
    const seedBtn = document.getElementById("btnEmptyStateAnalyticsSeed");
    if (seedBtn) {
      seedBtn.onclick = () => {
        if (role === "Donor") seedDonorDemoData();
        else if (role === "NGO") seedNgoDemoData();
        else seedAdminDemoData();
      };
    }
  } else {
    if (emptyStateEl) emptyStateEl.classList.add("hidden");
  }

  const totalListings = filteredItems.length;
  const totalMealsSaved = filteredItems
    .filter((i) => i.status === "Claimed" || i.status === "Picked Up")
    .reduce((sum, i) => sum + (parseInt(i.servings, 10) || 1), 0);

  const activeNgoSet = new Set();
  filteredItems.forEach((i) => {
    if (i.claimedBy || i.claimedByNgoId) activeNgoSet.add(i.claimedBy || i.claimedByNgoId);
  });
  const activeNgos = activeNgoSet.size;

  const claimedOrPickedCount = filteredItems.filter((i) => i.status === "Claimed" || i.status === "Picked Up").length;
  const claimRate = totalListings > 0 ? ((claimedOrPickedCount / totalListings) * 100).toFixed(1) : 0;

  document.getElementById("statTotalListings").innerText = totalListings.toLocaleString();
  document.getElementById("statMealsSaved").innerText = totalMealsSaved.toLocaleString();
  document.getElementById("statActiveNgos").innerText = activeNgos.toLocaleString();
  document.getElementById("statClaimRate").innerText = `${claimRate}%`;

  const last7DaysLabels = [];
  const last7DaysCounts = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString(undefined, { weekday: "short", month: "numeric", day: "numeric" });
    last7DaysLabels.push(dateStr);

    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
    const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();

    const count = filteredItems.filter((item) => {
      const created = getEpochTime(item.createdAt);
      return created >= startOfDay && created <= endOfDay;
    }).length;
    last7DaysCounts.push(count);
  }
  renderBarChartListingsPerDay(last7DaysLabels, last7DaysCounts);

  const statusCounts = {
    Available: filteredItems.filter((i) => i.status === "Available" && new Date(i.bestBefore).getTime() >= Date.now()).length,
    Claimed: filteredItems.filter((i) => i.status === "Claimed").length,
    "Picked Up": filteredItems.filter((i) => i.status === "Picked Up").length,
    Expired: filteredItems.filter((i) => i.status === "Available" && new Date(i.bestBefore).getTime() < Date.now()).length
  };
  renderPieChartStatus(statusCounts);

  const categoryCounts = {};
  filteredItems.forEach((i) => {
    const cat = i.category || "Cooked Meals";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  renderDoughnutCategory(categoryCounts);

  renderMealsSavedLineChart(filteredItems);
  renderTopContributors(items);
}

function renderBarChartListingsPerDay(labels, data) {
  const ctx = document.getElementById("chartListingsPerDay")?.getContext("2d");
  if (!ctx) return;
  if (chartListingsPerDay) chartListingsPerDay.destroy();

  chartListingsPerDay = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Listings Created",
        data,
        backgroundColor: "#16a34a",
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

function renderPieChartStatus(statusCounts) {
  const ctx = document.getElementById("chartListingsByStatus")?.getContext("2d");
  if (!ctx) return;
  if (chartListingsByStatus) chartListingsByStatus.destroy();

  chartListingsByStatus = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: ["#16a34a", "#f59e0b", "#4f46e5", "#94a3b8"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } }
    }
  });
}

function renderDoughnutCategory(categoryCounts) {
  const ctx = document.getElementById("chartFoodByCategory")?.getContext("2d");
  if (!ctx) return;
  if (chartFoodByCategory) chartFoodByCategory.destroy();

  const labels = Object.keys(categoryCounts).length > 0 ? Object.keys(categoryCounts) : ["No items"];
  const data = Object.keys(categoryCounts).length > 0 ? Object.values(categoryCounts) : [0];

  chartFoodByCategory = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } }
    }
  });
}

function renderMealsSavedLineChart(items) {
  const ctx = document.getElementById("chartMealsSavedLine")?.getContext("2d");
  if (!ctx) return;
  if (chartMealsSavedLine) chartMealsSavedLine.destroy();

  const claimedItems = items
    .filter((i) => i.status === "Claimed" || i.status === "Picked Up")
    .sort((a, b) => getEpochTime(a.createdAt) - getEpochTime(b.createdAt));

  let runningTotal = 0;
  const labels = [];
  const values = [];

  claimedItems.forEach((item) => {
    runningTotal += parseInt(item.servings, 10) || 1;
    const epoch = getEpochTime(item.createdAt);
    const dateStr = new Date(epoch).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    labels.push(dateStr);
    values.push(runningTotal);
  });

  if (labels.length === 0) {
    labels.push("Start");
    values.push(0);
  }

  chartMealsSavedLine = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Cumulative Meals Saved",
        data: values,
        borderColor: "#15803d",
        backgroundColor: "rgba(22, 163, 74, 0.12)",
        fill: true,
        tension: 0.35,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderTopContributors(items) {
  const donorTotals = {};
  items.forEach((i) => {
    const name = i.donorName || i.donorEmail || "Anonymous Donor";
    donorTotals[name] = (donorTotals[name] || 0) + (parseInt(i.servings, 10) || 1);
  });
  const topDonors = Object.entries(donorTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const ctxDonor = document.getElementById("chartTopDonors")?.getContext("2d");
  if (ctxDonor) {
    if (chartTopDonors) chartTopDonors.destroy();
    chartTopDonors = new Chart(ctxDonor, {
      type: "bar",
      data: {
        labels: topDonors.map((d) => d[0]),
        datasets: [{
          label: "Servings Donated",
          data: topDonors.map((d) => d[1]),
          backgroundColor: "#16a34a",
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  const ngoTotals = {};
  items
    .filter((i) => (i.ngoName || i.claimedByNgoName))
    .forEach((i) => {
      const name = i.ngoName || i.claimedByNgoName;
      ngoTotals[name] = (ngoTotals[name] || 0) + (parseInt(i.servings, 10) || 1);
    });
  const topNgos = Object.entries(ngoTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const ctxNgo = document.getElementById("chartTopNgos")?.getContext("2d");
  if (ctxNgo) {
    if (chartTopNgos) chartTopNgos.destroy();
    chartTopNgos = new Chart(ctxNgo, {
      type: "bar",
      data: {
        labels: topNgos.map((n) => n[0]),
        datasets: [{
          label: "Meals Rescued",
          data: topNgos.map((n) => n[1]),
          backgroundColor: "#4f46e5",
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }
}

// ==========================================
// 14. LEAFLET OPENSTREETMAP VIEW (CHENNAI)
// ==========================================

function initOrRefreshLeafletMap() {
  const mapElement = document.getElementById("leafletMap");
  if (!mapElement) return;

  if (!leafletMapInstance) {
    leafletMapInstance = L.map("leafletMap").setView([13.0827, 80.2707], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(leafletMapInstance);

    leafletMarkersLayer = L.layerGroup().addTo(leafletMapInstance);
  } else {
    leafletMapInstance.invalidateSize();
  }

  updateLeafletMarkers(allListingsCache);
}

function updateLeafletMarkers(items) {
  if (!leafletMapInstance || !leafletMarkersLayer) return;

  leafletMarkersLayer.clearLayers();
  let countPlotted = 0;

  items.forEach((item) => {
    const lat = parseFloat(item.latitude);
    const lng = parseFloat(item.longitude);

    if (isNaN(lat) || isNaN(lng)) return;

    const isExpired = new Date(item.bestBefore).getTime() < Date.now();
    let markerColor = "#16a34a"; // Available Green
    if (item.status === "Claimed") markerColor = "#d97706"; // Amber
    if (item.status === "Picked Up") markerColor = "#4f46e5"; // Indigo
    if (isExpired && item.status === "Available") markerColor = "#94a3b8"; // Muted

    const markerHtml = `
      <div style="background-color: ${markerColor}; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">
        🍲
      </div>`;

    const customIcon = L.divIcon({
      className: "custom-leaflet-marker",
      html: markerHtml,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const marker = L.marker([lat, lng], { icon: customIcon });

    const popupContent = document.createElement("div");
    popupContent.style.minWidth = "200px";
    popupContent.innerHTML = `
      <h4 style="margin: 0 0 4px 0; color: #0f172a;">${escapeHtml(item.foodItem)}</h4>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">
        <strong>Category:</strong> ${escapeHtml(item.category || 'General')}<br>
        <strong>Quantity:</strong> ${escapeHtml(item.quantity || item.servings + ' servings')}<br>
        <strong>Status:</strong> <span style="font-weight: bold; color: ${markerColor};">${item.status}${isExpired && item.status === 'Available' ? ' (Expired)' : ''}</span><br>
        <strong>Address:</strong> ${escapeHtml(item.pickupAddress)}
      </div>
      ${currentUserData?.role === 'NGO' && item.status === 'Available' && !isExpired ? `
        <button class="btn btn-claim btn-sm btn-block popup-claim-btn" style="padding: 4px 8px; font-size: 11px;">
          Claim Food
        </button>
      ` : ''}
    `;

    const popupClaimBtn = popupContent.querySelector(".popup-claim-btn");
    if (popupClaimBtn) {
      popupClaimBtn.addEventListener("click", () => {
        claimListingTransaction(item.id);
        marker.closePopup();
      });
    }

    marker.bindPopup(popupContent);
    leafletMarkersLayer.addLayer(marker);
    countPlotted++;
  });

  if (mapStatusCount) {
    mapStatusCount.innerText = `${countPlotted} locations mapped across Chennai`;
  }
}

// ==========================================
// 15. RICH REALISTIC DEMO DATA SEEDERS
// ==========================================

const CHENNAI_DEMO_LOCATIONS = [
  { area: "Usman Road, T. Nagar, Chennai", lat: 13.0418, lng: 80.2341 },
  { area: "Gandhi Nagar, Adyar, Chennai", lat: 13.0012, lng: 80.2565 },
  { area: "100 Feet Bypass Road, Velachery, Chennai", lat: 12.9815, lng: 80.2180 },
  { area: "2nd Avenue, Anna Nagar, Chennai", lat: 13.0850, lng: 80.2101 },
  { area: "Kathipara Junction, Guindy, Chennai", lat: 13.0067, lng: 80.2206 },
  { area: "North Mada Street, Mylapore, Chennai", lat: 13.0339, lng: 80.2691 },
  { area: "EVR Periyar Salai, Chennai Central", lat: 13.0827, lng: 80.2707 },
  { area: "GST Road, Tambaram, Chennai", lat: 12.9249, lng: 80.1000 },
  { area: "Rajiv Gandhi Salai, OMR Thoraipakkam", lat: 12.9360, lng: 80.2290 },
  { area: "Sterling Road, Nungambakkam, Chennai", lat: 13.0604, lng: 80.2437 }
];

const RICH_INDIAN_FOOD_ITEMS = [
  { item: "Chettinad Veg Biryani with Onion Raita", cat: "Cooked Meals", baseServings: 50 },
  { item: "Fresh Phulka Chapatis & Paneer Butter Masala", cat: "Cooked Meals", baseServings: 60 },
  { item: "Steamed Idli & Medu Vada with Drumstick Sambar", cat: "Snacks & Tiffin", baseServings: 75 },
  { item: "Home-style Dal Tadka with Steamed Basmati Rice", cat: "Cooked Meals", baseServings: 45 },
  { item: "South Indian Curd Rice with Mango Pickle", cat: "Cooked Meals", baseServings: 80 },
  { item: "Assorted Bakery Bread Loaves & Vegetable Puffs", cat: "Bakery & Bread", baseServings: 40 },
  { item: "Fresh Apples, Oranges & Banana Crates", cat: "Fresh Produce", baseServings: 90 },
  { item: "Mysore Pak & Mini Gulab Jamun Sweet Boxes", cat: "Sweets & Dairy", baseServings: 35 },
  { item: "Crispy Masala Dosas with Coconut Chutney", cat: "Snacks & Tiffin", baseServings: 55 },
  { item: "Raw Rice, Toor Dal & Cooking Oil Packets", cat: "Groceries & Grains", baseServings: 120 }
];

const FICTIONAL_NGOS = [
  { id: "fictional_ngo_1", name: "Anna Food Bank" },
  { id: "fictional_ngo_2", name: "Hope Foundation" },
  { id: "fictional_ngo_3", name: "Chennai Care Trust" },
  { id: "fictional_ngo_4", name: "Seva Kitchen" },
  { id: "fictional_ngo_5", name: "Asha Shelter" }
];

// 8 Fictional Donors as specified by the user
const FICTIONAL_DONORS = [
  { id: "fictional_donor_1", name: "Hostel Block A Mess" },
  { id: "fictional_donor_2", name: "Sri Annapoorna Restaurant" },
  { id: "fictional_donor_3", name: "Campus Canteen" },
  { id: "fictional_donor_4", name: "Hotel Saravana" },
  { id: "fictional_donor_5", name: "Wedding Hall Kitchen" },
  { id: "fictional_donor_6", name: "Bakery Fresh" },
  { id: "fictional_donor_7", name: "Sweet Corner" },
  { id: "fictional_donor_8", name: "Temple Annadanam Kitchen" }
];

function initRoleDemoButtons() {
  const attachSafe = (id, fn) => {
    const el = document.getElementById(id);
    if (el) {
      el.removeEventListener("click", fn);
      el.addEventListener("click", fn);
    }
  };

  // Donor buttons
  attachSafe("btnDonorSeedDemo", seedDonorDemoData);
  attachSafe("btnDonorClearDemo", clearDonorDemoData);
  attachSafe("btnEmptyStateDonorSeed", seedDonorDemoData);

  // NGO buttons (Feed & Analytics views)
  attachSafe("btnNgoSeedDemo", seedNgoDemoData);
  attachSafe("btnNgoClearDemo", clearNgoDemoData);
  attachSafe("btnEmptyStateNgoSeed", seedNgoDemoData);
  attachSafe("btnNgoSeedDemoFromAnalytics", seedNgoDemoData);
  attachSafe("btnNgoClearDemoFromAnalytics", clearNgoDemoData);
  attachSafe("btnEmptyNgoAnalyticsSeed", seedNgoDemoData);

  // Admin buttons
  attachSafe("btnSeedDemo", seedAdminDemoData);
  attachSafe("btnClearDemo", clearAllDemoData);
}

// Make functions globally available as a bulletproof fallback for onclick
window.seedDonorDemoData = seedDonorDemoData;
window.clearDonorDemoData = clearDonorDemoData;
window.seedNgoDemoData = seedNgoDemoData;
window.clearNgoDemoData = clearNgoDemoData;
window.seedAdminDemoData = seedAdminDemoData;
window.clearAllDemoData = clearAllDemoData;

/**
 * Helper to display visible status/error messages on the page
 */
function setDemoStatus(targetId, message, type = "info") {
  const el = document.getElementById(targetId);
  if (el) {
    el.className = `demo-status-text ${type}`;
    el.innerHTML = message;
  }
}

/**
 * 1. DONOR SEEDER: ~40 listings with donorId = currentUser.uid
 */
async function seedDonorDemoData() {
  const activeUser = auth.currentUser || currentUser;
  if (!activeUser) {
    const errMsg = "⚠️ Authentication required: Logged in user UID not found. Please log in.";
    setDemoStatus("donorDemoStatus", errMsg, "error");
    showNotification(errMsg, "error");
    return;
  }

  const btn = document.getElementById("btnDonorSeedDemo");

  const existingDemo = allListingsCache.filter((i) => i.isDemo && i.donorId === activeUser.uid);
  if (existingDemo.length > 0) {
    if (!confirm(`You already have ${existingDemo.length} demo listings loaded under your account. Loading again will add another batch. Proceed?`)) {
      return;
    }
  }

  if (btn) btn.disabled = true;
  setDemoStatus("donorDemoStatus", "⏳ Loading demo data for Donor... writing records to Firestore...", "loading");
  showNotification("Seeding ~40 listings for your Donor account...", "info");

  try {
    const listingsCol = collection(db, "listings");
    const count = 40;
    const now = Date.now();
    const docsToCreate = [];

    for (let i = 0; i < count; i++) {
      const food = RICH_INDIAN_FOOD_ITEMS[i % RICH_INDIAN_FOOD_ITEMS.length];
      const loc = CHENNAI_DEMO_LOCATIONS[i % CHENNAI_DEMO_LOCATIONS.length];
      const ngo = FICTIONAL_NGOS[i % FICTIONAL_NGOS.length];

      const servings = Math.min(200, Math.max(10, food.baseServings + (Math.floor(Math.random() * 30) - 15)));
      const daysAgo = (i / count) * 28 + Math.random() * 1.5;
      const createdMillis = now - Math.floor(daysAgo * 86400000);
      const createdAt = Timestamp.fromMillis(createdMillis);

      let status = "Picked Up";
      let claimedBy = ngo.id;
      let ngoName = ngo.name;
      let bestBefore = new Date(createdMillis + 36 * 3600000).toISOString();
      let claimedAt = Timestamp.fromMillis(createdMillis + 2 * 3600000);
      let pickedUpAt = Timestamp.fromMillis(createdMillis + 5 * 3600000);

      if (i >= 20 && i < 28) {
        status = "Claimed";
        pickedUpAt = null;
      } else if (i >= 28 && i < 34) {
        status = "Available";
        claimedBy = null;
        ngoName = null;
        claimedAt = null;
        pickedUpAt = null;
        bestBefore = new Date(now + (6 + Math.random() * 24) * 3600000).toISOString();
      } else if (i >= 34) {
        status = "Available";
        claimedBy = null;
        ngoName = null;
        claimedAt = null;
        pickedUpAt = null;
        bestBefore = new Date(createdMillis + 12 * 3600000).toISOString();
      }

      docsToCreate.push({
        foodItem: food.item,
        category: food.cat,
        servings: servings,
        quantity: `${servings} servings`,
        pickupAddress: `${Math.floor(10 + Math.random() * 90)}, ${loc.area}`,
        latitude: loc.lat + (Math.random() - 0.5) * 0.02,
        longitude: loc.lng + (Math.random() - 0.5) * 0.02,
        bestBefore: bestBefore,
        status: status,
        donorId: activeUser.uid,
        donorEmail: activeUser.email,
        donorName: currentUserData?.displayName || activeUser.email,
        claimedBy: claimedBy,
        claimedByNgoId: claimedBy,
        ngoName: ngoName,
        claimedByNgoName: ngoName,
        claimedAt: claimedAt,
        pickedUpAt: pickedUpAt,
        isDemo: true,
        createdAt: createdAt
      });
    }

    await executeChunkedBatchWrites(listingsCol, docsToCreate, 400);

    const successMsg = `✅ Successfully created ${docsToCreate.length} demo listings for your Donor account!`;
    setDemoStatus("donorDemoStatus", successMsg, "success");
    showNotification(successMsg, "success");
  } catch (err) {
    console.error("Donor seeder error:", err);
    const errText = `❌ Error creating Donor demo data: ${err.message}`;
    setDemoStatus("donorDemoStatus", errText, "error");
    showNotification(errText, "error");
  } finally {
    if (btn) btn.disabled = false;
  }
}

/**
 * 2. NGO SEEDER: ~60 claimed listings spread over 60 days + 8 available listings
 * Uses 8 fictional donors, servings 10-250, status 30% Claimed / 70% Picked Up.
 * Split into chunks under 400 writes, committed safely.
 */
async function seedNgoDemoData() {
  const activeUser = auth.currentUser || currentUser;
  if (!activeUser) {
    const errMsg = "⚠️ Authentication required: Logged in NGO UID not found. Please log in.";
    setDemoStatus("ngoDemoStatus", errMsg, "error");
    setDemoStatus("ngoAnalyticsDemoStatus", errMsg, "error");
    showNotification(errMsg, "error");
    return;
  }

  const btnFeed = document.getElementById("btnNgoSeedDemo");
  const btnAnalytics = document.getElementById("btnNgoSeedDemoFromAnalytics");

  const existingDemo = allListingsCache.filter((i) => i.isDemo &&
    (i.claimedBy === activeUser.uid || i.claimedByNgoId === activeUser.uid)
  );

  if (existingDemo.length > 0) {
    if (!confirm(`You already have ${existingDemo.length} demo listings claimed under your account. Loading again will add another batch. Proceed?`)) {
      return;
    }
  }

  if (btnFeed) btnFeed.disabled = true;
  if (btnAnalytics) btnAnalytics.disabled = true;

  const loadingMsg = "⏳ Loading demo data for NGO... writing 68 records in chunks...";
  setDemoStatus("ngoDemoStatus", loadingMsg, "loading");
  setDemoStatus("ngoAnalyticsDemoStatus", loadingMsg, "loading");
  showNotification(loadingMsg, "info");

  try {
    const listingsCol = collection(db, "listings");
    const countClaimed = 60;
    const now = Date.now();
    const ngoNameStr = currentUserData?.displayName || activeUser.email;
    const docsToCreate = [];

    // 1. Create 60 Claimed / Picked Up listings tied directly to this NGO
    for (let i = 0; i < countClaimed; i++) {
      const food = RICH_INDIAN_FOOD_ITEMS[i % RICH_INDIAN_FOOD_ITEMS.length];
      const loc = CHENNAI_DEMO_LOCATIONS[i % CHENNAI_DEMO_LOCATIONS.length];
      const donor = FICTIONAL_DONORS[i % FICTIONAL_DONORS.length];

      const servings = Math.min(250, Math.max(10, food.baseServings + Math.floor(Math.random() * 80) - 20));
      const dayOffset = (i / countClaimed) * 58 + (Math.sin(i) * 2);
      const createdMillis = now - Math.floor(dayOffset * 86400000);
      const createdAt = Timestamp.fromMillis(createdMillis);

      const claimDelayMinutes = Math.floor(10 + Math.random() * 170); // 10 to 180 min
      const claimedMillis = createdMillis + (claimDelayMinutes * 60 * 1000);
      const claimedAt = Timestamp.fromMillis(claimedMillis);

      const isPickedUp = (i % 10) < 7;
      const status = isPickedUp ? "Picked Up" : "Claimed";

      let pickedUpAt = null;
      if (isPickedUp) {
        const pickupDelayHours = 1 + Math.random() * 3;
        pickedUpAt = Timestamp.fromMillis(claimedMillis + Math.floor(pickupDelayHours * 3600000));
      }

      docsToCreate.push({
        foodItem: food.item,
        category: food.cat,
        servings: servings,
        quantity: `${servings} servings`,
        pickupAddress: `${Math.floor(10 + Math.random() * 90)}, ${loc.area}`,
        latitude: loc.lat + (Math.random() - 0.5) * 0.02,
        longitude: loc.lng + (Math.random() - 0.5) * 0.02,
        bestBefore: new Date(createdMillis + 48 * 3600000).toISOString(),
        status: status,
        donorId: donor.id,
        donorEmail: `${donor.id}@foodbridge-demo.org`,
        donorName: donor.name,
        claimedBy: activeUser.uid,
        claimedByNgoId: activeUser.uid,
        ngoName: ngoNameStr,
        claimedByNgoName: ngoNameStr,
        claimedAt: claimedAt,
        pickedUpAt: pickedUpAt,
        isDemo: true,
        createdAt: createdAt
      });
    }

    // 2. Add 8 Available listings from the 8 fictional donors
    const countAvailable = 8;
    for (let j = 0; j < countAvailable; j++) {
      const food = RICH_INDIAN_FOOD_ITEMS[(j + 2) % RICH_INDIAN_FOOD_ITEMS.length];
      const loc = CHENNAI_DEMO_LOCATIONS[(j + 3) % CHENNAI_DEMO_LOCATIONS.length];
      const donor = FICTIONAL_DONORS[j % FICTIONAL_DONORS.length];

      const servings = Math.min(200, Math.max(15, food.baseServings + Math.floor(Math.random() * 30)));
      const createdMillis = now - Math.floor(Math.random() * 12 * 3600000);
      const bestBefore = new Date(now + (10 + Math.random() * 24) * 3600000).toISOString();

      docsToCreate.push({
        foodItem: food.item,
        category: food.cat,
        servings: servings,
        quantity: `${servings} servings`,
        pickupAddress: `${Math.floor(10 + Math.random() * 90)}, ${loc.area}`,
        latitude: loc.lat + (Math.random() - 0.5) * 0.02,
        longitude: loc.lng + (Math.random() - 0.5) * 0.02,
        bestBefore: bestBefore,
        status: "Available",
        donorId: donor.id,
        donorEmail: `${donor.id}@foodbridge-demo.org`,
        donorName: donor.name,
        claimedBy: null,
        claimedByNgoId: null,
        ngoName: null,
        claimedByNgoName: null,
        claimedAt: null,
        pickedUpAt: null,
        isDemo: true,
        createdAt: Timestamp.fromMillis(createdMillis)
      });
    }

    // Commit in chunks <= 400
    await executeChunkedBatchWrites(listingsCol, docsToCreate, 400);

    const successMsg = `✅ Successfully created ${docsToCreate.length} listings (60 claimed meals + 8 available)!`;
    setDemoStatus("ngoDemoStatus", successMsg, "success");
    setDemoStatus("ngoAnalyticsDemoStatus", successMsg, "success");
    showNotification(successMsg, "success");

    // Automatically switch to Claimed Analytics tab so user sees charts immediately
    switchTab("ngoAnalyticsView");
  } catch (err) {
    console.error("NGO seeder error:", err);
    const errText = `❌ Error creating NGO demo data: ${err.message}`;
    setDemoStatus("ngoDemoStatus", errText, "error");
    setDemoStatus("ngoAnalyticsDemoStatus", errText, "error");
    showNotification(errText, "error");
  } finally {
    if (btnFeed) btnFeed.disabled = false;
    if (btnAnalytics) btnAnalytics.disabled = false;
  }
}

/**
 * 3. ADMIN SEEDER: ~60 listings blending registered and fictional accounts
 */
async function seedAdminDemoData() {
  const activeUser = auth.currentUser || currentUser;
  if (!activeUser) {
    const errMsg = "⚠️ Authentication required: Logged in Admin UID not found. Please log in.";
    setDemoStatus("seederStatus", errMsg, "error");
    showNotification(errMsg, "error");
    return;
  }

  const btn = document.getElementById("btnSeedDemo");
  const existingDemo = allListingsCache.filter((i) => i.isDemo);

  if (existingDemo.length > 0) {
    if (!confirm(`Database already contains ${existingDemo.length} demo listings. Loading more will add to this count. Proceed?`)) {
      return;
    }
  }

  if (btn) btn.disabled = true;
  setDemoStatus("seederStatus", "⏳ Loading demo data for Admin... discovering users and writing batch...", "loading");

  try {
    const usersSnap = await getDocs(collection(db, "users"));
    const realDonors = [];
    const realNgos = [];

    usersSnap.forEach((d) => {
      const u = d.data();
      if (u.role === "Donor") realDonors.push({ id: u.uid, name: u.displayName || u.email, email: u.email });
      if (u.role === "NGO") realNgos.push({ id: u.uid, name: u.displayName || u.email, email: u.email });
    });

    const donorsPool = realDonors.length > 0 ? [...realDonors, ...FICTIONAL_DONORS] : FICTIONAL_DONORS;
    const ngosPool = realNgos.length > 0 ? [...realNgos, ...FICTIONAL_NGOS] : FICTIONAL_NGOS;

    const listingsCol = collection(db, "listings");
    const count = 60;
    const now = Date.now();
    const docsToCreate = [];

    for (let i = 0; i < count; i++) {
      const food = RICH_INDIAN_FOOD_ITEMS[i % RICH_INDIAN_FOOD_ITEMS.length];
      const loc = CHENNAI_DEMO_LOCATIONS[i % CHENNAI_DEMO_LOCATIONS.length];
      const donor = donorsPool[i % donorsPool.length];
      const ngo = ngosPool[i % ngosPool.length];

      const servings = Math.min(200, Math.max(10, food.baseServings + (Math.floor(Math.random() * 30) - 15)));
      const daysAgo = (i / count) * 28 + Math.random() * 1.5;
      const createdMillis = now - Math.floor(daysAgo * 86400000);
      const createdAt = Timestamp.fromMillis(createdMillis);

      let status = "Picked Up";
      let claimedBy = ngo.id;
      let ngoName = ngo.name;
      let bestBefore = new Date(createdMillis + 36 * 3600000).toISOString();
      let claimedAt = Timestamp.fromMillis(createdMillis + 2 * 3600000);
      let pickedUpAt = Timestamp.fromMillis(createdMillis + 6 * 3600000);

      if (i % 5 === 2) {
        status = "Claimed";
        pickedUpAt = null;
      } else if (i % 5 === 3) {
        status = "Available";
        claimedBy = null;
        ngoName = null;
        claimedAt = null;
        pickedUpAt = null;
        bestBefore = new Date(now + (8 + Math.random() * 24) * 3600000).toISOString();
      } else if (i % 5 === 4) {
        status = "Available";
        claimedBy = null;
        ngoName = null;
        claimedAt = null;
        pickedUpAt = null;
        bestBefore = new Date(createdMillis + 12 * 3600000).toISOString();
      }

      docsToCreate.push({
        foodItem: food.item,
        category: food.cat,
        servings: servings,
        quantity: `${servings} servings`,
        pickupAddress: `${Math.floor(10 + Math.random() * 90)}, ${loc.area}`,
        latitude: loc.lat + (Math.random() - 0.5) * 0.02,
        longitude: loc.lng + (Math.random() - 0.5) * 0.02,
        bestBefore: bestBefore,
        status: status,
        donorId: donor.id,
        donorEmail: donor.email || `${donor.id}@foodbridge-demo.org`,
        donorName: donor.name,
        claimedBy: claimedBy,
        claimedByNgoId: claimedBy,
        ngoName: ngoName,
        claimedByNgoName: ngoName,
        claimedAt: claimedAt,
        pickedUpAt: pickedUpAt,
        isDemo: true,
        createdAt: createdAt
      });
    }

    await executeChunkedBatchWrites(listingsCol, docsToCreate, 400);

    const successMsg = `✅ Successfully seeded ${docsToCreate.length} listings! Merged real and fictional accounts for rich charts.`;
    setDemoStatus("seederStatus", successMsg, "success");
    showNotification(successMsg, "success");
  } catch (err) {
    console.error("Admin seeder error:", err);
    const errText = `❌ Error creating Admin demo data: ${err.message}`;
    setDemoStatus("seederStatus", errText, "error");
    showNotification(errText, "error");
  } finally {
    if (btn) btn.disabled = false;
  }
}

/**
 * Utility to write an array of document objects in chunks of <= chunkSize (max 400)
 */
async function executeChunkedBatchWrites(collectionRef, docsArray, chunkSize = 400) {
  let index = 0;
  while (index < docsArray.length) {
    const chunk = docsArray.slice(index, index + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((item) => {
      const newDocRef = doc(collectionRef);
      batch.set(newDocRef, item);
    });
    await batch.commit();
    index += chunkSize;
  }
}

/**
 * 4. CLEAR DEMO DATA (ROLE-SCOPED)
 */
async function clearDonorDemoData() {
  const activeUser = auth.currentUser || currentUser;
  if (!activeUser) return;
  if (!confirm("Are you sure you want to clear your demo listings? Real listings will not be deleted.")) return;

  const btn = document.getElementById("btnDonorClearDemo");
  if (btn) btn.disabled = true;

  try {
    const q = query(
      collection(db, "listings"),
      where("isDemo", "==", true),
      where("donorId", "==", activeUser.uid)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      showNotification("No demo listings found under your Donor account.", "info");
      return;
    }

    await chunkedBatchDelete(snap.docs);
    showNotification(`Cleared ${snap.size} of your demo listings.`, "success");
    setDemoStatus("donorDemoStatus", `🗑️ Cleared ${snap.size} demo listings.`, "info");
  } catch (err) {
    console.error("Clear donor error:", err);
    const errText = `❌ Error clearing Donor demo data: ${err.message}`;
    setDemoStatus("donorDemoStatus", errText, "error");
    showNotification(errText, "error");
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function clearNgoDemoData() {
  const activeUser = auth.currentUser || currentUser;
  if (!activeUser) return;
  if (!confirm("Clear your demo claimed listings? Real listings will not be deleted.")) return;

  const btn = document.getElementById("btnNgoClearDemo");
  const btnAnalytics = document.getElementById("btnNgoClearDemoFromAnalytics");
  if (btn) btn.disabled = true;
  if (btnAnalytics) btnAnalytics.disabled = true;

  try {
    const allDemoSnap = await getDocs(query(collection(db, "listings"), where("isDemo", "==", true)));
    const docsToDelete = [];

    allDemoSnap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const isClaimedByMe = (data.claimedBy === activeUser.uid || data.claimedByNgoId === activeUser.uid);
      const isFictionalAvailable = (data.status === "Available" && data.donorId?.startsWith("fictional_donor_"));
      if (isClaimedByMe || isFictionalAvailable) {
        docsToDelete.push(docSnap);
      }
    });

    if (docsToDelete.length === 0) {
      showNotification("No demo listings found for your NGO account.", "info");
      return;
    }

    await chunkedBatchDelete(docsToDelete);
    const successMsg = `🗑️ Cleared ${docsToDelete.length} demo listings.`;
    setDemoStatus("ngoDemoStatus", successMsg, "info");
    setDemoStatus("ngoAnalyticsDemoStatus", successMsg, "info");
    showNotification(successMsg, "success");
  } catch (err) {
    console.error("Clear NGO error:", err);
    const errText = `❌ Error clearing NGO demo data: ${err.message}`;
    setDemoStatus("ngoDemoStatus", errText, "error");
    setDemoStatus("ngoAnalyticsDemoStatus", errText, "error");
    showNotification(errText, "error");
  } finally {
    if (btn) btn.disabled = false;
    if (btnAnalytics) btnAnalytics.disabled = false;
  }
}

async function clearAllDemoData() {
  if (!confirm("Delete all listings flagged with isDemo: true across the entire platform?")) return;

  const btn = document.getElementById("btnClearDemo");
  if (btn) btn.disabled = true;
  setDemoStatus("seederStatus", "⏳ Finding and deleting all demo listings...", "loading");

  try {
    const q = query(collection(db, "listings"), where("isDemo", "==", true));
    const snap = await getDocs(q);

    if (snap.empty) {
      setDemoStatus("seederStatus", "No demo data found to delete.", "info");
      showNotification("No demo documents found.", "info");
      return;
    }

    await chunkedBatchDelete(snap.docs);
    const successMsg = `🗑️ <strong>Deleted ${snap.size} demo documents cleanly.</strong>`;
    setDemoStatus("seederStatus", successMsg, "success");
    showNotification(`Cleared all ${snap.size} demo listings.`, "info");
  } catch (err) {
    console.error("Clear all demo error:", err);
    const errText = `❌ Error clearing demo data: ${err.message}`;
    setDemoStatus("seederStatus", errText, "error");
    showNotification(errText, "error");
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function chunkedBatchDelete(docsList) {
  const docs = [...docsList];
  while (docs.length > 0) {
    const chunk = docs.splice(0, 400); // 400 writes limit per batch
    const batch = writeBatch(db);
    chunk.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  }
}

// ==========================================
// 16. SCALABILITY SIMULATOR (ADMIN ONLY)
// ==========================================

const btnRunSimulator = document.getElementById("btnRunSimulator");
const simulatorBatchSize = document.getElementById("simulatorBatchSize");
const simulatorStatus = document.getElementById("simulatorStatus");
const benchmarkTableBody = document.getElementById("benchmarkTableBody");

if (btnRunSimulator) {
  btnRunSimulator.addEventListener("click", async () => {
    const activeUser = auth.currentUser || currentUser;
    if (!activeUser) return;
    const count = parseInt(simulatorBatchSize.value, 10);
    btnRunSimulator.disabled = true;
    simulatorStatus.innerHTML = `⏳ Executing batch write test for <strong>${count} records</strong>...`;

    const tStart = performance.now();

    try {
      const listingsCol = collection(db, "listings");
      let remaining = count;
      let chunksWritten = 0;

      while (remaining > 0) {
        const currentBatchSize = Math.min(remaining, 400);
        const batch = writeBatch(db);

        for (let i = 0; i < currentBatchSize; i++) {
          const newDocRef = doc(listingsCol);
          batch.set(newDocRef, {
            foodItem: `Simulated Meal Batch #${chunksWritten + 1}-${i + 1}`,
            category: "Cooked Meals",
            servings: 25,
            quantity: "25 servings",
            pickupAddress: "Simulated Pickup Point, Chennai",
            latitude: 13.0827 + (Math.random() - 0.5) * 0.05,
            longitude: 80.2707 + (Math.random() - 0.5) * 0.05,
            bestBefore: new Date(Date.now() + 86400000).toISOString(),
            status: "Available",
            donorId: activeUser.uid,
            donorEmail: activeUser.email,
            donorName: "Stress Test Runner",
            claimedBy: null,
            claimedByNgoId: null,
            ngoName: null,
            claimedByNgoName: null,
            claimedAt: null,
            pickedUpAt: null,
            isDemo: true,
            createdAt: Timestamp.now()
          });
        }

        await batch.commit();
        remaining -= currentBatchSize;
        chunksWritten++;
      }

      const tTotal = Math.round(performance.now() - tStart);
      const avgPerRecord = (tTotal / count).toFixed(2);
      const throughput = ((count / tTotal) * 1000).toFixed(1);

      simulatorStatus.innerHTML = `⚡ <strong>Complete!</strong> Written ${count} records in ${tTotal} ms (${throughput} records/sec).`;
      showNotification(`Simulator: ${count} records written in ${tTotal}ms`, "success");

      const runRecord = {
        testNum: benchmarkHistory.length + 1,
        count: count,
        totalMs: tTotal,
        avgMs: avgPerRecord,
        throughput: throughput,
        timestamp: new Date().toLocaleTimeString()
      };
      benchmarkHistory.push(runRecord);

      renderBenchmarkTable();
      renderScalabilityChart();
    } catch (err) {
      console.error("Simulator error:", err);
      simulatorStatus.innerHTML = `❌ Error running simulator: ${err.message}`;
      showNotification("Simulator error: " + err.message, "error");
    } finally {
      btnRunSimulator.disabled = false;
    }
  });
}

function renderBenchmarkTable() {
  if (!benchmarkTableBody) return;
  benchmarkTableBody.innerHTML = "";

  benchmarkHistory.forEach((run) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>#${run.testNum}</strong></td>
      <td>${run.count}</td>
      <td><strong>${run.totalMs} ms</strong></td>
      <td>${run.avgMs} ms</td>
      <td><span class="badge badge-available">${run.throughput} rec/s</span></td>
      <td>${run.timestamp}</td>
    `;
    benchmarkTableBody.appendChild(tr);
  });
}

function renderScalabilityChart() {
  const ctx = document.getElementById("chartScalability")?.getContext("2d");
  if (!ctx) return;
  if (chartScalability) chartScalability.destroy();

  chartScalability = new Chart(ctx, {
    type: "line",
    data: {
      labels: benchmarkHistory.map((b) => `${b.count} records (Run #${b.testNum})`),
      datasets: [{
        label: "Time Taken (ms)",
        data: benchmarkHistory.map((b) => b.totalMs),
        borderColor: "#0f766e",
        backgroundColor: "rgba(15, 118, 110, 0.15)",
        fill: true,
        tension: 0.2,
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "Latency (ms)" } }
      }
    }
  });
}

// ==========================================
// 17. CLOUD MONITOR TELEMETRY & LATENCY BENCHMARK
// ==========================================

const btnRunLatencyTest = document.getElementById("btnRunLatencyTest");

if (btnRunLatencyTest) {
  btnRunLatencyTest.addEventListener("click", runLatencyBenchmark);
}

async function runLatencyBenchmark() {
  const activeUser = auth.currentUser || currentUser;
  if (!activeUser) return;
  const metricWrite = document.getElementById("metricWriteLatency");
  const metricRead = document.getElementById("metricReadLatency");

  metricWrite.innerText = "Testing...";
  metricRead.innerText = "Testing...";

  try {
    const benchmarkDocRef = doc(db, "_telemetry", activeUser.uid);

    const tWriteStart = performance.now();
    await setDoc(benchmarkDocRef, {
      ping: true,
      timestamp: serverTimestamp()
    });
    const writeMs = Math.round(performance.now() - tWriteStart);
    metricWrite.innerText = `${writeMs} ms`;

    const tReadStart = performance.now();
    await getDoc(benchmarkDocRef);
    const readMs = Math.round(performance.now() - tReadStart);
    metricRead.innerText = `${readMs} ms`;

    showNotification(`Latency measured: Write ${writeMs}ms | Read ${readMs}ms`, "info");
  } catch (err) {
    console.error("Telemetry error:", err);
    metricWrite.innerText = "Err";
    metricRead.innerText = "Err";
    showNotification("Telemetry error: " + err.message, "error");
  }
}

function updateCloudMonitorMetrics(items) {
  const countListingsEl = document.getElementById("monitorCountListings");
  const countDemoEl = document.getElementById("monitorCountDemo");
  const countUsersEl = document.getElementById("monitorCountUsers");

  if (countListingsEl) countListingsEl.innerText = `${items.length} documents`;
  if (countDemoEl) {
    const demoCount = items.filter((i) => i.isDemo).length;
    countDemoEl.innerText = `${demoCount} documents`;
  }
  if (countUsersEl) {
    const userIds = new Set();
    items.forEach((i) => {
      if (i.donorId) userIds.add(i.donorId);
      if (i.claimedBy || i.claimedByNgoId) userIds.add(i.claimedBy || i.claimedByNgoId);
    });
    countUsersEl.innerText = `${Math.max(userIds.size, 1)} active profiles`;
  }
}

// ==========================================
// 18. CLOUD COST ESTIMATOR
// ==========================================

function initCostEstimatorListeners() {
  const sliderDau = document.getElementById("sliderDau");
  const sliderReads = document.getElementById("sliderReads");
  const sliderWrites = document.getElementById("sliderWrites");
  const sliderStorageGb = document.getElementById("sliderStorageGb");

  if (!sliderDau) return;

  const update = () => updateCostEstimator();
  sliderDau.addEventListener("input", update);
  sliderReads.addEventListener("input", update);
  sliderWrites.addEventListener("input", update);
  sliderStorageGb.addEventListener("input", update);

  updateCostEstimator();
}

function updateCostEstimator() {
  const dau = parseInt(document.getElementById("sliderDau")?.value || 1000, 10);
  const readsPerUser = parseInt(document.getElementById("sliderReads")?.value || 20, 10);
  const writesPerUser = parseInt(document.getElementById("sliderWrites")?.value || 3, 10);
  const storageGb = parseInt(document.getElementById("sliderStorageGb")?.value || 5, 10);

  document.getElementById("valDau").innerText = dau.toLocaleString();
  document.getElementById("valReads").innerText = readsPerUser;
  document.getElementById("valWrites").innerText = writesPerUser;
  document.getElementById("valStorageGb").innerText = `${storageGb} GB`;

  const dailyReads = dau * readsPerUser;
  const dailyWrites = dau * writesPerUser;

  document.getElementById("costDailyOps").innerText = `${dailyReads.toLocaleString()} Reads | ${dailyWrites.toLocaleString()} Writes`;

  const billableDailyReads = Math.max(0, dailyReads - 50000);
  const billableDailyWrites = Math.max(0, dailyWrites - 20000);

  const costReads = (billableDailyReads * 30 / 100000) * 0.06;
  const costWrites = (billableDailyWrites * 30 / 100000) * 0.18;
  const costTransfer = Math.max(0, storageGb - 10) * 0.15;

  const totalFirebase = costReads + costWrites + costTransfer;
  const totalIaas = 18.50;

  document.getElementById("costMonthlyReads").innerText = `$${costReads.toFixed(2)}`;
  document.getElementById("costMonthlyWrites").innerText = `$${costWrites.toFixed(2)}`;
  document.getElementById("costMonthlyTransfer").innerText = `$${costTransfer.toFixed(2)}`;
  document.getElementById("costTotalFirebase").innerText = `$${totalFirebase.toFixed(2)} / month`;

  const freeTierAlert = document.getElementById("freeTierAlert");
  if (totalFirebase === 0) {
    freeTierAlert.className = "cost-alert-box alert-success";
    freeTierAlert.innerHTML = `✅ <strong>100% Free under Spark Tier!</strong> This workload stays within Google Cloud's free quotas (50,000 reads/day and 20,000 writes/day).`;
  } else {
    freeTierAlert.className = "cost-alert-box alert-warning";
    freeTierAlert.innerHTML = `⚡ <strong>Exceeds Free Tier:</strong> Estimated Firebase Blaze bill is $${totalFirebase.toFixed(2)}/mo. Serverless PaaS still costs significantly less than a dedicated IaaS VM ($${totalIaas.toFixed(2)}/mo).`;
  }

  renderCostComparisonChart(totalFirebase, totalIaas);
}

function renderCostComparisonChart(firebaseCost, iaasCost) {
  const ctx = document.getElementById("chartCostComparison")?.getContext("2d");
  if (!ctx) return;
  if (chartCostComparison) chartCostComparison.destroy();

  chartCostComparison = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Serverless PaaS (Firebase)", "Traditional IaaS (24/7 Linux VM)"],
      datasets: [{
        label: "Estimated Cost ($ / Month)",
        data: [firebaseCost, iaasCost],
        backgroundColor: ["#16a34a", "#ef4444"],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "USD ($)" } }
      }
    }
  });
}

// ==========================================
// 19. HELPERS & SANITIZATION
// ==========================================

function getEpochTime(val) {
  if (!val) return Date.now();
  if (typeof val.toMillis === "function") return val.toMillis();
  if (val instanceof Date) return val.getTime();
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? Date.now() : parsed;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDateTime(dateTimeVal) {
  if (!dateTimeVal) return "N/A";
  try {
    let d;
    if (typeof dateTimeVal.toMillis === "function") {
      d = new Date(dateTimeVal.toMillis());
    } else {
      d = new Date(dateTimeVal);
    }
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(dateTimeVal);
  }
}
