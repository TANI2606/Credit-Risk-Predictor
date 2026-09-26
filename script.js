(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============================================================
     AMBIENT BACKGROUND
     ============================================================ */
  const canvas = document.getElementById("bg-canvas");
  const ctx = canvas.getContext("2d");
  let dots = [];
  let w, h;

  function resizeCanvas() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    const spacing = 46;
    dots = [];
    for (let x = spacing / 2; x < w; x += spacing) {
      for (let y = spacing / 2; y < h; y += spacing) {
        dots.push({
          x, y,
          baseX: x, baseY: y,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 0.5,
        });
      }
    }
  }

  function drawBackground(t) {
    ctx.clearRect(0, 0, w, h);
    for (const d of dots) {
      const drift = reduceMotion ? 0 : Math.sin(t * 0.0004 * d.speed + d.phase) * 3;
      const yy = d.baseY + drift;
      const twinkle = reduceMotion ? 0.14 : 0.09 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.0006 * d.speed + d.phase));
      ctx.beginPath();
      ctx.arc(d.x, yy, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(76,141,255,${twinkle})`;
      ctx.fill();
    }
    if (!reduceMotion) requestAnimationFrame(drawBackground);
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  requestAnimationFrame(drawBackground);
  if (reduceMotion) drawBackground(0);

  /* ============================================================
     CONFIG DRAWER
     ============================================================ */
  const configBtn = document.getElementById("configBtn");
  const configDrawer = document.getElementById("configDrawer");
  const apiBaseInput = document.getElementById("apiBase");
  const pingBtn = document.getElementById("pingBtn");

  const savedBase = localStorage.getItem("creditRiskApiBase");
  if (savedBase) apiBaseInput.value = savedBase;

  configBtn.addEventListener("click", () => {
    configDrawer.classList.toggle("open");
    configBtn.classList.add("spin");
    setTimeout(() => configBtn.classList.remove("spin"), 600);
  });

  apiBaseInput.addEventListener("change", () => {
    localStorage.setItem("creditRiskApiBase", apiBaseInput.value.trim());
  });

  function apiBase() {
    return (apiBaseInput.value || "http://127.0.0.1:8000").trim().replace(/\/+$/, "");
  }

  /* ============================================================
     HEALTH CHECK
     ============================================================ */
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");

  async function checkHealth() {
    statusDot.className = "status-dot pending";
    statusText.textContent = "checking model…";
    try {
      const res = await fetch(`${apiBase()}/health`, { method: "GET" });
      if (!res.ok) throw new Error("bad status");
      const data = await res.json();
      if (data.model_loaded) {
        statusDot.className = "status-dot online";
        statusText.textContent = `online (thr: ${(data.threshold * 100).toFixed(1)}%)`;
      } else {
        statusDot.className = "status-dot offline";
        statusText.textContent = "model not ready";
      }
    } catch (err) {
      statusDot.className = "status-dot offline";
      statusText.textContent = "API unreachable";
    }
  }

  pingBtn.addEventListener("click", checkHealth);
  checkHealth();

  /* ============================================================
     AUTO-CALCULATE LOAN PERCENT INCOME
     ============================================================ */
  const incomeInput = document.getElementById("person_income");
  const loanAmntInput = document.getElementById("loan_amnt");
  const loanPercentInput = document.getElementById("loan_percent_income");

  function autoComputePercent() {
    const income = parseFloat(incomeInput.value);
    const loan = parseFloat(loanAmntInput.value);
    if (!isNaN(income) && income > 0 && !isNaN(loan)) {
      const pct = (loan / income) * 100;
      loanPercentInput.value = Math.min(100, Math.max(0, pct)).toFixed(1);
    }
  }

  incomeInput.addEventListener("input", autoComputePercent);
  loanAmntInput.addEventListener("input", autoComputePercent);

  /* ============================================================
     GAUGE
     ============================================================ */
  const ticksGroup = document.getElementById("ticks");
  const CENTER = { x: 120, y: 130 };
  const R_OUT = 100;

  function tickPoint(t, rInner, rOuter) {
    const angle = 180 - t * 180; 
    const rad = (angle * Math.PI) / 180;
    const p1 = { x: CENTER.x + rInner * Math.cos(rad), y: CENTER.y - rInner * Math.sin(rad) };
    const p2 = { x: CENTER.x + rOuter * Math.cos(rad), y: CENTER.y - rOuter * Math.sin(rad) };
    return { p1, p2 };
  }

  [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
    const { p1, p2 } = tickPoint(t, 84, 100);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", p1.x.toFixed(2));
    line.setAttribute("y1", p1.y.toFixed(2));
    line.setAttribute("x2", p2.x.toFixed(2));
    line.setAttribute("y2", p2.y.toFixed(2));
    line.setAttribute("class", "tick");
    ticksGroup.appendChild(line);
  });

  const needle = document.getElementById("needle");
  const gaugeArc = document.querySelector(".gauge-arc");
  const gaugeValue = document.getElementById("gaugeValue");

  const ARC_LENGTH = Math.PI * R_OUT; 
  gaugeArc.style.strokeDasharray = ARC_LENGTH.toFixed(2);
  gaugeArc.style.strokeDashoffset = ARC_LENGTH.toFixed(2);

  function setGauge(probability) {
    const clamped = Math.max(0, Math.min(1, probability));
    const needleAngle = -90 + clamped * 180; 
    needle.style.transform = `rotate(${needleAngle}deg)`;
    gaugeArc.style.strokeDashoffset = (ARC_LENGTH * (1 - clamped)).toFixed(2);

    const start = performance.now();
    const from = parseFloat(gaugeValue.dataset.current || "0");
    const to = clamped * 100;
    const duration = reduceMotion ? 1 : 900;

    function step(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = from + (to - from) * eased;
      gaugeValue.textContent = `${val.toFixed(1)}%`;
      if (p < 1) requestAnimationFrame(step);
      else gaugeValue.dataset.current = to.toString();
    }
    requestAnimationFrame(step);
  }

  /* ============================================================
     FORM SUBMISSION
     ============================================================ */
  const form = document.getElementById("riskForm");
  const runBtn = document.getElementById("runBtn");
  const formError = document.getElementById("formError");
  const scanline = document.getElementById("scanline");

  const resultEmpty = document.getElementById("resultEmpty");
  const resultLive = document.getElementById("resultLive");
  const resultErrorBox = document.getElementById("resultErrorBox");
  const resultErrorText = document.getElementById("resultErrorText");

  const verdictBadge = document.getElementById("verdictBadge");
  const verdictText = document.getElementById("verdictText");
  const metaScore = document.getElementById("metaScore");
  const metaThreshold = document.getElementById("metaThreshold");
  const metaClass = document.getElementById("metaClass");

  function buildPayload() {
    const fd = new FormData(form);
    return {
      person_age: parseFloat(fd.get("person_age")),
      person_income: parseFloat(fd.get("person_income")),
      person_home_ownership: fd.get("person_home_ownership"),
      person_emp_length: parseFloat(fd.get("person_emp_length")),
      loan_intent: fd.get("loan_intent"),
      loan_grade: fd.get("loan_grade"),
      loan_amnt: parseFloat(fd.get("loan_amnt")),
      loan_int_rate: parseFloat(fd.get("loan_int_rate")),
      loan_percent_income: parseFloat(fd.get("loan_percent_income")) / 100,
      cb_person_default_on_file: fd.get("cb_person_default_on_file"),
      cb_person_cred_hist_length: parseFloat(fd.get("cb_person_cred_hist_length")),
    };
  }

  function paintVerdict(prediction, probability, threshold) {
    let tier = "safe";
    let label = "Low risk";
    let sub = "Profile is consistent with on-time repayment.";

    if (prediction === 1) {
      if (probability >= threshold + 0.15) {
        tier = "danger";
        label = "High risk";
        sub = `Probability exceeds decision threshold (${(threshold * 100).toFixed(1)}%). Recommend decline.`;
      } else {
        tier = "warn";
        label = "Elevated risk";
        sub = `Profile flagged near threshold (${(threshold * 100).toFixed(1)}%). Recommend manual underwriting.`;
      }
    } else {
      if (probability >= threshold - 0.08) {
        tier = "warn";
        label = "Borderline pass";
        sub = `Passes threshold (${(threshold * 100).toFixed(1)}%), but margins are tight.`;
      }
    }

    verdictBadge.className = `verdict-badge ${tier}`;
    verdictBadge.textContent = label;
    verdictText.textContent = sub;
    metaScore.textContent = `${(probability * 100).toFixed(2)}%`;
    if (metaThreshold) metaThreshold.textContent = `${(threshold * 100).toFixed(2)}%`;
    metaClass.textContent = prediction === 1 ? "1 · Default" : "0 · Repaid";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    formError.textContent = "";
    resultErrorBox.classList.remove("show");

    runBtn.classList.add("loading");
    runBtn.disabled = true;
    scanline.classList.add("active");

    const payload = buildPayload();
    const minWait = new Promise((r) => setTimeout(r, 650));

    try {
      const [res] = await Promise.all([
        fetch(`${apiBase()}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
        minWait,
      ]);

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `Request failed (${res.status})`);
      }

      const data = await res.json();

      resultEmpty.style.display = "none";
      resultLive.classList.remove("show");
      void resultLive.offsetWidth;
      resultLive.classList.add("show");

      setGauge(data.probability_default);
      paintVerdict(data.prediction, data.probability_default, data.threshold || 0.50);

    } catch (err) {
      resultErrorText.textContent =
        err.message === "Failed to fetch"
          ? `Couldn't reach the API at ${apiBase()}. Check the URL in settings and make sure the server is running.`
          : err.message;
      resultEmpty.style.display = "none";
      resultLive.classList.remove("show");
      resultErrorBox.classList.add("show");
    } finally {
      runBtn.classList.remove("loading");
      runBtn.disabled = false;
      scanline.classList.remove("active");
    }
  });

})();