const API_BASE = "https://nuvia-dialer-backend.onrender.com/api";
const WS_BASE  = "wss://nuvia-dialer-backend.onrender.com/ws";

const app = document.getElementById("app");

function setStatus(msg, color = "#005A63") {
  const s = document.getElementById("status");
  if (s) {
    s.textContent = msg;
    s.style.color = color;
  }
}

function createBanner(direction) {
  removeBanner();
  const banner = document.createElement("div");
  banner.classList.add("banner", direction.toLowerCase());
  banner.innerHTML =
    direction === "Inbound"
      ? `📥 Connected to an Inbound Caller`
      : `📤 Connected to an Outbound Lead`;
  document.body.appendChild(banner);
}

function removeBanner() {
  const existing = document.querySelector(".banner");
  if (existing) existing.remove();
}

function openHighLevelContact(ghlLocationID, ghlContactID) {
  if (!ghlLocationID || !ghlContactID) return;
  const url = `https://app.gohighlevel.com/v2/location/${ghlLocationID}/contacts/detail/${ghlContactID}`;
  window.open(url, "_blank");
}

// ========== LOGIN VIEW ==========
function viewLogin() {
  app.innerHTML = `
    <div class="card fade">
      <h1>Nuvia Dialer</h1>
      <input id="u" class="input" placeholder="Username" />
      <input id="p" type="password" class="input" placeholder="Password" />
      <button id="login" class="btn">Login</button>
      <div class="status" id="status"></div>
    </div>`;
  document.getElementById("login").onclick = doLogin;
}

// ========== MAIN DIALER VIEW ==========
async function viewControls() {
  const res = await fetch(`${API_BASE}/campaigns/for-skill?token=${encodeURIComponent(window.ACCESS_TOKEN)}`);
  let campaignData = res.ok ? await res.json() : {};
  const campaign = campaignData?.campaigns?.[0];
  const location = campaignData?.location || "Unknown";
  const campaignName = campaign ? campaign.name : "No outbound campaign found";

  app.innerHTML = `
    <div class="card fade">
      <h1>Nuvia Dialer</h1>
      <div style="text-align:center;margin-bottom:6px;">
        <small>Location: <strong>${location}</strong></small>
      </div>
      <label>Assigned Campaign</label>
      <input id="campaign" class="input" value="${campaignName}" readonly />
      <input id="num" class="input" placeholder="Enter phone number" />
      <div class="actions">
        <button id="call" class="btn"${campaign ? "" : " disabled"}>📞 Call</button>
        <button id="end" class="btn" style="background: linear-gradient(135deg,#999,#666)">❌ End</button>
      </div>
      <div class="dual-progress">
        <div class="track inbound"><div id="inbound-bar" class="track-bar"></div></div>
        <div class="track-label inbound">Inbound Activity <span id="inbound-progress">0%</span></div>
        <div class="track outbound"><div id="outbound-bar" class="track-bar"></div></div>
        <div class="track-label"><span class="icon">📤</span><span id="outbound-label">Outbound Idle</span><span id="outbound-progress">0%</span></div>
      </div>
      <div class="status" id="status">Ready to dial for ${location}</div>
    </div>`;

  document.getElementById("call").onclick = async () => {
    const number = document.getElementById("num").value.trim();
    if (!number) return setStatus("Enter phone number.", "red");
    if (!campaign) return setStatus("No outbound campaign found.", "red");

    setStatus(`Dialing ${number} via ${campaign.name}...`);
    const res = await fetch(`${API_BASE}/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: window.ACCESS_TOKEN, number, campaign: campaign.name }),
    });
    if (!res.ok) {
      const t = await res.text();
      return setStatus(`Call failed: ${t.slice(0, 100)}`, "red");
    }
    const js = await res.json();
    setStatus(`Call placed via ${campaign.name} (ID: ${js.id || "n/a"})`, "#007C89");
  };

  document.getElementById("end").onclick = () => setStatus("Call ended.", "#999");

  bootWS();
}

// ========== LOGIN HANDLER ==========
async function doLogin() {
  const username = document.getElementById("u").value.trim();
  const password = document.getElementById("p").value;
  if (!username || !password) return setStatus("Enter username & password", "red");

  setStatus("Authenticating...");
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      setStatus("Login failed. Check credentials.", "red");
      return;
    }
    const data = await res.json();
    window.ACCESS_TOKEN = data.access_token;
    setStatus("Login successful. Loading dialer...");
    setTimeout(() => viewControls(), 700);
  } catch (e) {
    setStatus("Network error. Try again.", "red");
  }
}

// ========== WEBSOCKET EVENT HANDLER ==========
function bootWS() {
  const ws = new WebSocket(WS_BASE);
  const inTrack = document.querySelector(".track.inbound");
  const inBar = document.getElementById("inbound-bar");
  const outBar = document.getElementById("outbound-bar");
  const outLabel = document.getElementById("outbound-label");
  const inProg = document.getElementById("inbound-progress");
  const outProg = document.getElementById("outbound-progress");

  ws.onopen = () => setStatus("Agent feed connected…");

  ws.onmessage = (m) => {
    const evt = JSON.parse(m.data);
    const type = (evt.type || "").toLowerCase();

    if (evt.event === "dialing" && type === "inbound") {
      const p = evt.progress || 0;
      inBar.style.width = `${p}%`;
      inProg.textContent = `${p}%`;
      if (p > 0) inTrack.classList.add("active");
      else inTrack.classList.remove("active");
      if (p > 70) inTrack.classList.add("glow");
      else inTrack.classList.remove("glow");
    }

    if (evt.event === "dialing" && type === "outbound") {
      const p = evt.progress || 0;
      outBar.style.width = `${p}%`;
      outProg.textContent = `${p}%`;
      outLabel.textContent = evt.ghlStageName || "Outbound dialing…";
    }

    if (evt.event === "connected") {
      createBanner(evt.type || "Outbound");
      if (evt.type === "Inbound") {
        inBar.style.width = "100%";
        inProg.textContent = "100%";
        inTrack.classList.remove("active", "glow");
      } else {
        outBar.style.width = "100%";
        outProg.textContent = "100%";
        outLabel.textContent = "Connected – Outbound";
      }
      if (evt.lead) {
        const { ghlLocationID, ghlContactID } = evt.lead;
        if (ghlLocationID && ghlContactID) openHighLevelContact(ghlLocationID, ghlContactID);
      }
    }

    if (evt.event === "idle") {
      removeBanner();
      inTrack.classList.remove("active", "glow");
      inBar.style.width = "0%";
      outBar.style.width = "0%";
      inProg.textContent = "0%";
      outProg.textContent = "0%";
      outLabel.textContent = "Outbound Idle";
      setStatus("Ready for next call");
    }
  };
  ws.onclose = () => setStatus("Agent feed disconnected.");
}

// ========== INIT ==========
viewLogin();
