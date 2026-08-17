import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The only next/image usages are two static logo files — no benefit
    // from on-the-fly resizing, and it drags Next's server-side image
    // optimizer (sharp's native binaries, ~18MB) into every serverless
    // function bundle, which is the single biggest driver of cold-start
    // latency on Netlify.
    unoptimized: true,
  },
  // unoptimized:true means the image-optimizer code path is dead, but
  // Next's dependency tracer still statically includes sharp's native
  // binaries in the bundle it hands to the host. Exclude them explicitly.
  outputFileTracingExcludes: {
    "*": ["node_modules/sharp/**", "node_modules/@img/**"],
  },
};

export default nextConfig;
