/**
 * Browser feature detection utilities for cross-device compatibility
 */

export interface BrowserSupport {
  pushNotifications: 'full' | 'pwa-only' | 'none';
  serviceWorker: boolean;
  isSecureContext: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isPrivacyBrowser: boolean;
  browserName: string;
}

/**
 * Detect browser capabilities for push notifications and PWA features
 */
export function detectBrowserSupport(): BrowserSupport {
  const ua = navigator.userAgent.toLowerCase();
  
  // Detect OS
  const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /android/.test(ua);
  
  // Detect browsers
  const isSafari = /safari/.test(ua) && !/chrome|chromium|crios|android/.test(ua);
  const isChrome = /chrome|chromium|crios/.test(ua) && !/edge|edg/.test(ua);
  const isFirefox = /firefox|fxios/.test(ua);
  const isEdge = /edge|edg/.test(ua);
  
  // Privacy browsers that block push
  const isPrivacyBrowser = 
    /brave/.test(ua) || 
    /duckduckgo/.test(ua) || 
    /comet/.test(ua) ||
    /focus/.test(ua) ||
    /tor/.test(ua);
  
  // Check if installed as PWA
  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');
  
  // Basic feature detection
  const isSecureContext = window.isSecureContext;
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasPushManager = 'PushManager' in window;
  const hasNotification = 'Notification' in window;
  
  // Determine push notification support level
  let pushNotifications: 'full' | 'pwa-only' | 'none' = 'none';
  
  if (!isSecureContext || !hasServiceWorker) {
    pushNotifications = 'none';
  } else if (isPrivacyBrowser) {
    pushNotifications = 'none';
  } else if (isIOS && isSafari) {
    // iOS Safari only supports push in installed PWAs (iOS 16.4+)
    pushNotifications = isStandalone ? 'full' : 'pwa-only';
  } else if (hasPushManager && hasNotification) {
    pushNotifications = 'full';
  }
  
  // Determine browser name for display
  let browserName = 'Unknown';
  if (isPrivacyBrowser) browserName = 'Privacy Browser';
  else if (isChrome) browserName = 'Chrome';
  else if (isSafari) browserName = 'Safari';
  else if (isFirefox) browserName = 'Firefox';
  else if (isEdge) browserName = 'Edge';
  
  return {
    pushNotifications,
    serviceWorker: hasServiceWorker,
    isSecureContext,
    isStandalone,
    isIOS,
    isAndroid,
    isSafari,
    isPrivacyBrowser,
    browserName
  };
}

/**
 * Get a user-friendly message about push notification support
 */
export function getPushSupportMessage(support: BrowserSupport): string {
  if (support.pushNotifications === 'full') {
    return 'Push notifications are fully supported';
  }
  
  if (support.pushNotifications === 'pwa-only') {
    if (support.isIOS && support.isSafari) {
      return 'Install this app to your home screen to enable push notifications';
    }
    return 'Install this app to enable push notifications';
  }
  
  if (support.isPrivacyBrowser) {
    return 'Push notifications are blocked by your privacy browser';
  }
  
  if (!support.isSecureContext) {
    return 'Push notifications require a secure (HTTPS) connection';
  }
  
  return 'Push notifications are not supported in this browser';
}

/**
 * Check if the app should prompt for PWA installation
 */
export function shouldPromptPWAInstall(): boolean {
  const support = detectBrowserSupport();
  
  // Don't prompt if already installed
  if (support.isStandalone) return false;
  
  // Prompt iOS Safari users for better experience
  if (support.isIOS && support.isSafari) return true;
  
  // On Android Chrome, the browser handles install prompts
  if (support.isAndroid && !support.isStandalone) return true;
  
  return false;
}

/**
 * Get safe area insets for notched devices
 */
export function getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
  const computedStyle = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
    bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
    left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0', 10),
    right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0', 10)
  };
}

/**
 * Trigger haptic feedback if available
 */
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light'): void {
  // Use Vibration API as fallback
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30, 10, 30]
    };
    navigator.vibrate(patterns[type]);
  }
}
