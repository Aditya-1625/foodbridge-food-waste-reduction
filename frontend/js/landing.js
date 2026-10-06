// Landing page: live counters + smart nav buttons
(function () {
    if (Session.token && Session.user) {
        document.getElementById("navLogin").textContent = "Open dashboard";
        document.getElementById("navLogin").href = "dashboard.html";
        document.getElementById("navRegister").classList.add("hidden");
    }
    const els = document.querySelectorAll("[data-key]");
    function count(el, to) {
        const start = performance.now(), dur = 900;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce || to === 0) { el.textContent = to.toLocaleString("en-IN"); return; }
        (function tick(now) {
            const p = Math.min((now - start) / dur, 1);
            el.textContent = Math.round(to * p).toLocaleString("en-IN");
            if (p < 1) requestAnimationFrame(tick);
        })(start);
    }
    fetch(API + "/stats/public").then((r) => r.json()).then((s) => els.forEach((el) => count(el, s[el.dataset.key] || 0))).catch(() => { });
})();