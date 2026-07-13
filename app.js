const $ = (id) => document.getElementById(id);
const num = (id) => parseFloat($(id).value) || 0;
const fmt = (value, digits = 1) => Number.isFinite(value) ? value.toFixed(digits) : "0.0";

function getGaugeInches(prefix) {
  const mode = $("gaugeMode").value;
  if (mode === "feet-inches") {
    return num(prefix + "Feet") * 12 + num(prefix + "Inches");
  }
  if (mode === "decimal-feet") {
    return num(prefix + "DecimalFeet") * 12;
  }
  return num(prefix + "TotalInches");
}

function calculateWellTest() {
  const start = getGaugeInches("start");
  const end = getGaugeInches("end");
  const change = end - start;
  const factor = num("tankFactor");
  const hours = num("testHours");
  const water = num("waterBbl");
  const gas = num("gasMcf");

  const oilProduced = Math.max(0, change * factor);
  const multiplier = hours > 0 ? 24 / hours : 0;
  const oilRate = oilProduced * multiplier;
  const waterRate = water * multiplier;
  const gasRate = gas * multiplier;
  const total = oilRate + waterRate;
  const waterCut = total > 0 ? waterRate / total * 100 : 0;
  const oilCut = total > 0 ? oilRate / total * 100 : 0;
  const gor = oilRate > 0 ? gasRate / oilRate : 0;

  $("gaugeChange").textContent = `${fmt(change, 2)} in`;
  $("oilProduced").textContent = `${fmt(oilProduced, 1)} bbl`;
  $("oilRate").textContent = `${fmt(oilRate, 1)} BOPD`;
  $("waterRate").textContent = `${fmt(waterRate, 1)} BWPD`;
  $("gasRate").textContent = `${fmt(gasRate, 1)} MCFD`;
  $("totalFluid").textContent = `${fmt(total, 1)} BFPD`;
  $("waterCut").textContent = `${fmt(waterCut, 2)}%`;
  $("oilCut").textContent = `${fmt(oilCut, 2)}%`;
  $("gor").textContent = `${fmt(gor, 2)} MCF/bbl`;

  localStorage.setItem("lot-settings", JSON.stringify({
    gaugeMode: $("gaugeMode").value,
    tankFactor: $("tankFactor").value,
    theme: document.body.classList.contains("dark") ? "dark" : "light"
  }));
}

function calculateEsp() {
  const tvd = num("pumpTvd");
  const pip = num("intakePressure");
  const gradient = num("fluidGradient");
  const above = gradient > 0 ? pip / gradient : 0;
  const level = tvd - above;
  $("fluidAbove").textContent = `${fmt(above, 0)} ft`;
  $("fluidLevel").textContent = `${fmt(level, 0)} ft TVD`;
}

function calculateConversions() {
  $("gallonsOutput").textContent = fmt(num("bblInput") * 42, 1);
  const gradient = num("psiGradient");
  const feet = gradient > 0 ? num("psiInput") / gradient : 0;
  $("feetFluidOutput").textContent = fmt(feet, 0);
}

function updateGaugeMode() {
  const mode = $("gaugeMode").value;
  $("feetInchesInputs").classList.toggle("hidden", mode !== "feet-inches");
  $("decimalFeetInputs").classList.toggle("hidden", mode !== "decimal-feet");
  $("inchInputs").classList.toggle("hidden", mode !== "inches");
  calculateWellTest();
}

document.querySelectorAll("input, select").forEach(el => {
  el.addEventListener("input", () => {
    calculateWellTest();
    calculateEsp();
    calculateConversions();
  });
});

$("gaugeMode").addEventListener("change", updateGaugeMode);

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    $(btn.dataset.tab).classList.add("active");
  });
});

$("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  $("themeToggle").textContent = document.body.classList.contains("dark") ? "🌙" : "☀️";
  calculateWellTest();
});

$("resetWellTest").addEventListener("click", () => {
  ["wellName","startFeet","startInches","endFeet","endInches","startDecimalFeet","endDecimalFeet",
   "startTotalInches","endTotalInches","waterBbl","gasMcf"].forEach(id => $(id).value = "");
  $("testHours").value = "24";
  calculateWellTest();
});

$("copyResults").addEventListener("click", async () => {
  const text = [
    $("wellName").value || "Well Test",
    `Gauge change: ${$("gaugeChange").textContent}`,
    `Oil produced: ${$("oilProduced").textContent}`,
    `Oil rate: ${$("oilRate").textContent}`,
    `Water rate: ${$("waterRate").textContent}`,
    `Gas rate: ${$("gasRate").textContent}`,
    `Total fluid: ${$("totalFluid").textContent}`,
    `Water cut: ${$("waterCut").textContent}`,
    `Oil cut: ${$("oilCut").textContent}`,
    `GOR: ${$("gor").textContent}`
  ].join("\n");
  try {
    await navigator.clipboard.writeText(text);
    $("copyStatus").textContent = "Results copied.";
  } catch {
    $("copyStatus").textContent = "Press and hold to copy is not available in this browser.";
  }
});

try {
  const saved = JSON.parse(localStorage.getItem("lot-settings") || "{}");
  if (saved.gaugeMode) $("gaugeMode").value = saved.gaugeMode;
  if (saved.tankFactor) $("tankFactor").value = saved.tankFactor;
  if (saved.theme === "dark") document.body.classList.add("dark");
} catch {}

$("themeToggle").textContent = document.body.classList.contains("dark") ? "🌙" : "☀️";
updateGaugeMode();
calculateWellTest();
calculateEsp();
calculateConversions();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js"));
}
