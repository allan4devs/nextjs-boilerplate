/**
 * Shared feature flag with no server-only imports, safe for browser and route handlers.
 * Facial recognition remains opt-in while the feature is being rebuilt.
 */
export const FACE_RECOGNITION_ENABLED =
  process.env.NEXT_PUBLIC_FACE_RECOGNITION === "1";
