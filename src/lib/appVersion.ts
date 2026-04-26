import pkg from "../../package.json";

/**
 * Current frontend release. Read once at module load from package.json so the
 * value the UI shows always matches what shipped — manual constants drift.
 */
export const APP_VERSION: string = pkg.version;

const REPO_RELEASES_URL =
  "https://github.com/SergiCoder/saasmint-app/releases/tag";

/**
 * GitHub releases-tag URL for a given semver. If the tag doesn't exist yet
 * (e.g. forkers on a fresh checkout), GitHub redirects to the releases
 * listing automatically — the link is still useful.
 */
export function getReleaseUrl(version: string): string {
  return `${REPO_RELEASES_URL}/v${version}`;
}
