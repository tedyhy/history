import warning from 'warning'
import invariant from 'invariant'
import { createLocation } from './LocationUtils'
import {
  addLeadingSlash,
  stripTrailingSlash,
  hasBasename,
  stripBasename,
  createPath
} from './PathUtils'
import createTransitionManager from './createTransitionManager'
import {
  canUseDOM,
  addEventListener,
  removeEventListener,
  getConfirmation,
  supportsHistory,
  supportsPopStateOnHashChange,
  isExtraneousPopstateEvent
} from './DOMUtils'

const PopStateEvent = 'popstate' // 定义 popstate 事件名称
const HashChangeEvent = 'hashchange' // 定义 hashchange 事件名称

// 获取window.history.state 对象
const getHistoryState = () => {
  try {
    return window.history.state || {}
  } catch (e) {
    // IE 11 sometimes throws when accessing window.history.state
    // See https://github.com/ReactTraining/history/pull/289
    return {}
  }
}

/**
 * Creates a history object that uses the HTML5 history API including
 * pushState, replaceState, and the popstate event.
 * 
 * 使用 HTML5 history API 创建一个 history 对象，包括：pushState、replaceState、popstate event
 * 如：
 * createBrowserHistory({
 *   basename: '',             // The base URL of the app (see below)
 *   forceRefresh: false,      // Set true to force full page refreshes
 *   keyLength: 6,             // The length of location.key
 *   // A function to use to confirm navigation with the user (see below)
 *   getUserConfirmation: (message, callback) => callback(window.confirm(message))
 * })
 */
