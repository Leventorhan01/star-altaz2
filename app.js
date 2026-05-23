// Star-based Navigation — Altitude and Azimuth Calculator
// Author: Levent Orhan
// Units:
//   RA: hours
//   Dec, latitude, longitude, hour angle, altitude, azimuth: degrees

const stars = [
  { name: "Sirius (α CMa)", ra: 6.752477, dec: -16.716116 },
  { name: "Canopus (α Car)", ra: 6.399203, dec: -52.695661 },
  { name: "Rigil Kentaurus (α Cen)", ra: 14.660139, dec: -60.833992 },
  { name: "Arcturus (α Boo)", ra: 14.261020, dec: 19.182410 },
  { name: "Vega (α Lyr)", ra: 18.615649, dec: 38.783689 },
  { name: "Capella (α Aur)", ra: 5.278155, dec: 45.998028 },
  { name: "Rigel (β Ori)", ra: 5.242298, dec: -8.201640 },
  { name: "Procyon (α CMi)", ra: 7.655033, dec: 5.225000 },
  { name: "Betelgeuse (α Ori)", ra: 5.919529, dec: 7.407064 },
  { name: "Polaris (α UMi)", ra: 2.530301, dec: 89.264109 }
];

let latestResults = [];

const $ = (id) => document.getElementById(id);

function toRad(degrees) {
  return degrees * Math.PI / 180;
}

function toDeg(radians) {
  return radians * 180 / Math.PI;
}

function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

function normalizeHours(hours) {
  return ((hours % 24) + 24) % 24;
}

function normalizeHourAngle(hours) {
  let normalized = hours;
  if (normalized > 12) normalized -= 24;
  if (normalized < -12) normalized += 24;
  return normalized;
}

function formatNumber(value, decimals = 3) {
  return Number.isFinite(value) ? value.toFixed(decimals) : "-";
}

function formatHours(hours) {
  const normalized = normalizeHours(hours);
  const h = Math.floor(normalized);
  const minFloat = (normalized - h) * 60;
  const m = Math.floor(minFloat);
  const s = (minFloat - m) * 60;
  return `${h}h ${m}m ${s.toFixed(1)}s`;
}

function setCurrentUTCDateTime() {
  const now = new Date();
  now.setUTCSeconds(0, 0);
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const min = String(now.getUTCMinutes()).padStart(2, "0");

  $("datetime").value = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function parseUTCDateTime(value) {
  if (!value) return null;

  // datetime-local has no timezone. In this project, the entered value is accepted as UTC.
  const isoValue = value.length === 16 ? `${value}:00Z` : `${value}Z`;
  const date = new Date(isoValue);

  return Number.isNaN(date.getTime()) ? null : date;
}

function julianDate(date) {
  let year = date.getUTCFullYear();
  let month = date.getUTCMonth() + 1;

  const day =
    date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400 +
    date.getUTCMilliseconds() / 86400000;

  if (month <= 2) {
    year -= 1;
    month += 12;
  }

  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);

  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    B -
    1524.5
  );
}

function gmstFromJulianDate(jd) {
  const T = (jd - 2451545.0) / 36525.0;

  const gmstDegrees =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0;

  return normalizeDegrees(gmstDegrees) / 15.0;
}

function bennettRefraction(altitudeDeg) {
  // Bennett approximation. The result is in degrees.
  // It is mainly meaningful near the horizon and for apparent altitude estimation.
  if (altitudeDeg <= -2) return 0;

  const correctionArcMin =
    1.02 / Math.tan(toRad(altitudeDeg + 10.3 / (altitudeDeg + 5.11)));

  return correctionArcMin / 60.0;
}

function visibilityStatus(altitudeDeg) {
  if (altitudeDeg < 0) {
    return {
      label: "Not Observable",
      detail: "Below horizon",
      className: "not-observable"
    };
  }

  if (altitudeDeg < 10) {
    return {
      label: "Near Horizon",
      detail: "Low altitude",
      className: "near-horizon"
    };
  }

  return {
    label: "Observable",
    detail: "Good altitude",
    className: "observable"
  };
}

