/* ===================== FoodBridge dashboard ===================== */
if (!Session.token || !Session.user) location.href = "login.html";

let me = Session.user;
const isRestaurant = me.role === "restaurant";
const isNgo = me.role === "ngo";
const isAdmin = me.role === "admin";
const $ = (id) => document.getElementById(id);

let mineData = [], mineFilter = "all", incomingData = [], incomingFilter = "all", adminFilter = "all";
let charts = {}, map, mapLayer, selectedNgo = "", aiData = null;

// ---------- sidebar navigation ----------
let NAV = [];
if (isRestaurant) {
    NAV = [
        ["overview", "home", "Overview"],
        ["new", "plus", "New donation"],
        ["mine", "list", "My donations"],
        ["forecast", "chart", "Forecasting"],
        ["certificate", "box", "Impact Certificate"],
        ["profile", "user", "Profile"]
    ];
} else if (isNgo) {
    NAV = [
        ["overview", "home", "Overview"],
        ["incoming", "inbox", "Incoming requests"],
        ["mine", "list", "My pickups"],
        ["certificate", "box", "Impact Certificate"],
        ["profile", "user", "Profile"]
    ];
} else if (isAdmin) {
    NAV = [
        ["overview", "home", "Overview"],
        ["admin", "user", "Verification Portal"],
        ["forecast", "chart", "Platform Analytics"],
        ["profile", "user", "Profile"]
    ];
}

const TITLES = {
    overview: ["Overview", "Your impact & community summary at a glance"],
    new: ["New donation", "List surplus food and optimize with AI Assistant"],
    mine: [isRestaurant ? "My donations" : "My pickups", "Track every donation from request to delivery"],
    incoming: ["Incoming requests", "Food waiting for an NGO nearby"],
    forecast: ["Food Waste Forecasting & Analytics", "Historical patterns & predictive surplus insights"],
    certificate: ["Food Rescue Impact Certificate", "Official accredited social & environmental certification"],
    admin: ["Verification & Trust Portal", "Review and accredit participating organizations"],
    profile: ["Profile", "Registration and verification details"]
};

// Render Sidebar
$("sideNav").innerHTML = NAV.map(([id, ic, label]) =>
    `<button class="nav-btn" data-view="${id}">${icon(ic)}${label}${id === "incoming" ? '<span class="count hidden" id="incomingCount">0</span>' : ""}${id === "admin" ? '<span class="admin-badge-count hidden" id="adminBadge">0</span>' : ""}</button>`).join("");

$("meName").textContent = me.name;
$("meRole").textContent = isAdmin ? "Administrator" : isRestaurant ? "Restaurant" : "NGO / Shelter";
$("avatar").textContent = me.name.charAt(0).toUpperCase();
$("logoutBtn").onclick = () => { Session.clear(); location.href = "index.html"; };

document.querySelectorAll(".nav-btn[data-view]").forEach((b) => (b.onclick = () => showView(b.dataset.view)));

// Verification Badge Helper
function getTrustBadgeHtml(status) {
    if (status === "verified") {
        return '<span class="badge-verified"><i class="ri-checkbox-circle-fill"></i> Verified</span>';
    } else if (status === "rejected") {
        return '<span class="badge-rejected"><i class="ri-close-circle-line"></i> Needs Review</span>';
    }
    return '<span class="badge-pending"><i class="ri-time-line"></i> Pending</span>';
}

function updateTopTrustBadge() {
    const badgeEl = $("topTrustBadge");
    if (!badgeEl) return;
    badgeEl.innerHTML = getTrustBadgeHtml(me.verificationStatus || "pending");
}
updateTopTrustBadge();

