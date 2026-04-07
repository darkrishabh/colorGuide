export const uiHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>colorGuide Test Console</title>
    <style>
      :root {
        --bg: #0f172a;
        --panel: #111827;
        --panel-2: #1f2937;
        --text: #e5e7eb;
        --muted: #9ca3af;
        --accent: #22c55e;
        --error: #ef4444;
        --border: #334155;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 24px;
        background: radial-gradient(1200px 700px at 0% 0%, #1e293b 0%, var(--bg) 45%);
        color: var(--text);
        font-family: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
      }
      .container {
        width: min(1100px, 100%);
        margin: 0 auto;
        display: grid;
        gap: 16px;
      }
      .card {
        background: linear-gradient(180deg, rgba(31, 41, 55, 0.95), rgba(17, 24, 39, 0.97));
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 16px;
      }
      .title { font-size: 24px; margin: 0 0 6px; }
      .subtitle { margin: 0; color: var(--muted); font-size: 14px; }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
      }
      label {
        display: block;
        font-size: 12px;
        color: var(--muted);
        margin-bottom: 6px;
      }
      input, select, button {
        width: 100%;
        border-radius: 10px;
        border: 1px solid var(--border);
        background: var(--panel-2);
        color: var(--text);
        font-size: 14px;
        padding: 10px 12px;
      }
      button {
        cursor: pointer;
        background: linear-gradient(180deg, #16a34a, #15803d);
        border-color: #166534;
        font-weight: 600;
      }
      button:disabled { opacity: 0.65; cursor: not-allowed; }
      .meta {
        display: flex;
        gap: 14px;
        flex-wrap: wrap;
        font-size: 13px;
      }
      .meta strong { color: #fff; }
      .ok { color: var(--accent); }
      .bad { color: var(--error); }
      pre {
        margin: 0;
        background: #020617;
        border: 1px solid #1e293b;
        border-radius: 10px;
        padding: 14px;
        overflow: auto;
        font-size: 12px;
        line-height: 1.5;
      }
      .error {
        color: #fecaca;
        background: rgba(127, 29, 29, 0.45);
        border: 1px solid #7f1d1d;
        border-radius: 10px;
        padding: 10px 12px;
        font-size: 13px;
      }
      .screenshot {
        width: 100%;
        border: 1px solid var(--border);
        border-radius: 10px;
        display: none;
      }
      .visible { display: block; }
      .row { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: end; }
      @media (max-width: 700px) { .row { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <div class="container">
      <section class="card">
        <h1 class="title">colorGuide Test Console</h1>
        <p class="subtitle">Validate endpoints, response shape, latency, and screenshots from one UI.</p>
      </section>

      <section class="card">
        <div class="grid">
          <div>
            <label for="preset">Preset</label>
            <select id="preset">
              <option value="">custom</option>
              <option value="gigaqr.com">gigaqr.com</option>
              <option value="stripe.com">stripe.com</option>
              <option value="github.com">github.com</option>
              <option value="claude.ai">claude.ai</option>
            </select>
          </div>
          <div>
            <label for="endpoint">Endpoint</label>
            <select id="endpoint">
              <option value="extract">/extract</option>
              <option value="scrape">/scrape</option>
              <option value="sitemap">/sitemap</option>
              <option value="context">/context</option>
              <option value="screenshot">/screenshot</option>
              <option value="health">/health</option>
            </select>
          </div>
          <div>
            <label for="url">url</label>
            <input id="url" placeholder="https://example.com" />
          </div>
          <div>
            <label for="domain">domain</label>
            <input id="domain" placeholder="example.com" />
          </div>
          <div>
            <label for="format">format (scrape)</label>
            <select id="format">
              <option value="">auto</option>
              <option value="text">text</option>
              <option value="html">html</option>
            </select>
          </div>
        </div>
        <div class="row" style="margin-top:12px;">
          <div id="validation" class="subtitle">Provide either <strong>url</strong> or <strong>domain</strong>.</div>
          <button id="runBtn">Run Request</button>
        </div>
      </section>

      <section class="card">
        <div class="meta">
          <div>Status: <strong id="status">-</strong></div>
          <div>Latency: <strong id="latency">-</strong></div>
          <div>Bytes: <strong id="bytes">-</strong></div>
          <div>Request: <strong id="requestPath">-</strong></div>
        </div>
      </section>

      <section class="card">
        <div id="errorBox" class="error" style="display:none;"></div>
        <img id="shot" class="screenshot" alt="Screenshot response" />
        <pre id="output">{}</pre>
      </section>
    </div>

    <script>
      const endpointEl = document.getElementById("endpoint");
      const presetEl = document.getElementById("preset");
      const urlEl = document.getElementById("url");
      const domainEl = document.getElementById("domain");
      const formatEl = document.getElementById("format");
      const runBtn = document.getElementById("runBtn");
      const validationEl = document.getElementById("validation");
      const statusEl = document.getElementById("status");
      const latencyEl = document.getElementById("latency");
      const bytesEl = document.getElementById("bytes");
      const requestPathEl = document.getElementById("requestPath");
      const outputEl = document.getElementById("output");
      const errorBoxEl = document.getElementById("errorBox");
      const shotEl = document.getElementById("shot");

      function updateValidation() {
        const endpoint = endpointEl.value;
        const requiresTarget = endpoint !== "health";
        const hasTarget = Boolean(urlEl.value.trim() || domainEl.value.trim());
        const valid = !requiresTarget || hasTarget;
        runBtn.disabled = !valid;
        validationEl.innerHTML = valid
          ? '<span class="ok">Input valid.</span>'
          : 'Provide either <strong>url</strong> or <strong>domain</strong>.';
      }

      function buildPath() {
        const endpoint = endpointEl.value;
        const params = new URLSearchParams();
        const url = urlEl.value.trim();
        const domain = domainEl.value.trim();
        const format = formatEl.value.trim();
        if (url) params.set("url", url);
        if (domain) params.set("domain", domain);
        if (endpoint === "scrape" && format) params.set("format", format);
        const query = params.toString();
        return "/" + endpoint + (query ? "?" + query : "");
      }

      function setMeta(status, latency, bytes, path) {
        statusEl.textContent = status;
        statusEl.className = /^2/.test(status) ? "ok" : "bad";
        latencyEl.textContent = latency;
        bytesEl.textContent = bytes;
        requestPathEl.textContent = path;
      }

      function resetOutput() {
        errorBoxEl.style.display = "none";
        errorBoxEl.textContent = "";
        shotEl.classList.remove("visible");
        shotEl.removeAttribute("src");
        outputEl.style.display = "block";
      }

      async function runRequest() {
        const path = buildPath();
        resetOutput();
        setMeta("...", "...", "...", path);
        runBtn.disabled = true;

        const started = performance.now();
        try {
          const res = await fetch(path);
          const elapsed = (performance.now() - started).toFixed(0) + "ms";
          const contentType = res.headers.get("content-type") || "";

          if (contentType.includes("image/png")) {
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            shotEl.src = objectUrl;
            shotEl.classList.add("visible");
            outputEl.style.display = "none";
            setMeta(String(res.status), elapsed, String(blob.size), path);
            return;
          }

          const text = await res.text();
          setMeta(String(res.status), elapsed, String(text.length), path);

          try {
            const json = JSON.parse(text);
            outputEl.textContent = JSON.stringify(json, null, 2);
          } catch {
            outputEl.textContent = text;
          }

          if (!res.ok) {
            errorBoxEl.style.display = "block";
            errorBoxEl.textContent = "Request failed with status " + res.status;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          setMeta("ERR", "-", "-", path);
          errorBoxEl.style.display = "block";
          errorBoxEl.textContent = "Network error: " + message;
          outputEl.textContent = "{}";
        } finally {
          updateValidation();
        }
      }

      presetEl.addEventListener("input", () => {
        const value = presetEl.value.trim();
        if (value) {
          domainEl.value = value;
          if (!urlEl.value.trim()) {
            urlEl.value = "";
          }
        }
        updateValidation();
      });

      [endpointEl, urlEl, domainEl, formatEl].forEach((el) => el.addEventListener("input", updateValidation));
      runBtn.addEventListener("click", runRequest);
      updateValidation();
    </script>
  </body>
</html>`;
