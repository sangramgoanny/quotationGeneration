import type { NextConfig } from "next";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  experimental: {
    // Next's dev server clones every request body (for middleware.ts) with a
    // default 10MB cap — base64 PDF attachments on the mail-send endpoints can
    // exceed that, so raise it to match the backend's own 15mb body limit.
    proxyClientMaxBodySize: "15mb",
  },
  async rewrites() {
    return {
      afterFiles: [
        // Proxy auth + user routes to the backend; /api/clients/* is handled locally
        { source: "/api/users/:path*",   destination: `${BACKEND}/api/users/:path*`   },
        { source: "/api/rbac/:path*", destination: `${BACKEND}/api/rbac/:path*` },
        { source: "/api/roles/:path*", destination: `${BACKEND}/api/roles/:path*` },
        { source: "/api/teams/:path*", destination: `${BACKEND}/api/teams/:path*` },
        { source: "/api/departments/:path*", destination: `${BACKEND}/api/departments/:path*` },
        { source: "/api/user-access/:path*", destination: `${BACKEND}/api/user-access/:path*` },
        { source: "/api/audit-logs", destination: `${BACKEND}/api/audit-logs` },
        { source: "/api/projects/:path*",destination: `${BACKEND}/api/projects/:path*`},
        { source: "/api/invoices/:path*",destination: `${BACKEND}/api/invoices/:path*`},
        { source: "/api/receipts/:path*",destination: `${BACKEND}/api/receipts/:path*`},
        { source: "/api/quotes/:path*",  destination: `${BACKEND}/api/quotes/:path*`  },
      ],
      // /api/leads/:path* runs as a fallback (checked after our own dynamic
      // app/api/leads/[id]/* route handlers) so those routes - including the
      // documents endpoints, which are handled locally with S3 - actually run
      // instead of being shadowed by this catch-all proxy.
      fallback: [
        { source: "/api/leads/:path*", destination: `${BACKEND}/api/leads/:path*` },
      ],
    };
  },
};

export default nextConfig;