function showView(v) {
    const views = ["overview", "new", "mine", "incoming", "forecast", "certificate", "admin", "profile"];
    views.forEach((x) => {
        const el = $("view-" + x);
        if (el) el.classList.toggle("hidden", x !== v);
    });

    document.querySelectorAll(".nav-btn[data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === v));

    if (TITLES[v]) {
        $("pageTitle").textContent = TITLES[v][0];
        $("pageSub").textContent = v === "overview" ? `Hello, ${me.ownerName || me.name}. ${TITLES[v][1]}.` : TITLES[v][1];
    }

    if (v === "overview") loadOverview();
    if (v === "new") initNewDonation();
    if (v === "mine") loadMine();
    if (v === "incoming") loadIncoming();
    if (v === "forecast") loadForecast();
    if (v === "certificate") loadCertificate();
    if (v === "admin") loadAdminPortal();
    if (v === "profile") loadProfile();

    checkEmergencyAlerts();
    window.scrollTo({ top: 0 });
}

// ---------- shared card pieces ----------
const STEPS = [["Pending", "Requested"], ["Accepted", "Accepted"], ["PickedUp", "Picked up"], ["Completed", "Delivered"]];

function timeline(d) {
    if (["Rejected", "Cancelled", "Expired"].includes(d.status)) {
        const last = d.statusHistory?.[d.statusHistory.length - 1];
        return `<div class="closed-note">${d.status}${last?.note ? ": " + esc(last.note) : ""}</div>`;
    }
    const idx = STEPS.findIndex((s) => s[0] === d.status);
    return `<ol class="timeline">${STEPS.map(([key, label], i) => {
        const h = d.statusHistory?.find((x) => x.status === key);
        return `<li class="${i <= idx ? "done" : ""} ${i === idx ? "current" : ""}">${label}${h && i <= idx ? `<small>${fmtShort(h.at)}</small>` : ""}</li>`;
    }).join("")}</ol>`;
}

const vegDot = (v) => `<span class="veg ${v ? "" : "non"}" title="${v ? "Vegetarian" : "Non-vegetarian"}"></span>`;
const unitLabel = (u) => ({ kg: "kg", liter: "L", portions: "portions" }[u] || u);

// Urgency Badge Generator
function urgencyBadgeHtml(d) {
    const meta = d.urgencyMeta;
    if (!meta) return "";
    if (meta.isEmergency) {
        return '<span class="urgency-badge urgency-emergency"><i class="ri-alarm-warning-fill"></i> 🔴 Emergency (<2h left)</span>';
    }
    if (meta.level === "Priority") {
        return '<span class="urgency-badge urgency-priority"><i class="ri-time-fill"></i> 🟡 Priority</span>';
    }
    if (meta.level === "Normal") {
        return '<span class="urgency-badge urgency-normal"><i class="ri-checkbox-circle-line"></i> 🟢 Normal</span>';
    }
    return '';
}

function donationCard(d, mode) {
    const left = timeLeft(d.expiryTime);
    const showLeft = ["Pending", "Accepted"].includes(d.status);

    const partner = mode === "incoming" ? d.restaurant : (d.acceptedBy || d.requestedNgo);
    const partnerTrust = partner?.verificationStatus ? getTrustBadgeHtml(partner.verificationStatus) : "";

    const party = isRestaurant
        ? (d.acceptedBy ? `${icon("hand")}${esc(d.acceptedBy.name)} ${partnerTrust}` : d.requestedNgo ? `${icon("hand")}Sent to ${esc(d.requestedNgo.name)}` : `${icon("hand")}Open to nearby NGOs`)
        : `${icon("store")}${esc(d.restaurant?.name || "")} ${partnerTrust}`;

    let actions = "";
    if (mode === "incoming") {
        actions = `<button class="btn btn-primary btn-sm" data-act="accept" data-id="${d._id}">Accept request</button>
               <button class="btn btn-danger btn-sm" data-act="reject" data-id="${d._id}">Decline</button>`;
    } else if (isRestaurant && d.status === "Pending") {
        actions = `<button class="btn btn-danger btn-sm" data-act="cancel" data-id="${d._id}">Cancel request</button>`;
    } else if (!isRestaurant && d.status === "Accepted") {
        actions = `<button class="btn btn-primary btn-sm" data-act="PickedUp" data-id="${d._id}">Mark as picked up</button>`;
    } else if (!isRestaurant && d.status === "PickedUp") {
        actions = `<button class="btn btn-accent btn-sm" data-act="Completed" data-id="${d._id}">Mark as delivered</button>`;
    }

    const phone = isRestaurant ? d.acceptedBy?.phone : d.restaurant?.phone;
    if (phone && mode !== "incoming" && !["Completed", "Cancelled", "Rejected", "Expired"].includes(d.status)) {
        actions += `<a class="btn btn-ghost btn-sm" href="tel:${esc(phone)}"><i class="ri-phone-line"></i> Call ${esc(phone)}</a>`;
    }

    const urgencyHtml = urgencyBadgeHtml(d);

    return `<article class="dcard ${d.urgencyMeta?.isEmergency ? "emergency-card" : ""}">
    <div class="top">
      <div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
          <h3>${vegDot(d.isVeg)} ${esc(d.foodName)}</h3>
          ${urgencyHtml}
        </div>
        <div class="meta">
          <span>${icon("box")}${d.quantity} ${unitLabel(d.unit)}, ${esc(d.foodType)}</span>
          <span>${party}</span>
          ${d.distanceKm != null ? `<span>${icon("map")}${d.distanceKm} km away</span>` : ""}
          ${showLeft ? `<span class="${left.urgent ? "urgent countdown-live" : "countdown-live"}"><i class="ri-timer-line"></i> ${left.text}</span>` : ""}
        </div>
      </div>
      <div>
        ${mode === "incoming" && d.isDirect ? '<span class="direct">Sent to you</span>' : `<span class="pill ${d.status}">${d.status === "PickedUp" ? "Picked up" : d.status}</span>`}
      </div>
    </div>
    ${d.description ? `<p style="font-size:14px;color:var(--muted);margin:8px 0">${esc(d.description)}</p>` : ""}
    ${mode === "incoming" ? `<div class="meta" style="margin-top:8px"><span>${icon("map")}${esc(d.pickupAddress || d.restaurant?.address || "")}</span></div>` : timeline(d)}
    ${actions ? `<div class="actions">${actions}</div>` : ""}
  </article>`;
}

// Global click handler for donation actions
document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const { act, id } = b.dataset;
    b.disabled = true;
    try {
        if (act === "accept") {
            await api(`/donations/${id}/accept`, { method: "POST" });
            toast("Request accepted. Please arrange pickup.");
            loadIncoming();
        } else if (act === "reject") {
            await api(`/donations/${id}/reject`, { method: "POST" });
            toast("Request declined");
            loadIncoming();
        } else if (act === "cancel") {
            await api(`/donations/${id}/status`, { method: "PUT", body: { status: "Cancelled" } });
            toast("Request cancelled");
            loadMine();
        } else {
            await api(`/donations/${id}/status`, { method: "PUT", body: { status: act } });
            toast(act === "PickedUp" ? "Marked as picked up in transit" : "Marked as delivered. Thank you!");
            loadMine();
        }
        loadNotifications();
        checkEmergencyAlerts();
    } catch (err) {
        toast(err.message, true);
        b.disabled = false;
    }
});

