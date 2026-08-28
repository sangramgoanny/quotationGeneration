import type { NextConfig } from "next";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Proxy auth + user routes to the backend; /api/clients/* is handled locally
      { source: "/api/users/:path*",   destination: `${BACKEND}/api/users/:path*`   },
      { source: "/api/rbac/:path*", destination: `${BACKEND}/api/rbac/:path*` },
      { source: "/api/roles/:path*", destination: `${BACKEND}/api/roles/:path*` },
      { source: "/api/teams/:path*", destination: `${BACKEND}/api/teams/:path*` },
      { source: "/api/departments/:path*", destination: `${BACKEND}/api/departments/:path*` },
      { source: "/api/user-access/:path*", destination: `${BACKEND}/api/user-access/:path*` },
      { source: "/api/audit-logs", destination: `${BACKEND}/api/audit-logs` },
      { source: "/api/projects/:path*",destination: `${BACKEND}/api/projects/:path*`},
      { source: "/api/leads/:path*",   destination: `${BACKEND}/api/leads/:path*`   },
      { source: "/api/invoices/:path*",destination: `${BACKEND}/api/invoices/:path*`},
      { source: "/api/receipts/:path*",destination: `${BACKEND}/api/receipts/:path*`},
      { source: "/api/quotes/:path*",  destination: `${BACKEND}/api/quotes/:path*`  },
    ];
  },
};

export default nextConfig;
