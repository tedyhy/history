/**
 * 路径处理工具接口集
 */

// 添加首部斜杠
export const addLeadingSlash = (path) =>
  path.charAt(0) === '/' ? path : '/' + path

// 去掉首部斜杠
export const stripLeadingSlash = (path) =>
  path.charAt(0) === '/' ? path.substr(1) : path

// 判断是否以给定的 basename 开头
export const hasBasename = (path, prefix) => 
  (new RegExp('^' + prefix + '(\\/|\\?|#|$)', 'i')).test(path)

// 去除 basename
export const stripBasename = (path, prefix) =>
  hasBasename(path, prefix) ? path.substr(prefix.length) : path

// 去除尾部斜杠
export const stripTrailingSlash = (path) =>
  path.charAt(path.length - 1) === '/' ? path.slice(0, -1) : path

// 分析路径
export const parsePath = (path) => {
  let pathname = path || '/'
  let search = ''
  let hash = ''

  // 获取 hash 值、pathname 值
  const hashIndex = pathname.indexOf('#')
  if (hashIndex !== -1) {
    hash = pathname.substr(hashIndex)
    pathname = pathname.substr(0, hashIndex)
  }

  // 获取 search 值、pathname 值
  const searchIndex = pathname.indexOf('?')
  if (searchIndex !== -1) {
    search = pathname.substr(searchIndex)
    pathname = pathname.substr(0, searchIndex)
  }

  return {
    pathname,
    search: search === '?' ? '' : search,
    hash: hash === '#' ? '' : hash
  }
}

// 根据 location 拼接新的 path
export const createPath = (location) => {
  const { pathname, search, hash } = location

  let path = pathname || '/'

  if (search && search !== '?')
    path += (search.charAt(0) === '?' ? search : `?${search}`)

  if (hash && hash !== '#')
    path += (hash.charAt(0) === '#' ? hash : `#${hash}`)


  return path
}
