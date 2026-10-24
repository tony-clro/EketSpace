/**
 * Translates Firebase Authentication error codes and runtime messages into
 * actionable, human-readable diagnostics with explicit configuration and environmental instructions.
 */
export interface FormattedAuthError {
  title: string;
  message: string;
  actionHint?: string;
  isIframeNotice?: boolean;
  canRedirect?: boolean;
}

export function formatAuthError(error: any): FormattedAuthError {
  if (!error) {
    return {
      title: 'Authentication Error',
      message: 'An unexpected authentication error occurred. Please try again.',
    };
  }

  const rawMessage: string = error?.message ? String(error.message) : String(error || '');
  let code: string = error?.code || '';

  // Extract auth/error-code from string or error message if not present on .code
  if (!code && rawMessage) {
    const codeMatch = rawMessage.match(/\(?auth\/([a-z0-9-]+)\)?/i);
    if (codeMatch) {
      code = `auth/${codeMatch[1].toLowerCase()}`;
    }
  }

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
  const isInIframe = typeof window !== 'undefined' ? window.self !== window.top : false;

  switch (code) {
    case 'auth/internal-error':
      return {
        title: 'Google Sign-In Environment Notice (auth/internal-error)',
        message: isInIframe
          ? `Firebase Authentication cannot complete the popup handshake inside an embedded preview iframe. Web browsers block third-party cookies, storage access, and cross-origin window messaging within sandboxed frames.`
          : `Firebase Authentication encountered an internal handshake error. This typically occurs when "${currentHostname}" is not registered in Firebase Authorized Domains, or when Google Sign-In is not initialized.`,
        actionHint: isInIframe
          ? `Click "Open in Direct Browser Tab" below to authenticate in a standalone window, or add "${currentHostname}" to Firebase Console > Authentication > Settings > Authorized domains.`
          : `Add "${currentHostname}" to Firebase Console > Authentication > Settings > Authorized domains and ensure Google provider is enabled under Sign-in method.`,
        isIframeNotice: isInIframe,
        canRedirect: true,
      };

    case 'auth/unauthorized-domain':
      return {
        title: 'Unauthorized Domain (auth/unauthorized-domain)',
        message: `The domain "${currentHostname}" is not yet registered in this Firebase project's Authorized Domains list.`,
        actionHint: `To authorize this domain, open Firebase Console > Project Settings / Authentication > Settings > Authorized domains, and click "Add domain" for "${currentHostname}".`,
        isIframeNotice: isInIframe,
      };

    case 'auth/popup-blocked':
      return {
        title: 'Sign-In Popup Blocked',
        message: 'Your browser prevented the Google Sign-In popup window from opening.',
        actionHint: 'Please allow popups for this site in your browser address bar settings, or use "Open in Direct Browser Tab".',
        isIframeNotice: isInIframe,
        canRedirect: true,
      };

    case 'auth/popup-closed-by-user':
      return {
        title: 'Sign-In Cancelled',
        message: 'The Google Sign-In window was closed before completing authentication.',
        actionHint: 'Click "Continue with Google Sign-In" to try again.',
      };

    case 'auth/cancelled-popup-request':
      return {
        title: 'Pending Request Cancelled',
        message: 'A new sign-in was initiated while another was still processing.',
        actionHint: 'Please wait a moment and click sign-in once.',
      };

    case 'auth/operation-not-allowed':
      return {
        title: 'Sign-In Method Not Enabled (auth/operation-not-allowed)',
        message: 'This authentication provider is currently disabled in your Firebase project configuration.',
        actionHint: 'Please use "Continue with Google Sign-In", or enable Email/Password under Firebase Console > Authentication > Sign-in method.',
      };

    case 'auth/user-disabled':
      return {
        title: 'Account Suspended',
        message: 'This account has been deactivated by an administrator.',
        actionHint: 'Please contact the Eket LGA Market Administration office.',
      };

    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return {
        title: 'Invalid Credentials',
        message: 'The email or password entered does not match our records.',
        actionHint: 'Please check your details or use Google Sign-In.',
      };

    case 'auth/email-already-in-use':
      return {
        title: 'Email Already In Use',
        message: 'An account is already associated with this email address.',
        actionHint: 'Please sign in with your password or use Google Sign-In.',
      };

    case 'auth/weak-password':
      return {
        title: 'Password Too Weak',
        message: 'Firebase requires a password with at least 6 characters.',
        actionHint: 'Please choose a stronger password.',
      };

    case 'auth/network-request-failed':
      return {
        title: 'Network Communication Error',
        message: 'Unable to reach Firebase Authentication servers.',
        actionHint: 'Check your internet connection and verify that third-party cookies are allowed.',
      };

    default:
      if (rawMessage.includes('PASSWORD_LOGIN_DISABLED') || rawMessage.includes('operation-not-allowed')) {
        return {
          title: 'Email Sign-In Disabled',
          message: 'Email/Password sign-in is disabled in this Firebase project. Only Google Sign-In is enabled by default.',
          actionHint: 'Please use "Continue with Google Sign-In", or enable Email/Password in Firebase Console > Authentication > Sign-in method.',
        };
      }
      return {
        title: 'Authentication Error',
        message: rawMessage.replace(/^Firebase:\s*Error\s*/i, '').replace(/\(?auth\/[a-z0-9-]+\)?\.?/gi, '').trim() || rawMessage,
        actionHint: code ? `Error code: ${code}` : undefined,
      };
  }
}