// ---------- FEATURE 2: EMERGENCY RESCUE BANNER ----------
async function checkEmergencyAlerts() {
    try {
        const { donations } = await api("/donations/emergency");
        const banner = $("emergencyBanner");
        if (!banner) return;
        if (donations.length > 0) {
            banner.classList.remove("hidden");
            $("emergencyBannerText").textContent = `${donations.length} urgent donation${donations.length > 1 ? "s" : ""} nearby expire in less than 2 hours! Immediate rescue recommended.`;
            $("emergencyBannerBtn").onclick = () => {
                if (isNgo) {
                    showView("incoming");
                    incomingFilter = "emergency";
                    document.querySelectorAll("#incomingTabs .chip").forEach((x) => x.classList.toggle("active", x.dataset.inc === "emergency"));
                    renderIncoming();
                } else {
                    showView("mine");
                    mineFilter = "emergency";
                    document.querySelectorAll("#mineTabs .chip").forEach((x) => x.classList.toggle("active", x.dataset.f === "emergency"));
                    renderMine();
                }
            };
        } else {
            banner.classList.add("hidden");
        }
    } catch (e) { /* ignore */ }
}

// ---------- OVERVIEW ----------
async function loadOverview() {
    try {
        const s = await api("/stats/impact");
        const tiles = [
            ["g", "box", s.totalDonations, isRestaurant ? "Donations made" : "Donations accepted"],
            ["y", "hand", s.mealsProvided.toLocaleString("en-IN"), "Meals provided"],
            ["b", "chart", s.kgSaved + " kg", "Food saved"],
            ["r", "home", s.co2SavedKg + " kg", "CO2 avoided"]
        ];
        $("statTiles").innerHTML = tiles.map(([c, ic, v, l]) =>
            `<div class="stat"><div class="ic ${c}">${icon(ic)}</div><div><div class="v">${v}</div><div class="l">${l}</div></div></div>`).join("");
        drawOverviewCharts(s);
    } catch (err) { toast(err.message, true); }

    try {
        const list = isRestaurant ? (await api("/donations/mine")).donations : (await api("/donations/incoming")).donations;
        $("recentTitle").textContent = isRestaurant ? "Recent donations" : "Waiting for you";
        $("recentSub").textContent = isRestaurant ? "Your latest requests and where they stand" : "Requests from restaurants near you";
        $("recentCards").innerHTML = list.slice(0, 4).map((d) => donationCard(d, isRestaurant ? "mine" : "incoming")).join("") ||
            `<div class="empty" style="grid-column:1/-1"><b>${isRestaurant ? "No donations yet" : "No requests right now"}</b>${isRestaurant ? "Use New donation to list your surplus food." : "New requests from restaurants will appear here."}</div>`;
    } catch (err) { /* ignore */ }
}

function drawOverviewCharts(s) {
    if (typeof Chart === "undefined") return;
    if (charts.type) charts.type.destroy();
    if (charts.week) charts.week.destroy();

    const typeNames = { cooked: "Cooked", raw: "Raw", packaged: "Packaged", bakery: "Bakery" };
    const keys = Object.keys(s.byType || {});
    charts.type = new Chart($("typeChart"), {
        type: "doughnut",
        data: {
            labels: keys.length ? keys.map((k) => typeNames[k] || k) : ["No data yet"],
            datasets: [{
                data: keys.length ? keys.map((k) => s.byType[k]) : [1],
                backgroundColor: keys.length ? ["#059669", "#f59e0b", "#ef4444", "#2563eb"] : ["#d9e5dc"],
                borderWidth: 0
            }]
        },
        options: { maintainAspectRatio: false, cutout: "62%", plugins: { legend: { position: "bottom" } } }
    });

    charts.week = new Chart($("weekChart"), {
        type: "bar",
        data: {
            labels: (s.last7Days || []).map((d) => d.label),
            datasets: [{ label: "kg", data: (s.last7Days || []).map((d) => d.kg), backgroundColor: "#059669", borderRadius: 6 }]
        },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: "#e2e8f0" } }, x: { grid: { display: false } } } }
    });
}

