import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Clerk Middleware
//
// Public routes: /login, /signup, /forgot-password (and their sub-paths)
// Everything else is protected. Unauthenticated requests are redirected to /login
// (configured via NEXT_PUBLIC_CLERK_SIGN_IN_URL in .env.local).
// ─────────────────────────────────────────────────────────────────────────────

const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/signup(.*)",
  "/forgot-password(.*)",
  "/sso-callback(.*)",
]);

const defaultMiddleware = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export default async function proxy(req: any, event: any) {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === "true") {
    return;
  }
  return defaultMiddleware(req, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
