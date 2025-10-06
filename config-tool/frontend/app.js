const API_BASE = "https://five9-config-backend.onrender.com/api";

document.getElementById("configForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    username: document.getElementById("username").value,
    password: document.getElementById("password").value,
    location: document.getElementById("location").value,
    timezone: document.getElementById("timezone").value,
    ghlLocationId: document.getElementById("ghlLocationId").value,
    ghlPipelineId: document.getElementById("ghlPipelineId").value,
  };

  const status = document.getElementById("status");
  status.textContent = "Creating configuration...";

  try {
    const res = await fetch(`${API_BASE}/configure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      status.textContent = `Error: ${err}`;
      status.style.color = "red";
      return;
    }

    const data = await res.json();
    status.textContent = data.message || "Configuration created successfully.";
    status.style.color = "#007C89";
  } catch (err) {
    status.textContent = "Network error.";
    status.style.color = "red";
  }
});
