// 判断能否使用 DOM
export const canUseDOM = !!(
  typeof window !== 'undefined' && window.document && window.document.createElement
)

// 封装 addEventListener
export const addEventListener = (node, event, listener) =>
  node.addEventListener
    ? node.addEventListener(event, listener, false)
    : node.attachEvent('on' + event, listener)

// 封装 removeEventListener
export const removeEventListener = (node, event, listener) =>
  node.removeEventListener
    ? node.removeEventListener(event, listener, false)
    : node.detachEvent('on' + event, listener)

// 确认信息
export const getConfirmation = (message, callback) =>
  callback(window.confirm(message)) // eslint-disable-line no-alert

/**
 * Returns true if the HTML5 history API is supported. Taken from Modernizr.
 * 如果浏览器支持 HTML5 history API，则返回 true。
 *
 * https://github.com/Modernizr/Modernizr/blob/master/LICENSE
 * https://github.com/Modernizr/Modernizr/blob/master/feature-detects/history.js
 * changed to avoid false negatives for Windows Phones: https://github.com/reactjs/react-router/issues/586
 */
// 通过 ua 判断哪些浏览器支持 window.history
export const supportsHistory = () => {
  const ua = window.navigator.userAgent

  if ((ua.indexOf('Android 2.') !== -1 || ua.indexOf('Android 4.0') !== -1) &&
    ua.indexOf('Mobile Safari') !== -1 &&
    ua.indexOf('Chrome') === -1 &&
    ua.indexOf('Windows Phone') === -1
  )
    return false

  return window.history && 'pushState' in window.history
}

/**
 * Returns true if browser fires popstate on hash change.
 * IE10 and IE11 do not.
 */
// IE10 和 IE11 hash change 时不会触发 popstate
export const supportsPopStateOnHashChange = () =>
  window.navigator.userAgent.indexOf('Trident') === -1

/**
 * Returns false if using go(n) with hash history causes a full page reload.
 */
// 判断 hash history 下使用 go(n) 会触发页面刷新
export const supportsGoWithoutReloadUsingHash = () =>
  window.navigator.userAgent.indexOf('Firefox') === -1

/**
 * Returns true if a given popstate event is an extraneous WebKit event.
 * Accounts for the fact that Chrome on iOS fires real popstate events
 * containing undefined state when pressing the back button.
 */
// popstate event.state 未定义情况
export const isExtraneousPopstateEvent = event =>
  event.state === undefined &&
  navigator.userAgent.indexOf('CriOS') === -1
