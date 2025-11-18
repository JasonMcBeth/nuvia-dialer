/* Nuvia Dialer — Five9 CustomComponents (robust bootstrap)
   - Finds the Five9 SDK under multiple globals
   - Waits up to ~180s for SDK/CustomComponents to be ready
   - Registers a custom Dialer tab + Quick Actions strip
   - Dialer, Presence, Audio checks, and in-call DTMF with indicator
*/

/* === BOOTSTRAP: robust SDK finder (waits up to ~180s) === */
(function boot(tries = 0) {
  // Try multiple global names seen across Five9 builds
  const candidates = [
    () => window.Five9 && window.Five9.CrmSdk,
    () => window.CrmSdk,                       // some builds expose global CrmSdk
    () => window.Five9CrmSdk,                  // rare
    () => window.five9 && window.five9.CrmSdk, // case variants
  ];

  let Sdk = null;
  for (const get of candidates) {
    try { Sdk = get(); if (Sdk) break; } catch (_) {}
  }

  if (!Sdk) {
    // Log diagnostics occasionally to help identify available globals
    if (tries % 20 === 0) {
      try {
        const keys = Object.keys(window).filter(k => /five9|crm/i.test(k));
        console.log("[Nuvia Dialer] Visible Five9-ish globals:", keys);
      } catch (_) {}
    }
    if (tries < 720) { // 720 * 250ms ≈ 180s
      return setTimeout(() => boot(tries + 1), 250);
    }
    console.warn("Nuvia Dialer: Five9 SDK not detected; custom UI not initialized.");
    return;
  }

  // If SDK found, ensure CustomComponents API is also ready (extra wait loop)
  (function waitForCustomComponents(t2 = 0) {
    let cApi = null;
    try { cApi = typeof Sdk.customComponentsApi === "function" ? Sdk.customComponentsApi() : null; } catch {}
    if (!cApi || typeof cApi.registerCustomComponents !== "function") {
      if (t2 < 240) { // an extra ~60s for customComponentsApi
        return setTimeout(() => waitForCustomComponents(t2 + 1), 250);
      }
      console.warn("Nuvia Dialer: customComponentsApi unavailable; UI not initialized.");
      return;
    }
    // Hand off once both SDK + customComponents are ready
    initNuviaDialer(Sdk, cApi);
  })();
})();

