import { PageSkeleton } from "@/components/skeletons/page-skeleton";

/**
 * Global Suspense fallback.
 * Automatically displayed by Next.js while page segments are loading.
 */
export default function Loading() {
  return <PageSkeleton />;
}