const createBrowserHistory = (props = {}) => {
  // 如果不是 DOM 环境，则抛出错误“浏览器 history 需要 DOM 环境”
  invariant(
    canUseDOM,
    'Browser history needs a DOM'
  )

  // 浏览器真实 history 对象，即：window.history
  const globalHistory = window.history
  // 判断浏览器是否支持 history
  const canUseHistory = supportsHistory()
  // 判断 popstate 事件是否依赖 hashChange 事件监听
  const needsHashChangeListener = !supportsPopStateOnHashChange()

  const {
    forceRefresh = false, // 是否强制刷新整个页面，默认为 false
    getUserConfirmation = getConfirmation,
    keyLength = 6 // location.key 的长度
  } = props
  // 处理 props.basename，生成最终的 basename，默认为空字符串
  const basename = props.basename ? stripTrailingSlash(addLeadingSlash(props.basename)) : ''

  // 根据 historyState 生成新的 location 对象
  const getDOMLocation = (historyState) => {
    const { key, state } = (historyState || {})
    const { pathname, search, hash } = window.location

    let path = pathname + search + hash

    // 如果 basename 不存在，或者路径 path 不以 basename 开头，则发出警告
    warning(
      (!basename || hasBasename(path, basename)),
      'You are attempting to use a basename on a page whose URL path does not begin ' +
      'with the basename. Expected path "' + path + '" to begin with "' + basename + '".'
    )

    // 如果有 basename，则从路径 path 里去除 basename，用最终的 path 创建新的 location 对象
    if (basename)
      path = stripBasename(path, basename)

    return createLocation(path, state, key)
  }

  // 随机生成长度为 keyLength 的字符串
  const createKey = () =>
    Math.random().toString(36).substr(2, keyLength)

  // 创建 transitionManager 对象
  const transitionManager = createTransitionManager()

  // 同步 history 对象
  const setState = (nextState) => {
    Object.assign(history, nextState)

    // 同步 history 长度
    history.length = globalHistory.length

    // 通知监听器 history.location 和 history.action 发生变化
    transitionManager.notifyListeners(
      history.location,
      history.action
    )
  }

  const handlePopState = (event) => {
    // Ignore extraneous popstate events in WebKit.
    // 如果是外来的 popstate 事件，则忽略之
    if (isExtraneousPopstateEvent(event))
      return 

    handlePop(getDOMLocation(event.state))
  }

  const handleHashChange = () => {
    handlePop(getDOMLocation(getHistoryState()))
  }

  let forceNextPop = false

  const handlePop = (location) => {
    if (forceNextPop) {
      forceNextPop = false
      setState()
    } else {
      const action = 'POP'

      transitionManager.confirmTransitionTo(location, action, getUserConfirmation, (ok) => {
        if (ok) {
          setState({ action, location })
        } else {
          revertPop(location)
        }
      })
    }
  }

  const revertPop = (fromLocation) => {
    const toLocation = history.location

    // TODO: We could probably make this more reliable by
    // keeping a list of keys we've seen in sessionStorage.
    // Instead, we just default to 0 for keys we don't know.

    let toIndex = allKeys.indexOf(toLocation.key)

    if (toIndex === -1)
      toIndex = 0

    let fromIndex = allKeys.indexOf(fromLocation.key)

    if (fromIndex === -1)
      fromIndex = 0

    const delta = toIndex - fromIndex

    if (delta) {
      forceNextPop = true
      go(delta)
    }
  }

  const initialLocation = getDOMLocation(getHistoryState())
  let allKeys = [ initialLocation.key ]

  // Public interface
  // 下面定义公共接口

  // 根据 location 拼接生成新的 path
  const createHref = (location) =>
    basename + createPath(location)

  const push = (path, state) => {
    // 如果 path 不是对象，或者 path.state 未定义，或者 state 未定义，则抛出警告
    warning(
      !(typeof path === 'object' && path.state !== undefined && state !== undefined),
      'You should avoid providing a 2nd state argument to push when the 1st ' +
      'argument is a location-like object that already has state; it is ignored'
    )

    // 根据 path、state 创建新的 location
    const action = 'PUSH'
    const location = createLocation(path, state, createKey(), history.location)

    transitionManager.confirmTransitionTo(location, action, getUserConfirmation, (ok) => {
      // 如果 getUserConfirmation 返回值为 false，则阻止 location 跳转
      if (!ok)
        return

      const href = createHref(location)
      const { key, state } = location

      if (canUseHistory) {
        // 参考 https://developer.mozilla.org/zh-CN/docs/Web/API/History/pushState
        globalHistory.pushState({ key, state }, null, href)

        // 强制刷新整个页面
        if (forceRefresh) {
          window.location.href = href
        } else {
          const prevIndex = allKeys.indexOf(history.location.key)
          const nextKeys = allKeys.slice(0, prevIndex === -1 ? 0 : prevIndex + 1)

          nextKeys.push(location.key)
          allKeys = nextKeys

          setState({ action, location })
        }
      } else {
        // 如果不支持 window.history，则发出警告并通过 location.href 跳转
        warning(
          state === undefined,
          'Browser history cannot push state in browsers that do not support HTML5 history'
        )

        window.location.href = href
      }
    })
  }

  const replace = (path, state) => {
    warning(
      !(typeof path === 'object' && path.state !== undefined && state !== undefined),
      'You should avoid providing a 2nd state argument to replace when the 1st ' +
      'argument is a location-like object that already has state; it is ignored'
    )

    const action = 'REPLACE'
    const location = createLocation(path, state, createKey(), history.location)

    transitionManager.confirmTransitionTo(location, action, getUserConfirmation, (ok) => {
      if (!ok)
        return

      const href = createHref(location)
      const { key, state } = location

      if (canUseHistory) {
        globalHistory.replaceState({ key, state }, null, href)

        // 强制刷新整个页面
        if (forceRefresh) {
          window.location.replace(href)
        } else {
          const prevIndex = allKeys.indexOf(history.location.key)

          if (prevIndex !== -1)
            allKeys[prevIndex] = location.key

          setState({ action, location })
        }
      } else {
        warning(
          state === undefined,
          'Browser history cannot replace state in browsers that do not support HTML5 history'
        )

        window.location.replace(href)
      }
    })
  }

  // 封装 history.go 方法，调用 window.history.go()
  const go = (n) => {
    globalHistory.go(n)
  }

  // goBack 方法，类似 window.history.back()
  const goBack = () =>
    go(-1)

  // goForward 方法，类似 window.history.forward()
  const goForward = () =>
    go(1)

  let listenerCount = 0

  const checkDOMListeners = (delta) => {
    listenerCount += delta

    if (listenerCount === 1) {
      addEventListener(window, PopStateEvent, handlePopState)

      if (needsHashChangeListener)
        addEventListener(window, HashChangeEvent, handleHashChange)
    } else if (listenerCount === 0) {
      removeEventListener(window, PopStateEvent, handlePopState)

      if (needsHashChangeListener)
        removeEventListener(window, HashChangeEvent, handleHashChange)
    }
  }

  let isBlocked = false

  const block = (prompt = false) => {
    const unblock = transitionManager.setPrompt(prompt)

    if (!isBlocked) {
      checkDOMListeners(1)
      isBlocked = true
    }

    return () => {
      if (isBlocked) {
        isBlocked = false
        checkDOMListeners(-1)
      }

      return unblock()
    }
  }

  // listen 监听器，返回值为解绑监听器回调
  const listen = (listener) => {
    const unlisten = transitionManager.appendListener(listener)
    checkDOMListeners(1)

    return () => {
      checkDOMListeners(-1)
      unlisten()
    }
  }

  // 封装自定义 history 对象并返回
  const history = {
    length: globalHistory.length,
    action: 'POP',
    location: initialLocation,
    createHref,
    push,
    replace,
    go,
    goBack,
    goForward,
    block,
    listen
  }

  return history
}

export default createBrowserHistory
