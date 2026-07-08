// Empty string = same origin (Next.js API routes).
// Set NEXT_PUBLIC_API_URL to point at an external backend when needed.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
