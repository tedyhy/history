import resolvePathname from 'resolve-pathname'
import valueEqual from 'value-equal'
import { parsePath } from './PathUtils'

/**
 * 创建新的 location
 * @param  {string} path            path
 * @param  {object} state           state
 * @param  {string} key             key
 * @param  {object} currentLocation 当前封装好的 history.location 对象
 * @return {object}                 location
 */
export const createLocation = (path, state, key, currentLocation) => {
  let location
  if (typeof path === 'string') {
    // Two-arg form: push(path, state)
    // 如果 path 是字符串，则调用 parsePath 方法分析 path，返回 location 对象
    location = parsePath(path)
    // 为新的 location 对象添加 state 属性
    location.state = state
  } else {
    // One-arg form: push(location)
    // path 为对象时，处理对象中的 pathname、search、hash、state 值
    location = { ...path }

    if (location.pathname === undefined)
      location.pathname = ''

    if (location.search) {
      if (location.search.charAt(0) !== '?')
        location.search = '?' + location.search
    } else {
      location.search = ''
    }

    if (location.hash) {
      if (location.hash.charAt(0) !== '#')
        location.hash = '#' + location.hash
    } else {
      location.hash = ''
    }

    if (state !== undefined && location.state === undefined)
      location.state = state
  }

  try {
    location.pathname = decodeURI(location.pathname)
  } catch (e) {
    if (e instanceof URIError) {
      throw new URIError(
        'Pathname "' + location.pathname + '" could not be decoded. ' +
        'This is likely caused by an invalid percent-encoding.'
      )
    } else {
      throw e
    }
  }

  if (key)
    location.key = key

  if (currentLocation) {
    // Resolve incomplete/relative pathname relative to current location.
    if (!location.pathname) {
      location.pathname = currentLocation.pathname
    } else if (location.pathname.charAt(0) !== '/') {
      location.pathname = resolvePathname(location.pathname, currentLocation.pathname)
    }
  } else {
    // When there is no prior location and pathname is empty, set it to /
    if (!location.pathname) {
      location.pathname = '/'
    }
  }

  return location
}

// 判断两个 location 是否相等
export const locationsAreEqual = (a, b) =>
  a.pathname === b.pathname &&
  a.search === b.search &&
  a.hash === b.hash &&
  a.key === b.key &&
  // 判断两值是否全等
  // 参考 https://github.com/mjackson/value-equal
  valueEqual(a.state, b.state)
