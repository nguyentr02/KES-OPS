import { fileURLToPath } from "url";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Univer (the Bảng tính spreadsheet) manages its own React root and canvas;
  // StrictMode's dev mount→unmount→remount double-invoke races its disposal.
  // Univer recommends disabling Strict Mode when embedding it.
  reactStrictMode: false,
  // Standalone app — its own repo + Vercel project, served at the domain root.
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
};

export default nextConfig;