function computeStarPosition(latitudeDeg, longitudeDeg, date, star, applyRefraction) {
  const jd = julianDate(date);
  const gmst = gmstFromJulianDate(jd);
  const lst = normalizeHours(gmst + longitudeDeg / 15.0);

  const hourAngleHours = normalizeHourAngle(lst - star.ra);
  const hourAngleDeg = hourAngleHours * 15.0;

  const phi = toRad(latitudeDeg);
  const delta = toRad(star.dec);
  const H = toRad(hourAngleDeg);

  const sinAltitude =
    Math.sin(phi) * Math.sin(delta) +
    Math.cos(phi) * Math.cos(delta) * Math.cos(H);

  let altitudeDeg = toDeg(Math.asin(Math.max(-1, Math.min(1, sinAltitude))));

  if (applyRefraction) {
    altitudeDeg += bennettRefraction(altitudeDeg);
  }

  // Azimuth measured clockwise from true north:
  // 0° = North, 90° = East, 180° = South, 270° = West
  const altitudeRad = toRad(altitudeDeg);
  const cosAltitude = Math.cos(altitudeRad);

  let azimuthDeg;
  if (Math.abs(cosAltitude) < 1e-12) {
    azimuthDeg = 0;
  } else {
    const sinAzimuth = -Math.cos(delta) * Math.sin(H) / cosAltitude;
    const cosAzimuth =
      (Math.sin(delta) - Math.sin(altitudeRad) * Math.sin(phi)) /
      (cosAltitude * Math.cos(phi));

    azimuthDeg = normalizeDegrees(
      toDeg(Math.atan2(sinAzimuth, cosAzimuth))
    );
  }

  const visibility = visibilityStatus(altitudeDeg);

  return {
    star: star.name,
    ra: star.ra,
    dec: star.dec,
    jd,
    gmst,
    lst,
    hourAngleDeg,
    altitudeDeg,
    azimuthDeg,
    visibility
  };
}

function validateInputs(latitude, longitude, date) {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return "Latitude must be a number between -90 and +90 degrees.";
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return "Longitude must be a number between -180 and +180 degrees.";
  }

  if (!date) {
    return "Please enter a valid UTC date and time.";
  }

  return "";
}

function renderSummary(results) {
  const first = results[0];
  const observableCount = results.filter((r) => r.altitudeDeg >= 10).length;

  $("jdValue").textContent = formatNumber(first.jd, 5);
  $("gmstValue").textContent = formatHours(first.gmst);
  $("lstValue").textContent = formatHours(first.lst);
  $("visibleCount").textContent = `${observableCount} / ${results.length}`;

  $("summarySection").hidden = false;
}

function renderResults(results, latitude, longitude, date) {
  const body = $("resultsBody");
  body.innerHTML = "";

  results.forEach((result) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><strong>${result.star}</strong></td>
      <td>${formatNumber(result.ra, 4)} h</td>
      <td>${formatNumber(result.dec, 4)}°</td>
      <td>${formatNumber(result.hourAngleDeg, 3)}°</td>
      <td>${formatNumber(result.altitudeDeg, 3)}°</td>
      <td>${formatNumber(result.azimuthDeg, 3)}°</td>
      <td>
        <span class="badge ${result.visibility.className}">
          ${result.visibility.label}
        </span>
        <span class="muted"> ${result.visibility.detail}</span>
      </td>
    `;

    body.appendChild(row);
  });

  $("calculationInfo").textContent =
    `Latitude: ${formatNumber(latitude, 4)}°, Longitude: ${formatNumber(longitude, 4)}°, UTC: ${date.toISOString().replace(".000Z", "Z")}`;

  $("resultsSection").hidden = false;
  $("exportBtn").disabled = results.length === 0;
}

function calculate() {
  const latitude = parseFloat($("latitude").value);
  const longitude = parseFloat($("longitude").value);
  const date = parseUTCDateTime($("datetime").value);
  const applyRefraction = $("refraction").checked;
  const filter = $("starFilter").value;

  const error = validateInputs(latitude, longitude, date);
  $("errorBox").hidden = !error;
  $("errorBox").textContent = error;

  if (error) {
    $("summarySection").hidden = true;
    $("resultsSection").hidden = true;
    $("exportBtn").disabled = true;
    latestResults = [];
    return;
  }

  let selectedStars = filter === "top5" ? stars.slice(0, 5) : stars;

  let results = selectedStars.map((star) =>
    computeStarPosition(latitude, longitude, date, star, applyRefraction)
  );

  if (filter === "visible") {
    results = results.filter((result) => result.altitudeDeg >= 10);
  }

  latestResults = results;
  renderSummary(results.length ? results : selectedStars.map((star) =>
    computeStarPosition(latitude, longitude, date, star, applyRefraction)
  ));
  renderResults(results, latitude, longitude, date);
}

function exportCSV() {
  if (!latestResults.length) return;

  const header = [
    "Star",
    "RA_hours",
    "Dec_degrees",
    "Hour_Angle_degrees",
    "Altitude_degrees",
    "Azimuth_degrees",
    "Visibility"
  ];

  const rows = latestResults.map((r) => [
    r.star,
    formatNumber(r.ra, 6),
    formatNumber(r.dec, 6),
    formatNumber(r.hourAngleDeg, 6),
    formatNumber(r.altitudeDeg, 6),
    formatNumber(r.azimuthDeg, 6),
    `${r.visibility.label} - ${r.visibility.detail}`
  ]);

  const csvContent = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "star_altaz_results.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", () => {
  setCurrentUTCDateTime();

  $("calculateBtn").addEventListener("click", calculate);
  $("nowBtn").addEventListener("click", () => {
    setCurrentUTCDateTime();
    calculate();
  });
  $("exportBtn").addEventListener("click", exportCSV);

  ["latitude", "longitude", "datetime", "starFilter", "refraction"].forEach((id) => {
    $(id).addEventListener("change", calculate);
  });

  calculate();
});