// ---------- FEATURE 1: NEW DONATION & AI ASSISTANT ----------
let newInited = false;
function initNewDonation() {
    $("pickupAddress").value ||= me.address || "";
    const d = new Date(Date.now() + 4 * 3600000 - new Date().getTimezoneOffset() * 60000);
    $("expiryTime").value ||= d.toISOString().slice(0, 16);
    loadNearby();

    // AI Assistant Button Click
    $("aiAssistBtn").onclick = async () => {
        const foodType = $("foodType").value;
        const quantity = $("quantity").value;
        const unit = $("unit").value;
        const expiryTime = $("expiryTime").value;
        const foodName = $("foodName").value;
        const prepTime = $("prepTime").value;

        if (!quantity || !expiryTime) {
            toast("Please enter quantity and expiry time to run AI assistant", true);
            $("quantity").focus();
            return;
        }

        const btn = $("aiAssistBtn");
        btn.disabled = true;
        btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Analyzing with AI...';

        try {
            const data = await api("/ai/assist", {
                method: "POST",
                body: {
                    foodName, foodType, quantity, unit, prepTime,
                    expiryTime: new Date(expiryTime).toISOString(),
                    lat: me.location?.lat, long: me.location?.long
                }
            });

            aiData = data;
            const resBox = $("aiResultBox");
            resBox.classList.remove("hidden");

            // Urgency badge
            const urgBadge = $("aiUrgencyBadge");
            urgBadge.className = `urgency-badge urgency-${data.urgency.toLowerCase()}`;
            urgBadge.innerHTML = data.urgency === "Emergency" ? '🔴 Emergency (<2h)' : data.urgency === "Priority" ? '🟡 Priority' : '🟢 Normal';

            $("aiServingsVal").textContent = `${data.estimatedServings} meals`;
            $("aiPriorityVal").textContent = data.priorityLabel;
            $("aiDispatchVal").textContent = data.dispatchWindow;

            // Recommended NGO
            const ngoCard = $("aiNgoCard");
            if (data.recommendedNgo) {
                ngoCard.classList.remove("hidden");
                $("aiNgoName").textContent = data.recommendedNgo.name;
                $("aiNgoDetails").textContent = `${data.recommendedNgo.distanceKm} km away • Capacity: ${data.recommendedNgo.capacity || 0}/day`;
                $("aiSelectNgoBtn").onclick = () => {
                    selectedNgo = data.recommendedNgo._id;
                    const radio = document.querySelector(`input[name="ngoPick"][value="${selectedNgo}"]`);
                    if (radio) radio.checked = true;
                    toast(`Selected ${data.recommendedNgo.name} based on AI recommendation`);
                };
            } else {
                ngoCard.classList.add("hidden");
            }

            // Storage guidelines
            $("aiStorageList").innerHTML = data.storageGuidelines.map((g) => `<li><i class="ri-check-line"></i> ${esc(g)}</li>`).join("");
            $("aiSummaryText").textContent = data.aiSummary;

            toast("AI optimization complete!");
        } catch (err) {
            toast(err.message, true);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="ri-sparkling-2-fill"></i> ✨ Run AI Assistant';
        }
    };

    if (newInited) return;
    newInited = true;
    $("radius").onchange = loadNearby;

    $("donationForm").onsubmit = async (e) => {
        e.preventDefault();
        $("donationError").textContent = "";
        if (!$("foodName").value.trim() || !$("quantity").value || !$("expiryTime").value) {
            return ($("donationError").textContent = "Please fill in food item, quantity and expiry time");
        }
        $("donationBtn").disabled = true;
        try {
            await api("/donations", {
                method: "POST",
                body: {
                    foodName: $("foodName").value,
                    foodType: $("foodType").value,
                    isVeg: document.querySelector('input[name="isVeg"]:checked').value === "true",
                    quantity: $("quantity").value,
                    unit: $("unit").value,
                    prepTime: $("prepTime").value ? new Date($("prepTime").value).toISOString() : undefined,
                    expiryTime: new Date($("expiryTime").value).toISOString(),
                    pickupAddress: $("pickupAddress").value,
                    description: $("description").value,
                    requestedNgo: document.querySelector('input[name="ngoPick"]:checked')?.value || "",
                    aiRecommendation: aiData ? {
                        urgencyLevel: aiData.urgency,
                        priorityLevel: aiData.priorityLevel,
                        estimatedServings: aiData.estimatedServings,
                        suggestedNgoName: aiData.recommendedNgo?.name
                    } : undefined
                }
            });
            toast("Donation request created and dispatched successfully!");
            $("donationForm").reset();
            $("aiResultBox").classList.add("hidden");
            newInited = false;
            selectedNgo = "";
            aiData = null;
            loadNotifications();
            checkEmergencyAlerts();
            showView("mine");
        } catch (err) {
            $("donationError").textContent = err.message;
        } finally {
            $("donationBtn").disabled = false;
        }
    };
}

