import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
const apiHostname = apiUrl ? new URL(apiUrl).hostname : "";

const apiProtocol = apiUrl
  ? (new URL(apiUrl).protocol.replace(":", "") as "http" | "https")
  : "https";

const isDev = process.env.NODE_ENV === "development";

const config: NextConfig = {
  images: {
    remotePatterns: apiHostname
      ? [{ protocol: apiProtocol, hostname: apiHostname }]
      : [],
    ...(isDev && { dangerouslyAllowLocalIP: true }),
  },
};

export default withNextIntl(config);
