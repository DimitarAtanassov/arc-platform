/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Scope build-trace/workspace-root inference to this project; the repo has
  // both a Python root and this frontend, and unrelated lockfiles may exist
  // higher up the tree.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
