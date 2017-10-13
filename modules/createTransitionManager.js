import warning from 'warning'

const createTransitionManager = () => {
  let prompt = null

  // 设置提示信息
  const setPrompt = (nextPrompt) => {
    // 设置提示信息时，如果原 prompt 不为 null，则发出警告“一个 history 只支持一个提示”
    warning(
      prompt == null,
      'A history supports only one prompt at a time'
    )

    prompt = nextPrompt

    return () => {
      if (prompt === nextPrompt)
        prompt = null
    }
  }

  const confirmTransitionTo = (location, action, getUserConfirmation, callback) => {
    // TODO: If another transition starts while we're still confirming
    // the previous one, we may end up in a weird state. Figure out the
    // best way to handle this.
    // 提示信息 prompt 不为 null 时
    if (prompt != null) {
      // 如果 prompt 是函数，则执行之，取最终结果
      const result = typeof prompt === 'function' ? prompt(location, action) : prompt

      // 结果是字符串
      if (typeof result === 'string') {
        if (typeof getUserConfirmation === 'function') {
          getUserConfirmation(result, callback)
        } else {
          warning(
            false,
            'A history needs a getUserConfirmation function in order to use a prompt message'
          )

          callback(true)
        }
      } else {
        // Return false from a transition hook to cancel the transition.
        callback(result !== false)
      }
    } else {
      callback(true)
    }
  }

  let listeners = []

  const appendListener = (fn) => {
    let isActive = true

    const listener = (...args) => {
      if (isActive)
        fn(...args)
    }

    listeners.push(listener)

    return () => {
      isActive = false
      listeners = listeners.filter(item => item !== listener)
    }
  }

  const notifyListeners = (...args) => {
    listeners.forEach(listener => listener(...args))
  }

  // 暴露方法
  return {
    setPrompt,
    confirmTransitionTo,
    appendListener,
    notifyListeners
  }
}

export default createTransitionManager
