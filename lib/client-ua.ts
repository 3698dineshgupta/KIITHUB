// Lightweight heuristic UA parsing — avoids pulling in a full parser library
// just to label a bug report with "Chrome" / "Windows" for triage context.
export function getClientEnvironmentInfo() {
  if (typeof navigator === 'undefined') {
    return { browserInfo: '', deviceInfo: '', os: '', screenResolution: '' }
  }
  const ua = navigator.userAgent

  let browserInfo = 'Unknown Browser'
  if (/Edg\//.test(ua)) browserInfo = 'Edge'
  else if (/OPR\//.test(ua)) browserInfo = 'Opera'
  else if (/Firefox\//.test(ua)) browserInfo = 'Firefox'
  else if (/CriOS\//.test(ua)) browserInfo = 'Chrome (iOS)'
  else if (/Chrome\//.test(ua)) browserInfo = 'Chrome'
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) browserInfo = 'Safari'

  let os = 'Unknown OS'
  if (/Windows NT/.test(ua)) os = 'Windows'
  else if (/Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua)) os = 'macOS'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS'
  else if (/Linux/.test(ua)) os = 'Linux'

  const deviceInfo = /Mobi|Android|iPhone|iPad/.test(ua) ? 'Mobile' : 'Desktop'
  const screenResolution = typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : ''

  return { browserInfo, deviceInfo, os, screenResolution }
}
