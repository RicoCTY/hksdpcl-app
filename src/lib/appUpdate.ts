import packageJson from "../../package.json";

const RELEASES_API =
  "https://api.github.com/repos/RicoCTY/hksdpcl-app/releases/latest";
const RELEASES_PAGE =
  "https://github.com/RicoCTY/hksdpcl-app/releases/latest";

export interface AppUpdateInfo {
  version: string;
  url: string;
}

function normalizeVersion(value: string) {
  return value.trim().replace(/^v/i, "");
}

function compareVersions(left: string, right: string) {
  const a = normalizeVersion(left).split(".").map((part) => Number(part) || 0);
  const b = normalizeVersion(right).split(".").map((part) => Number(part) || 0);
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function currentAppVersion() {
  return normalizeVersion(packageJson.version);
}

export async function checkAppUpdate(): Promise<AppUpdateInfo | null> {
  const current = currentAppVersion();

  const response = await fetch(RELEASES_API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("release lookup failed");

  const data = (await response.json()) as {
    tag_name?: unknown;
    html_url?: unknown;
  };
  const latest =
    typeof data.tag_name === "string" ? normalizeVersion(data.tag_name) : "";
  if (!latest || compareVersions(latest, current) <= 0) return null;

  return {
    version: latest,
    url: typeof data.html_url === "string" ? data.html_url : RELEASES_PAGE,
  };
}

export function openAppUpdate(update: AppUpdateInfo) {
  window.open(update.url, "_blank", "noopener,noreferrer");
}
