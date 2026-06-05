export function formatUtcTimestamp(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute} UTC`;
}

export function getEffectiveNow(override = "") {
  const now = new Date();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(override || "").trim())) {
    return now;
  }

  const [year, month, day] = override.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()));
}

export function getTodayKey(now, override = "") {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(override || "").trim())) {
    return override;
  }
  return now.toISOString().slice(0, 10);
}
