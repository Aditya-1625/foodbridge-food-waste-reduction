/* Shared helpers used by every page */
const API = (location.port === "5000" || (location.hostname !== "localhost" && location.hostname !== "127.0.0.1" && location.protocol.startsWith("http")))
    ? "/api" : "http://localhost:5000/api";

const Session = {
    get token() { return localStorage.getItem("fb_token"); },
    get user() { try { return JSON.parse(localStorage.getItem("fb_user")); } catch (e) { return null; } },
    save(token, user) { localStorage.setItem("fb_token", token); localStorage.setItem("fb_user", JSON.stringify(user)); },
    clear() { localStorage.removeItem("fb_token"); localStorage.removeItem("fb_user"); }
};

async function api(path, options = {}) {
    const headers = { "Content-Type": "application/json" };
    if (Session.token) headers.Authorization = "Bearer " + Session.token;
    let res;
    try {
        res = await fetch(API + path, { ...options, headers, body: options.body ? JSON.stringify(options.body) : undefined });
    } catch (e) {
        throw new Error("Cannot reach the server. Is 'npm start' running?");
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && Session.token) { Session.clear(); location.href = "login.html"; }
    if (!res.ok) throw new Error(data.error || "Something went wrong");
    return data;
}

function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function toast(message, isError = false) {
    let box = document.querySelector(".toasts");
    if (!box) { box = document.createElement("div"); box.className = "toasts"; document.body.appendChild(box); }
    const t = document.createElement("div");
    t.className = "toast" + (isError ? " err" : "");
    t.textContent = message;
    box.appendChild(t);
    setTimeout(() => t.remove(), 3800);
}

function timeLeft(date) {
    const ms = new Date(date) - Date.now();
    if (ms <= 0) return { text: "Expired", urgent: true };
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    const text = h >= 24 ? Math.floor(h / 24) + "d " + (h % 24) + "h left" : h > 0 ? h + "h " + m + "m left" : m + "m left";
    return { text, urgent: ms < 2 * 3600000 };
}
const fmtDate = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const fmtShort = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
const icon = (name) => {
    const map = {
        store: "ri-store-2-fill",
        map: "ri-map-pin-2-fill",
        box: "ri-box-3-fill",
        hand: "ri-hand-heart-fill",
        track: "ri-route-fill",
        chart: "ri-pie-chart-2-fill",
        bell: "ri-notification-3-fill",
        home: "ri-dashboard-fill",
        plus: "ri-add-circle-fill",
        list: "ri-file-list-3-fill",
        inbox: "ri-inbox-archive-fill",
        user: "ri-user-3-fill",
        out: "ri-logout-box-r-line"
    };
    if (map[name]) {
        return `<i class="${map[name]} icon-ri"></i>`;
    }
    return `<svg class="icon"><use href="img/step-icons.svg#i-${name}"/></svg>`;
};