import type { NextConfig } from "next";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Proxy auth + user routes to the backend; /api/clients/* is handled locally
      { source: "/api/auth/:path*",    destination: `${BACKEND}/api/auth/:path*`    },
      { source: "/api/users/:path*",   destination: `${BACKEND}/api/users/:path*`   },
      { source: "/api/projects/:path*",destination: `${BACKEND}/api/projects/:path*`},
      { source: "/api/leads/:path*",   destination: `${BACKEND}/api/leads/:path*`   },
      { source: "/api/invoices/:path*",destination: `${BACKEND}/api/invoices/:path*`},
      { source: "/api/receipts/:path*",destination: `${BACKEND}/api/receipts/:path*`},
      { source: "/api/quotes/:path*",  destination: `${BACKEND}/api/quotes/:path*`  },
    ];
  },
};

export default nextConfig;