/* === APP START: pass in the detected SDK + customComponentsApi === */
function initNuviaDialer(Sdk, cApi) {
  const crmApi = Sdk.crmApi?.();
  const presenceApi = Sdk.presenceApi?.();
  const applicationApi = Sdk.applicationApi?.();
  const customComponentsApi = cApi;
  const interactionApi = Sdk.interactionApi?.();

  const notify = (msg, type = "info") =>
    applicationApi?.notify ? applicationApi.notify({ message: msg, type }) : console.log(`[${type}] ${msg}`);

  console.log("Nuvia Dialer: Five9 SDK ready, initializing…");

  const state = {
    useDefaultCampaign: true,
    callActive: false,
    dtmfTimer: 0
  };

  // ---------- helpers ----------
  const q = (sel) => document.querySelector(sel);
  const getVal = (n) => q(`[name="${n}"]`)?.value || "";
  const setVal = (n, v) => { const el = q(`[name="${n}"]`); if (el) el.value = v; };
  const setLabel = (n, txt) => { document.querySelectorAll(`button[name="${n}"]`).forEach(b => b.innerText = txt); };
  const sanitize = (n) => (n || "").replace(/[^0-9*#+]/g, "");

  // ---------- presence ----------
  async function setPresence(status) {
    try { await presenceApi?.setStatus?.({ status }); }
    catch (e) { console.error("setPresence failed", e); notify("Presence change failed.", "error"); }
  }

  // ---------- dialing ----------
  function click2Dial(num, campaign) {
    const n = sanitize(num);
    if (!n) return;
    try {
      crmApi?.click2dial?.({
        click2DialData: {
          clickToDialNumber: n,
          defaultCampaign: state.useDefaultCampaign,
          preselectedCampaignName: campaign || undefined
        }
      });
    } catch (e) { console.error("click2dial", e); notify("click2dial() failed.", "error"); }
  }

  // ---------- audio checks ----------
  async function testMic() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach(t => t.stop());
      notify("Microphone access OK.", "success");
    } catch (e) { notify("Mic access denied.", "error"); }
  }
  async function testTone() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = 440; g.gain.value = 0.05;
      o.connect(g); g.connect(ctx.destination); o.start();
      setTimeout(() => { o.stop(); ctx.close(); }, 1200);
    } catch (e) { console.warn(e); }
  }

  // ---------- DTMF & call state ----------
  interactionApi?.subscribe?.({
    callStarted:  () => state.callActive = true,
    callAccepted: () => state.callActive = true,
    callEnded:    () => state.callActive = false,
    callFinished: () => state.callActive = false
  });

  async function sendDigit(d) {
    const cur = getVal("nv-number");
    setVal("nv-number", (cur || "") + d);
    if (state.callActive && interactionApi?.sendDtmf) {
      try { await interactionApi.sendDtmf({ char: d }); flashIndicator(`Sent DTMF ${d}`, true); }
      catch (e) { console.error("sendDtmf failed:", e); flashIndicator(`DTMF ${d} failed`, false); }
    } else {
      flashIndicator("No active call", false);
    }
  }

  function flashIndicator(text, ok) {
    clearTimeout(state.dtmfTimer);
    const btns = document.querySelectorAll('button[name="dtmf-indicator"]');
    btns.forEach(b => {
      b.innerText = text;
      b.classList.remove("dtmf-ok", "dtmf-err");
      b.classList.add(ok ? "dtmf-ok" : "dtmf-err");
    });
    state.dtmfTimer = setTimeout(() => {
      btns.forEach(b => {
        b.innerText = state.callActive ? "DTMF: in-call" : "DTMF: idle";
        b.classList.remove("dtmf-ok", "dtmf-err");
      });
    }, 1200);
  }

  // ---------- template (Five9-documented locations) ----------
  const template = `
    <adt-components>
      <adt-component location="3rdPartyComp-li-call-tab" label="Nuvia Dialer" style="flex-direction:column;gap:8px">
        <adt-input id="nv-number" name="nv-number" label="Phone Number" placeholder="Enter number (+18005551234)"></adt-input>
        <adt-input id="nv-campaign" name="nv-campaign" label="Campaign (optional)" placeholder="Leave empty for default"></adt-input>

        <adt-btn-group label="Dial Controls" style="gap:8px;">
          <adt-button name="dial" label="Dial" class="btnPrimary" onclick="nv_onDial"></adt-button>
          <adt-button name="clear" label="Clear" class="btnSecondary" onclick="nv_onClear"></adt-button>
          <adt-button name="toggle-default" label="Use Default Campaign: On" class="btnSecondary" onclick="nv_toggleDefault"></adt-button>
        </adt-btn-group>

        <adt-btn-group label="Presence" style="gap:8px;">
          <adt-button label="Working"   class="btnPrimary"   onclick="nv_setWorking"></adt-button>
          <adt-button label="Not Ready" class="btnSecondary" onclick="nv_setNotReady"></adt-button>
          <adt-button label="Logout"    class="btnSecondary" onclick="nv_setLogout"></adt-button>
        </adt-btn-group>

        <adt-btn-group label="Audio Checks" style="gap:8px;">
          <adt-button label="Test Mic"      class="btnSecondary" onclick="nv_testMic"></adt-button>
          <adt-button label="Test Speakers" class="btnSecondary" onclick="nv_testTone"></adt-button>
        </adt-btn-group>

        <adt-btn-group label="DTMF" style="gap:8px;">
          <adt-button label="1" onclick="nv_digit_1"></adt-button>
          <adt-button label="2" onclick="nv_digit_2"></adt-button>
          <adt-button label="3" onclick="nv_digit_3"></adt-button>
          <adt-button label="4" onclick="nv_digit_4"></adt-button>
          <adt-button label="5" onclick="nv_digit_5"></adt-button>
          <adt-button label="6" onclick="nv_digit_6"></adt-button>
          <adt-button label="7" onclick="nv_digit_7"></adt-button>
          <adt-button label="8" onclick="nv_digit_8"></adt-button>
          <adt-button label="9" onclick="nv_digit_9"></adt-button>
          <adt-button label="*" onclick="nv_digit_star"></adt-button>
          <adt-button label="0" onclick="nv_digit_0"></adt-button>
          <adt-button label="#" onclick="nv_digit_hash"></adt-button>
          <adt-button name="dtmf-indicator" label="DTMF: idle" class="btnSecondary"></adt-button>
        </adt-btn-group>
      </adt-component>

      <adt-component location="3rdPartyComp-li-call-details-bottom" label="Nuvia Quick Actions" style="flex-direction:row;gap:8px;align-items:center;">
        <adt-button label="Bring App to Front" class="btnSecondary" onclick="nv_bringToFront"></adt-button>
      </adt-component>
    </adt-components>
  `;

  const callbacks = {
    nv_onDial: () => click2Dial(getVal("nv-number"), getVal("nv-campaign")),
    nv_onClear: () => setVal("nv-number", ""),
    nv_toggleDefault: () => {
      state.useDefaultCampaign = !state.useDefaultCampaign;
      setLabel("toggle-default", `Use Default Campaign: ${state.useDefaultCampaign ? "On" : "Off"}`);
    },

    // presence
    nv_setWorking:  () => setPresence("WORKING"),
    nv_setNotReady: () => setPresence("NOT_READY"),
    nv_setLogout:   () => setPresence("LOGOUT"),

    // audio
    nv_testMic:  () => testMic(),
    nv_testTone: () => testTone(),

    // window util
    nv_bringToFront: () => applicationApi?.bringAppToFront?.(),

    // DTMF
    nv_digit_1:    () => sendDigit("1"),
    nv_digit_2:    () => sendDigit("2"),
    nv_digit_3:    () => sendDigit("3"),
    nv_digit_4:    () => sendDigit("4"),
    nv_digit_5:    () => sendDigit("5"),
    nv_digit_6:    () => sendDigit("6"),
    nv_digit_7:    () => sendDigit("7"),
    nv_digit_8:    () => sendDigit("8"),
    nv_digit_9:    () => sendDigit("9"),
    nv_digit_star: () => sendDigit("*"),
    nv_digit_0:    () => sendDigit("0"),
    nv_digit_hash: () => sendDigit("#")
  };

  try {
    customComponentsApi.registerCustomComponents({ template, callbacks });
    console.log("Nuvia Dialer: Custom components registered.");
    notify("Nuvia Dialer loaded", "success");
  } catch (e) {
    console.error("registerCustomComponents failed", e);
    notify("Custom UI failed to load. See console.", "error");
  }

  // Optional keyboard DTMF
  window.addEventListener("keydown", (e) => {
    const map = { "#": "#", "*": "*", "0":"0","1":"1","2":"2","3":"3","4":"4","5":"5","6":"6","7":"7","8":"8","9":"9" };
    const k = map[e.key];
    if (!k) return;
    e.stopPropagation();
    sendDigit(k);
  });
}
