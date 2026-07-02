/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Emit a self-contained server bundle so the app ships as one small image.
  output: "standalone",
  // Scope build-trace/workspace-root inference to this project; the repo has
  // both a Python root and this frontend, and unrelated lockfiles may exist
  // higher up the tree.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
