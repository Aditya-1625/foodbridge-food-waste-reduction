// Login + Register + Forgot + Reset password pages
const $ = (id) => document.getElementById(id);
const form = document.getElementById("loginForm") || 
             document.getElementById("registerForm") ||
             document.getElementById("forgotForm") ||
             document.getElementById("resetForm");
const errBox = document.getElementById("formError");
const btn = document.getElementById("submitBtn");

if (Session.token && Session.user) location.href = "dashboard.html";

function fail(msg) { errBox.textContent = msg; if (btn) btn.disabled = false; }

// ---------- PASSWORD VISIBILITY TOGGLE ----------
document.querySelectorAll(".password-toggle-btn").forEach((toggleBtn) => {
    toggleBtn.addEventListener("click", () => {
        const targetId = toggleBtn.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        toggleBtn.innerHTML = isPassword ? '<i class="ri-eye-off-line"></i>' : '<i class="ri-eye-line"></i>';
        const label = isPassword ? "Hide password" : "Show password";
        toggleBtn.setAttribute("title", label);
        toggleBtn.setAttribute("aria-label", label);
    });
});

// ---------- LOGIN ----------
if (form && form.id === "loginForm") {
    document.querySelectorAll("[data-demo]").forEach((b) =>
        b.addEventListener("click", () => {
            document.getElementById("email").value = b.dataset.demo;
            document.getElementById("password").value = b.dataset.pwd || "demo123";
        })
    );
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errBox.textContent = ""; btn.disabled = true;
        const email = $("email").value.trim();
        const password = $("password").value;
        if (!email || !password) return fail("Email and password are required");
        try {
            const data = await api("/auth/login", { method: "POST", body: { email, password } });
            Session.save(data.token, data.user);
            location.href = "dashboard.html";
        } catch (err) { fail(err.message); }
    });
}

// ---------- REGISTER ----------
if (form && form.id === "registerForm") {
    const roleInputs = document.querySelectorAll('input[name="role"]');
    const currentRole = () => document.querySelector('input[name="role"]:checked').value;

    function applyRole() {
        const ngo = currentRole() === "ngo";
        document.getElementById("nameLabel").textContent = ngo ? "NGO or shelter name" : "Restaurant name";
        document.getElementById("regNoLabel").textContent = ngo ? "NGO registration number" : "FSSAI licence number";
        document.getElementById("capacityField").classList.toggle("hidden", !ngo);
    }
    roleInputs.forEach((r) => r.addEventListener("change", applyRole));
    const pre = new URLSearchParams(location.search).get("role");
    if (pre === "ngo" || pre === "restaurant") document.querySelector(`input[value="${pre}"]`).checked = true;
    applyRole();

    document.getElementById("geoBtn").addEventListener("click", () => {
        if (!navigator.geolocation) return toast("Your browser does not support location", true);
        toast("Finding your location...");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                $("lat").value = pos.coords.latitude.toFixed(5);
                $("long").value = pos.coords.longitude.toFixed(5);
                toast("Location filled in");
            },
            () => toast("Could not get location. Type latitude and longitude instead.", true),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errBox.textContent = "";
        const need = ["name", "email", "phone", "password", "address", "city", "lat", "long"];
        for (const id of need) {
            if (!document.getElementById(id).value.trim()) {
                document.getElementById(id).focus();
                return fail("Please fill in all required fields");
            }
        }
        btn.disabled = true;
        try {
            const data = await api("/auth/register", {
                method: "POST",
                body: {
                    role: currentRole(), name: $("name").value, ownerName: $("ownerName").value, email: $("email").value,
                    password: $("password").value, phone: $("phone").value, address: $("address").value, city: $("city").value,
                    registrationNo: $("registrationNo").value, capacity: $("capacity").value, lat: $("lat").value, long: $("long").value
                }
            });
            Session.save(data.token, data.user);
            location.href = "dashboard.html";
        } catch (err) { fail(err.message); }
    });
}

// ---------- FORGOT PASSWORD ----------
if (form && form.id === "forgotForm") {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errBox.textContent = "";
        const email = $("email").value.trim();
        if (!email) return fail("Please enter your registered email address");
        btn.disabled = true;
        try {
            const data = await api("/auth/forgot-password", {
                method: "POST",
                body: { email }
            });
            $("forgotSuccessMsg").textContent = data.message || "Reset link generated successfully.";
            $("directResetLink").href = data.resetUrl;
            $("forgotSuccessBox").style.display = "block";
            form.style.display = "none";
        } catch (err) {
            fail(err.message);
        }
    });
}

// ---------- RESET PASSWORD ----------
if (form && form.id === "resetForm") {
    const urlParams = new URLSearchParams(location.search);
    const tokenFromUrl = urlParams.get("token");
    if (tokenFromUrl) {
        $("token").value = tokenFromUrl;
        $("tokenFieldWrap").style.display = "none"; // Auto-populated via URL
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errBox.textContent = "";
        const token = $("token").value.trim();
        const password = $("newPassword").value;
        const confirmPassword = $("confirmPassword").value;

        if (!token) return fail("Security reset token is required");
        if (!password || password.length < 6) return fail("Password must be at least 6 characters");
        if (password !== confirmPassword) return fail("Passwords do not match");

        btn.disabled = true;
        try {
            const data = await api("/auth/reset-password", {
                method: "POST",
                body: { token, password }
            });
            $("resetSuccessBox").style.display = "block";
            form.style.display = "none";
            setTimeout(() => {
                location.href = "login.html";
            }, 2500);
        } catch (err) {
            fail(err.message);
        }
    });
}