async function loadNearby() {
    $("ngoList").innerHTML = '<div class="empty">Finding NGOs near you...</div>';
    try {
        const { ngos } = await api("/ngos/nearby?radius=" + $("radius").value);
        $("ngoList").innerHTML =
            `<label class="ngo-opt"><input type="radio" name="ngoPick" value="" ${selectedNgo === "" ? "checked" : ""}><div><b>Send to all nearby NGOs</b><small>First NGO to accept claims the surplus</small></div></label>` +
            (ngos.length ? ngos.map((n) => `<label class="ngo-opt"><input type="radio" name="ngoPick" value="${n._id}" ${selectedNgo === n._id ? "checked" : ""}><div><b>${esc(n.name)} ${n.verificationStatus === "verified" ? '<i class="ri-checkbox-circle-fill" style="color:var(--leaf)" title="Verified Partner"></i>' : ""}</b><small>${esc(n.address || n.city || "")}${n.capacity ? " - feeds " + n.capacity + "/day" : ""}</small></div><span class="km">${n.distanceKm} km</span></label>`).join("")
                : '<div class="empty"><b>No NGOs in this radius</b>Try expanding the search radius.</div>');
        document.querySelectorAll('input[name="ngoPick"]').forEach((r) => (r.onchange = () => (selectedNgo = r.value)));
        drawMap(ngos);
    } catch (err) { $("ngoList").innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
}

function drawMap(ngos) {
    if (typeof L === "undefined") { $("map").classList.add("hidden"); return; }
    const here = [me.location?.lat || 16.4016, me.location?.long || 74.3792];
    if (!map) {
        map = L.map("map", { scrollWheelZoom: false }).setView(here, 11);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors", maxZoom: 18 }).addTo(map);
    }
    if (mapLayer) mapLayer.remove();
    mapLayer = L.featureGroup().addTo(map);
    L.circleMarker(here, { radius: 9, color: "#059669", fillColor: "#059669", fillOpacity: 1 }).bindPopup("<b>Your location</b>").addTo(mapLayer);
    ngos.forEach((n) => L.circleMarker([n.location.lat, n.location.long], { radius: 8, color: "#d1432b", fillColor: "#f59e0b", fillOpacity: 1, weight: 2 }).bindPopup(`<b>${esc(n.name)}</b><br>${n.distanceKm} km away`).addTo(mapLayer));
    setTimeout(() => { map.invalidateSize(); map.fitBounds(mapLayer.getBounds().pad(0.3), { maxZoom: 13 }); }, 80);
}

// ---------- MY DONATIONS / MY PICKUPS ----------
async function loadMine() {
    try {
        mineData = (await api("/donations/mine")).donations;
        renderMine();
    } catch (err) { toast(err.message, true); }
}

function renderMine() {
    const groups = {
        active: ["Pending", "Accepted", "PickedUp"],
        done: ["Completed"],
        closed: ["Rejected", "Cancelled", "Expired"]
    };
    let list = mineData;
    if (mineFilter === "emergency") {
        list = mineData.filter((d) => d.urgencyMeta?.isEmergency && ["Pending", "Accepted"].includes(d.status));
    } else if (mineFilter !== "all") {
        list = mineData.filter((d) => groups[mineFilter]?.includes(d.status));
    }

    $("mineCards").innerHTML = list.map((d) => donationCard(d, "mine")).join("") ||
        `<div class="empty" style="grid-column:1/-1"><b>No donations matching filter</b>${isRestaurant ? "Create a donation from New donation." : "Accept a request from Incoming requests."}</div>`;
}

$("mineTabs").onclick = (e) => {
    const c = e.target.closest(".chip"); if (!c) return;
    mineFilter = c.dataset.f;
    document.querySelectorAll("#mineTabs .chip").forEach((x) => x.classList.toggle("active", x === c));
    renderMine();
};

// ---------- FEATURE 2: INCOMING REQUESTS & EMERGENCY RESCUE ----------
async function loadIncoming() {
    try {
        const { donations } = await api("/donations/incoming");
        incomingData = donations;
        renderIncoming();
        const c = $("incomingCount");
        if (c) { c.textContent = donations.length; c.classList.toggle("hidden", !donations.length); }
    } catch (err) { toast(err.message, true); }
}

function renderIncoming() {
    let list = incomingData;
    if (incomingFilter === "emergency") {
        list = incomingData.filter((d) => d.urgencyMeta?.isEmergency);
    } else if (incomingFilter === "priority") {
        list = incomingData.filter((d) => d.urgencyMeta?.level === "Priority" || d.urgencyMeta?.isEmergency);
    }

    $("incomingCards").innerHTML = list.map((d) => donationCard(d, "incoming")).join("") ||
        '<div class="empty" style="grid-column:1/-1"><b>No requests right now</b>New donation requests from nearby restaurants will appear here.</div>';
}

$("incomingTabs").onclick = (e) => {
    const c = e.target.closest(".chip"); if (!c) return;
    incomingFilter = c.dataset.inc;
    document.querySelectorAll("#incomingTabs .chip").forEach((x) => x.classList.toggle("active", x === c));
    renderIncoming();
};

// ---------- FEATURE 3: FOOD WASTE FORECASTING & ANALYTICS ----------
async function loadForecast() {
    try {
        const f = await api("/stats/forecast");

        // KPI Cards
        $("forecastKpis").innerHTML = `
            <div class="forecast-card"><div class="desc">Total Food Rescued</div><div class="val" style="color:#059669">${f.completedKgSaved} kg</div><div class="desc">${f.completedCount} completed donations</div></div>
            <div class="forecast-card"><div class="desc">Avg Surplus per Listing</div><div class="val" style="color:#2563eb">${f.avgSurplusKg} kg</div><div class="desc">Average quantity generated</div></div>
            <div class="forecast-card"><div class="desc">Rescue Efficiency</div><div class="val" style="color:#f59e0b">${f.forecast?.rescueEfficiency ?? 85}%</div><div class="desc">Surplus diversion rate</div></div>
            <div class="forecast-card"><div class="desc">Peak Surplus Day</div><div class="val" style="color:#7c3aed">${f.forecast?.peakSurplusDay || "Saturday"}</div><div class="desc">Highest waste volume</div></div>
        `;

        // Prediction Box
        const p = f.forecast;
        $("predictionMessage").textContent = p?.predictionMessage || "Analysing kitchen donation patterns...";
        if (p?.canPredict) {
            $("predictionMetrics").innerHTML = `
                <div class="prediction-pill"><div style="font-size:11px;font-weight:700;color:var(--muted)">PROJECTED NEXT SURPLUS</div><b style="font-size:18px;color:#166534">${p.predictedSurplusKg} kg</b><div style="font-size:12px;color:#15803d">Expected kitchen excess</div></div>
                <div class="prediction-pill"><div style="font-size:11px;font-weight:700;color:var(--muted)">RECOMMENDED LISTING QTY</div><b style="font-size:18px;color:#047857">${p.recommendedDonationKg} kg (${p.recommendedDonationServings} meals)</b><div style="font-size:12px;color:#15803d">Target rescue portion</div></div>
                <div class="prediction-pill"><div style="font-size:11px;font-weight:700;color:var(--muted)">OPTIMAL LISTING WINDOW</div><b style="font-size:15px;color:#1e3a8a">${p.recommendedListingWindow}</b><div style="font-size:12px;color:var(--muted)">Max NGO pickup availability</div></div>
                <div class="prediction-pill"><div style="font-size:11px;font-weight:700;color:var(--muted)">PREDICTION CONFIDENCE</div><b style="font-size:18px;color:#b45309">${p.confidenceScore}%</b><div style="font-size:12px;color:var(--muted)">Based on real logged history</div></div>
            `;
        } else {
            $("predictionMetrics").innerHTML = `<div class="empty" style="grid-column:1/-1">Complete more donations to generate accurate seasonal ML predictions.</div>`;
        }

        drawForecastCharts(f);
    } catch (err) { toast(err.message, true); }
}

function drawForecastCharts(f) {
    if (typeof Chart === "undefined") return;
    if (charts.fType) charts.fType.destroy();
    if (charts.fDay) charts.fDay.destroy();
    if (charts.fMonth) charts.fMonth.destroy();

    // Chart 1: Types Breakdown
    const typeNames = { cooked: "Cooked Meals", raw: "Raw Ingredients", packaged: "Packaged Food", bakery: "Bakery Items" };
    charts.fType = new Chart($("forecastTypeChart"), {
        type: "doughnut",
        data: {
            labels: f.topWastedTypes.map((t) => typeNames[t.foodType] || t.foodType),
            datasets: [{
                data: f.topWastedTypes.map((t) => t.kg),
                backgroundColor: ["#059669", "#f59e0b", "#ef4444", "#2563eb"],
                borderWidth: 0
            }]
        },
        options: { maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
    });

    // Chart 2: Day of Week Pattern
    charts.fDay = new Chart($("forecastDayChart"), {
        type: "bar",
        data: {
            labels: f.dayOfWeekStats.map((d) => d.day),
            datasets: [{ label: "Surplus (kg)", data: f.dayOfWeekStats.map((d) => d.kg), backgroundColor: "#2563eb", borderRadius: 6 }]
        },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: "#e2e8f0" } } } }
    });

    // Chart 3: Monthly Trends
    charts.fMonth = new Chart($("forecastMonthlyChart"), {
        type: "line",
        data: {
            labels: f.monthlyTrends.map((m) => m.label),
            datasets: [
                { label: "Food Rescued (kg)", data: f.monthlyTrends.map((m) => m.kg), borderColor: "#059669", backgroundColor: "rgba(5, 150, 105, 0.1)", fill: true, tension: 0.3 },
                { label: "Completed Pickups", data: f.monthlyTrends.map((m) => m.completed), borderColor: "#f59e0b", borderDash: [5, 5], tension: 0.3 }
            ]
        },
        options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: "#e2e8f0" } } } }
    });
}

