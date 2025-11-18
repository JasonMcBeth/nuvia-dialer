/* Nuvia Dialer — Five9 Agent Desktop Toolkit PLUS (custom JS)
   - Robust bootstrap for PLUS SDK
   - Dialer tab + Quick Actions strip
   - Click-to-dial, Presence, Audio checks, in-call DTMF (with indicator)
   - Console + in-app notifications for easy troubleshooting
*/

/* ===========================
   BOOTSTRAP for PLUS (up to ~5 min)
   =========================== */
(function boot(tries = 0) {
  // ADP/PLUS can expose the SDK a bit later. Probe common globals.
  const candidates = [
    () => window.Five9 && window.Five9.CrmSdk,
    () => window.CrmSdk,                        // occasionally global
    () => window.five9 && window.five9.CrmSdk,  // case variant
  ];

  let Sdk = null;
  for (const get of candidates) {
    try { Sdk = get(); if (Sdk) break; } catch (_) {}
  }

  if (!Sdk) {
    if (tries % 40 === 0) {
      try {
        const keys = Object.keys(window).filter(k => /five9|crm/i.test(k));
        console.log("[Nuvia Dialer • PLUS] Waiting for SDK… visible globals:", keys);
      } catch (_) {}
    }
    // Wait up to ~5 minutes (1200 * 250ms)
    if (tries < 1200) return setTimeout(() => boot(tries + 1), 250);
    console.warn("[Nuvia Dialer • PLUS] SDK not detected; stopping bootstrap.");
    return;
  }

  // Wait for Custom Components API to be usable
  (function waitForCC(t2 = 0) {
    let cApi = null;
    try { cApi = typeof Sdk.customComponentsApi === "function" ? Sdk.customComponentsApi() : null; } catch {}
    if (!cApi || typeof cApi.registerCustomComponents !== "function") {
      if (t2 % 40 === 0) console.log("[Nuvia Dialer • PLUS] customComponentsApi not ready, retrying…");
      if (t2 < 360) return setTimeout(() => waitForCC(t2 + 1), 250);  // ~90s
      console.warn("[Nuvia Dialer • PLUS] customComponentsApi unavailable; stopping bootstrap.");
      return;
    }
    // Hand off to app
    initNuviaDialerPlus(Sdk, cApi);
  })();
})();

/* ===========================
   APP for PLUS
   =========================== */
function initNuviaDialerPlus(Sdk, cApi) {
  const crmApi = Sdk.crmApi?.();
  const presenceApi = Sdk.presenceApi?.();
  const applicationApi = Sdk.applicationApi?.();
  const interactionApi = Sdk.interactionApi?.();
  const customComponentsApi = cApi;

  const notify = (msg, type = "info") =>
    applicationApi?.notify ? applicationApi.notify({ message: msg, type }) : console.log(`[${type}] ${msg}`);

  console.log("[Nuvia Dialer • PLUS] SDK ready — initializing UI…");

  const state = {
    useDefaultCampaign: true,
    callActive: false,
    dtmfTimer: 0
  };

  // ---------------- helpers ----------------
  const q = (sel) => document.querySelector(sel);
  const getVal = (n) => q(`[name="${n}"]`)?.value || "";
  const setVal = (n, v) => { const el = q(`[name="${n}"]`); if (el) el.value = v; };
  const setLabel = (n, txt) => { document.querySelectorAll(`button[name="${n}"]`).forEach(b => b.innerText = txt); };
  const sanitize = (n) => (n || "").replace(/[^0-9*#+]/g, "");

  async function setPresence(status) {
    try { await presenceApi?.setStatus?.({ status }); }
    catch (e) { console.error("setPresence failed", e); notify("Presence change failed.", "error"); }
  }

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

  // ---------------- call state + DTMF ----------------
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

  // ---------------- templates (PLUS-safe locations) ----------------
  // Primary: a custom tab in the left panel
  const templateTab = `
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
    </adt-components>
  `;

  // Secondary: footer strip in call details (shows even if tab placement is different)
  const templateFooter = `
    <adt-components>
      <adt-component location="3rdPartyComp-li-call-details-bottom" label="Nuvia Quick Actions" style="flex-direction:row;gap:8px;align-items:center;">
        <adt-button label="Bring App to Front" class="btnSecondary" onclick="nv_bringToFront"></adt-button>
      </adt-component>
    </adt-components>
  `;

  // ---------------- callbacks ----------------
  const callbacks = {
    // Dial
    nv_onDial: () => click2Dial(getVal("nv-number"), getVal("nv-campaign")),
    nv_onClear: () => setVal("nv-number", ""),
    nv_toggleDefault: () => {
      state.useDefaultCampaign = !state.useDefaultCampaign;
      setLabel("toggle-default", `Use Default Campaign: ${state.useDefaultCampaign ? "On" : "Off"}`);
    },

    // Presence
    nv_setWorking:  () => setPresence("WORKING"),
    nv_setNotReady: () => setPresence("NOT_READY"),
    nv_setLogout:   () => setPresence("LOGOUT"),

    // Audio
    nv_testMic:  () => testMic(),
    nv_testTone: () => testTone(),

    // Window util
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

  // ---------------- register (with fallback) ----------------
  try {
    customComponentsApi.registerCustomComponents({ template: templateTab, callbacks });
    console.log("[Nuvia Dialer • PLUS] Registered tab location.");
  } catch (e) {
    console.warn("[Nuvia Dialer • PLUS] Tab registration failed, trying footer only.", e);
  }

  try {
    customComponentsApi.registerCustomComponents({ template: templateFooter, callbacks });
    console.log("[Nuvia Dialer • PLUS] Registered footer quick actions.");
    notify("Nuvia Dialer loaded (PLUS)", "success");
  } catch (e) {
    console.error("[Nuvia Dialer • PLUS] Footer registration failed.", e);
    notify("Custom UI failed to load. See console.", "error");
  }

  // Keyboard DTMF
  window.addEventListener("keydown", (e) => {
    const map = { "#": "#", "*": "*", "0":"0","1":"1","2":"2","3":"3","4":"4","5":"5","6":"6","7":"7","8":"8","9":"9" };
    const k = map[e.key];
    if (!k) return;
    e.stopPropagation();
    sendDigit(k);
  });
}
