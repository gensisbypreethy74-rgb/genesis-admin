import type { NextConfig } from "next";

// NEXT_PUBLIC_ values are baked into the browser bundle at build time, so a
// missing or wrong one can't be corrected later: refuse to start or build
// instead of shipping an admin that silently calls localhost (or nothing).
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
if (!backendUrl) {
  throw new Error(
    "NEXT_PUBLIC_BACKEND_URL must be set: the backend origin plus /api, e.g. http://localhost:5000/api locally or the Render URL on Vercel."
  );
}
let backendOrigin: URL;
try {
  backendOrigin = new URL(backendUrl);
} catch {
  throw new Error("NEXT_PUBLIC_BACKEND_URL is not a valid absolute URL.");
}
if (!/^https?:$/.test(backendOrigin.protocol)) {
  throw new Error("NEXT_PUBLIC_BACKEND_URL must start with http:// or https://.");
}
// Every Vercel build (production or preview) is public: it must reach the real backend.
if (process.env.VERCEL && (backendOrigin.protocol !== "https:" || /^(localhost|127\.0\.0\.1)$/.test(backendOrigin.hostname))) {
  throw new Error(`NEXT_PUBLIC_BACKEND_URL must be the public https backend on Vercel, not ${backendOrigin.origin}.`);
}

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