// ---------- FEATURE 5: FOOD RESCUE IMPACT CERTIFICATE ----------
async function loadCertificate() {
    try {
        const cert = await api("/stats/certificate");

        $("certIdVal").textContent = cert.certificateId;
        $("certDateVal").textContent = fmtDate(cert.issueDate);
        $("certOrgName").textContent = cert.organizationName;
        $("certRoleTag").textContent = cert.roleTitle;
        $("certTrustBadge").innerHTML = getTrustBadgeHtml(cert.verificationStatus);

        $("certKgVal").textContent = `${cert.impact.totalFoodRescuedKg} kg`;
        $("certMealsVal").textContent = cert.impact.totalMealsSupported.toLocaleString("en-IN");
        $("certCo2Val").textContent = `${cert.impact.co2EmissionsPreventedKg} kg`;
        $("certStatusVal").textContent = cert.accreditation.status;

        // Copy Certificate ID
        $("copyCertIdBtn").onclick = () => {
            navigator.clipboard.writeText(cert.certificateId);
            toast(`Copied ${cert.certificateId} to clipboard!`);
        };

        // Print Certificate
        $("printCertBtn").onclick = () => {
            window.print();
        };

        // Monthly Impact History Table
        if (cert.monthlyImpact && cert.monthlyImpact.length) {
            $("certMonthlyTable").innerHTML = `
                <table style="width:100%;border-collapse:collapse;font-size:14px">
                  <thead>
                    <tr style="border-bottom:2px solid var(--line);text-align:left;color:var(--muted)">
                      <th style="padding:10px 8px">Month</th>
                      <th style="padding:10px 8px">Total Saved (kg)</th>
                      <th style="padding:10px 8px">Meals Served</th>
                      <th style="padding:10px 8px">Verified Pickups</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${cert.monthlyImpact.map((m) => `
                      <tr style="border-bottom:1px solid var(--line)">
                        <td style="padding:10px 8px"><b>${m.month}</b></td>
                        <td style="padding:10px 8px">${m.kg} kg</td>
                        <td style="padding:10px 8px">${m.meals} meals</td>
                        <td style="padding:10px 8px"><span class="pill Completed">${m.count} Completed</span></td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>`;
        } else {
            $("certMonthlyTable").innerHTML = '<div class="empty">No completed monthly records logged yet.</div>';
        }
    } catch (err) { toast(err.message, true); }
}

// ---------- FEATURE 4: ADMIN VERIFICATION & TRUST PORTAL ----------
let adminOrgs = [];
async function loadAdminPortal() {
    try {
        const [stats, verRes] = await Promise.all([
            api("/admin/overview"),
            api("/admin/verifications")
        ]);

        adminOrgs = verRes.organizations;

        $("adminKpis").innerHTML = `
            <div class="forecast-card"><div class="desc">Restaurants</div><div class="val" style="color:#059669">${stats.totalRestaurants}</div><div class="desc">Registered food donors</div></div>
            <div class="forecast-card"><div class="desc">NGOs / Shelters</div><div class="val" style="color:#2563eb">${stats.totalNgos}</div><div class="desc">Registered distribution partners</div></div>
            <div class="forecast-card"><div class="desc">Pending Review</div><div class="val" style="color:#ef4444">${stats.pendingVerifications}</div><div class="desc">Awaiting admin review</div></div>
            <div class="forecast-card"><div class="desc">Verified Partners</div><div class="val" style="color:#047857">${stats.verifiedCount}</div><div class="desc">Accredited organizations</div></div>
        `;

        const badge = $("adminBadge");
        if (badge) {
            badge.textContent = stats.pendingVerifications;
            badge.classList.toggle("hidden", stats.pendingVerifications === 0);
        }

        renderAdminOrgs();
    } catch (err) { toast(err.message, true); }
}

function renderAdminOrgs() {
    let list = adminOrgs;
    if (adminFilter === "pending") list = adminOrgs.filter((o) => o.verificationStatus === "pending");
    if (adminFilter === "verified") list = adminOrgs.filter((o) => o.verificationStatus === "verified");
    if (adminFilter === "rejected") list = adminOrgs.filter((o) => o.verificationStatus === "rejected");

    $("adminOrgList").innerHTML = list.map((o) => `
        <article class="admin-org-card">
          <div class="admin-org-header">
            <div>
              <h3 style="font-size:18px">${esc(o.name)}</h3>
              <div style="font-size:13px;color:var(--muted)">${o.role === "restaurant" ? "🍴 Restaurant" : "🤝 NGO / Shelter"} • Contact: ${esc(o.ownerName || "-")}</div>
            </div>
            <div>${getTrustBadgeHtml(o.verificationStatus)}</div>
          </div>
          <div class="admin-org-meta">
            <span><i class="ri-phone-line"></i> ${esc(o.phone || "-")}</span>
            <span><i class="ri-mail-line"></i> ${esc(o.email)}</span>
            <span><i class="ri-map-pin-line"></i> ${esc([o.address, o.city].filter(Boolean).join(", "))}</span>
            <span><i class="ri-file-list-line"></i> <b>Reg / Lic:</b> ${esc(o.registrationNo || "Not provided")}</span>
            <span><i class="ri-star-line"></i> Trust Rating: <b>${o.trustScore || 5.0}/5.0</b></span>
            <span><i class="ri-checkbox-circle-line"></i> Completed Donated: <b>${o.completedDonationsCount || 0}</b></span>
          </div>
          ${o.verificationDocs ? `<div style="background:var(--mist);border:1px solid var(--line);padding:10px 14px;border-radius:6px;font-size:13px"><b>Submitted Compliance Notes:</b> ${esc(o.verificationDocs)}</div>` : ""}
          <div class="admin-actions">
            ${o.verificationStatus !== "verified" ? `<button class="btn btn-primary btn-sm" onclick="verifyOrg('${o._id}', 'verified')"><i class="ri-check-line"></i> Approve & Verify</button>` : ""}
            ${o.verificationStatus !== "rejected" ? `<button class="btn btn-danger btn-sm" onclick="verifyOrg('${o._id}', 'rejected')"><i class="ri-close-line"></i> Reject / Request Re-submission</button>` : ""}
          </div>
        </article>
    `).join("") || '<div class="empty" style="grid-column:1/-1">No organizations found under this filter.</div>';
}

// Global window function for admin verification action
window.verifyOrg = async (id, status) => {
    let reason = "";
    if (status === "rejected") {
        reason = prompt("Please provide a reason or missing documentation requirement for this organization:", "FSSAI or NGO registration number requires valid documentary proof.");
        if (reason === null) return;
    }
    try {
        await api(`/admin/verify/${id}`, {
            method: "PUT",
            body: { status, reason }
        });
        toast(`Organization marked as ${status}!`);
        loadAdminPortal();
    } catch (err) { toast(err.message, true); }
};

$("adminTabs").onclick = (e) => {
    const c = e.target.closest(".chip"); if (!c) return;
    adminFilter = c.dataset.adm;
    document.querySelectorAll("#adminTabs .chip").forEach((x) => x.classList.toggle("active", x === c));
    renderAdminOrgs();
};

// ---------- PROFILE & VERIFICATION UPDATE ----------
async function loadProfile() {
    const { user } = await api("/auth/me");
    me = user;
    Session.save(Session.token, user);
    updateTopTrustBadge();

    $("profileVerificationBadge").innerHTML = getTrustBadgeHtml(user.verificationStatus);

    const rows = [
        ["Organization Name", user.name],
        ["Account Type", isAdmin ? "Administrator" : isRestaurant ? "Restaurant" : "NGO / Shelter"],
        ["Verification Status", user.verificationStatus ? user.verificationStatus.toUpperCase() : "PENDING"],
        ["Trust Rating", `⭐ ${user.trustScore || 5.0} / 5.0`],
        ["Contact Person", user.ownerName || "-"],
        ["Email", user.email],
        ["Phone", user.phone || "-"],
        [isRestaurant ? "FSSAI licence number" : "NGO registration number", user.registrationNo || "Not provided"],
        ["Address", [user.address, user.city].filter(Boolean).join(", ") || "-"],
        ["Coordinates", user.location ? `${user.location.lat}, ${user.location.long}` : "-"],
        ...(isRestaurant ? [] : [["Daily Feeding Capacity", user.capacity || 0]])
    ];
    $("profileGrid").innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v || "-")}</dd>`).join("");

    $("verRegNo").value = user.registrationNo || "";
    $("verDocs").value = user.verificationDocs || "";

    $("verifyForm").onsubmit = async (e) => {
        e.preventDefault();
        $("verError").textContent = "";
        $("verBtn").disabled = true;
        try {
            const data = await api("/auth/verification-details", {
                method: "PUT",
                body: {
                    registrationNo: $("verRegNo").value,
                    verificationDocs: $("verDocs").value
                }
            });
            toast("Verification details submitted for review!");
            loadProfile();
        } catch (err) {
            $("verError").textContent = err.message;
        } finally {
            $("verBtn").disabled = false;
        }
    };
}

// ---------- NOTIFICATIONS ----------
async function loadNotifications() {
    try {
        const { unread, notifications } = await api("/notifications");
        $("bellBadge").textContent = unread;
        $("bellBadge").classList.toggle("hidden", unread === 0);
        $("notifList").innerHTML = notifications.map((n) =>
            `<div class="notif ${n.read ? "" : "unread"}"><span class="dot ${n.read ? "" : "dot-green"}"></span><div>${esc(n.message)}<small>${fmtShort(n.createdAt)}</small></div></div>`).join("")
            || '<div class="empty"><b>All caught up</b>Updates about your donations show up here.</div>';
        if (isNgo) {
            const c = $("incomingCount");
            if (c && unread) loadIncomingCountOnly();
        }
    } catch (e) { /* ignore */ }
}

async function loadIncomingCountOnly() {
    try {
        const { count } = await api("/donations/incoming");
        const c = $("incomingCount");
        if (c) { c.textContent = count; c.classList.toggle("hidden", !count); }
    } catch (e) { }
}

$("bellBtn").onclick = (e) => { e.stopPropagation(); $("notifBox").classList.toggle("hidden"); };
document.addEventListener("click", (e) => { if (!e.target.closest(".bell-wrap")) $("notifBox").classList.add("hidden"); });
$("markAll").onclick = async () => { await api("/notifications/read-all", { method: "PUT" }); loadNotifications(); };

// ---------- START ----------
showView("overview");
loadNotifications();
checkEmergencyAlerts();
if (isNgo) loadIncomingCountOnly();
setInterval(loadNotifications, 15000);
setInterval(checkEmergencyAlerts, 30000);