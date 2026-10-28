const KEY = 'lms_device_id';

/** A random id kept on this browser so the device limit can recognise it. */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'no-storage';
  }
}

/** "Chrome on Windows", "Safari on iPhone", "Android app" … */
export function getDeviceName(): string {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Browser';
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone/.test(ua)
      ? 'iPhone'
      : /iPad/.test(ua)
        ? 'iPad'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Mac OS X/.test(ua)
            ? 'Mac'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'device';
  return `${browser} on ${os}`;
}

export function getPlatform(): string {
  const ua = navigator.userAgent;
  if (/Android/.test(ua)) return 'android';
  if (/iPhone|iPad/.test(ua)) return 'ios';
  return 'web';
}
