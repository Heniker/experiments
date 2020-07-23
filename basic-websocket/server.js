/**
 * @typedef {(client: symbol, ...data: any)=>any} HandlerT
 */

/**
 * @typedef {Object} ResponseOkT
 * @property {any} body
 * @property {true} success
 * @property {number|string=} id
 * @property {string} type
 */

/**
 * @typedef {Object} ResponseErrT
 * @property {string} message error message
 * @property {number|string=} id
 * @property {false} success
 * @property {string} type
 */

/**
 * @typedef {import('ws')} WebSocket
 */

const assert = require('assert')
const WebSocket = require('ws')

//#region
const connectionOpts = {
  checkInterval: 30000, // ms
  TTL: 10000,
}

let server = null

/**
 * @type {Object.<symbol, WebSocket>}
 */
const localClients = {}

/**
 * .connection and .close handlers are special - they do not automaticly send
 * returned value to client
 * @type {Object.<string, HandlerT[]>}
 */
const typeHandlers = { connection: [], close: [] }

/**
 * @param {symbol} connectionSymbol
 * @param {WebSocket=} ws
 * @param {string} type
 * @param {Object} message
 * @param {string|number=} message.id unique message id to identify response
 * @param {any=} message.data
 */
const executeHandlers = (connectionSymbol, type, message, ws) => {
  if (!typeHandlers[type]) {
    console.warn('WebSocket message was not handled for data %s', message)
    return
  }

  typeHandlers[type].forEach(async (it) => {
    try {
      const result = await it(connectionSymbol, message.data, message.id)

      if (!result || ['connection', 'close'].includes(type)) {
        return
      }

      ws.send(
        JSON.stringify({
          body: result,
          success: true,
          id: message.id || null,
        })
      )
    } catch (err) {
      if (['connection', 'close'].includes(type)) {
        return
      }

      ws.send(
        JSON.stringify({
          success: false,
          body: err.message,
          id: message.id || null,
        })
      )
    }
  })
}

/**
 *
 * @param {symbol} connectionSymbol
 * @param {WebSocket} ws
 */
const keepAlive = (connectionSymbol, ws) => {
  let checkAliveIntervalId = null
  let timeoutId = null

  const handleDeath = () => {
    delete localClients[connectionSymbol]
    ws.terminate()
    clearInterval(checkAliveIntervalId)
    clearTimeout(timeoutId)
  }

  ws.on('close', handleDeath)

  {
    const checkAliveOrKill = () => {
      timeoutId = setTimeout(handleDeath, connectionOpts.TTL)
      ws.ping()

      ws.once('pong', () => {
        clearTimeout(timeoutId)
      })
    }

    checkAliveIntervalId = setInterval(checkAliveOrKill, connectionOpts.checkInterval)
  }
}

const onstratup = () => {
  server.on('connection', (ws) => {
    const connectionSymbol = Symbol('Connection')

    localClients[connectionSymbol] = ws

    executeHandlers(connectionSymbol, 'connection', {})

    ws.on('message', (message) => {
      let data = null

      try {
        const messageStr = message.toString()
        data = messageStr && messageStr.length ? JSON.parse(messageStr) : {}
      } catch (err) {
        console.warn('Client sent corrupt data:')
        console.warn(message)
        return
      }

      executeHandlers(connectionSymbol, data.type, data, ws)
    })

    ws.on('close', () => {
      executeHandlers(connectionSymbol, 'close', {})
    })

    keepAlive(connectionSymbol, ws)
  })
}

/**
 * @param {any} message data to send
 * @param {symbol} clientSymb Client Symbol obtained by listening to event
 * @return {boolean}
 */
const send = (clientSymb, message, type) => {
  assert(clientSymb, 'No client provided. Use broadcast to send message to all clients')

  const body = JSON.stringify(message)

  if (localClients[clientSymb]) {
    localClients[clientSymb].send({ body, type, success: true })
    return true
  } else {
    return false
  }
}

/**
 * send message to all clients
 * @param {ResponseOkT|ResponseErrT} message
 */
const broadcast = (message, type) => {
  assert(type)
  const body = JSON.stringify(message)

  server.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send({ body, type, success: true })
    }
  })
}

/**
 * @param {string} messageType
 * @param {AsyncIterable<{client: symbol, data: any}>} iterable
 */
exports.registerNotifier = (messageType, iterable) => {
  const startWork = async () => {
    for await (const result of iterable) {
      send(result.client, result.data, messageType)
    }
  }
  startWork()
}

/**
 * @param {string} messageType
 * @param {AsyncIterable<any>} iterable
 */
exports.registerGlobalNotifier = (messageType, iterable) => {
  const startWork = async () => {
    for await (const result of iterable) {
      broadcast(result, messageType)
    }
  }
  startWork()
}

/**
 * @param {string} messageType
 * @param {HandlerT} handler
 */
exports.registerHandler = (messageType, handler) => {
  assert(messageType)
  assert(handler)

  if (typeHandlers[messageType]) {
    typeHandlers[messageType].push(handler)
  } else {
    typeHandlers[messageType] = [handler]
  }
}

exports.getClientInfo = (clientSymb) => {
  throw new Error('Not implemented')
  // do not return localClients[clientSymb] !
  // instead serialize data and return only what will be required
}

/**
 * @param {import("ws").ServerOptions} wsOptions
 * @param {{checkInterval?: number, TTL?: number}} connectionOptions
 */
exports.startServer = (wsOptions, connectionOptions = {}) => {
  server = new WebSocket.Server(wsOptions)
  Object.assign(connectionOpts, connectionOptions)
  onstratup()
}
