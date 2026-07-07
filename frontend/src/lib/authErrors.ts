export const firebaseAuthErrorMessages: Record<string, string> = {
  "auth/email-already-in-use": "❌ This email is already registered. Please sign in instead.",
  "auth/wrong-password": "❌ Incorrect password.",
  "auth/user-not-found": "❌ No account found with this email.",
  "auth/invalid-email": "❌ Please enter a valid email address.",
  "auth/user-disabled": "❌ Your account has been disabled.",
  "auth/too-many-requests": "❌ Too many login attempts. Please try again later.",
  "auth/network-request-failed": "❌ Network error. Please check your internet connection.",
  "auth/popup-closed-by-user": "❌ Google Sign-In was cancelled.",
  "auth/popup-blocked": "❌ Please allow popups and try again.",
  "auth/unauthorized-domain": "❌ This domain is not authorized in Firebase Authentication.",
  "auth/invalid-credential": "❌ Google Sign-In failed. Please try again.",
  "auth/operation-not-allowed": "❌ Authentication method is not enabled. Please contact support.",
  "auth/internal-error": "❌ Google Sign-In failed. Please try again.",
  "auth/expired-action-code": "❌ The password reset link has expired. Please request a new one.",
  "auth/invalid-action-code": "❌ The verification link is invalid or expired.",
};

export function getFirebaseAuthErrorMessage(err: any, fallback = "❌ An authentication error occurred."): string {
  if (!err) {
    return fallback;
  }

  if (typeof err.code === "string" && firebaseAuthErrorMessages[err.code]) {
    return firebaseAuthErrorMessages[err.code];
  }

  if (typeof err.message === "string") {
    return err.message;
  }

  return fallback;
}
