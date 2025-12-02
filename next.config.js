/** @type {import('next').NextConfig} */
const nextConfig = {
  // Moved from experimental.serverComponentsExternalPackages -> serverExternalPackages
  serverExternalPackages: ["pdfkit"],
};

module.exports = nextConfig;
