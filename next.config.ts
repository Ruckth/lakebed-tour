import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  async headers() {
    const cacheHeaders = [
      {
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable",
      },
    ];

    return [
      {
        source: "/videos/:path*",
        headers: cacheHeaders,
      },
      {
        source: "/fonts/:path*",
        headers: cacheHeaders,
      },
      {
        source: "/contact/:path*",
        headers: cacheHeaders,
      },
      {
        source: "/:path*\\.(png|jpg|jpeg|webp|avif|gif|svg|ico|mp4|woff2|ttf|otf)",
        headers: cacheHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/garden-image.jpg",
        destination: "/garden-image.webp",
        permanent: true,
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
