/**
 * @typedef {Object} ResponseOkT
 * @property {any} body
 * @property {true} success
 * @property {number|string=} id
 * @property {string} type
 */

/**
 * @typedef {Object} ResponseErrT
 * @property {string} body error message
 * @property {false} success
 * @property {number|string=} id
 * @property {string} type
 */

class WSConnectionError extends Error {
  constructor(message) {
    super(message)
    this.name = 'WebSocketConnectionError'
  }
}

const ws = null;

const activeMessages = {};

const handlers = {};

const checkReadyState = () => {
  let retryCount = 0;

  const check = async () => {
    if (retryCount > 4 || [ws.CLOSED, ws.CLOSING].includes(ws.readyState)) {
      console.warn('WS connection error')
      console.log(ws)
      return false;
    }

    if (ws.readyState === ws.OPEN) {
      return true;
    }

    await new Promise((res, rej) => {
      setTimeout(res, 300);
    });

    retryCount++;
    return check();
  };

  return check();
};

ws.addEventListener("message", message => {
  /**
   * @type {ResponseOkT|ResponseErrT}
   */
  let data = null;

  try {
    data = JSON.parse(message.data);
  } catch (err) {
    // server sent non json message
    return;
  }

  if (activeMessages[data.id]) {
    data.success
      ? activeMessages[data.id].resolve(data.body)
      : activeMessages[data.id].reject(data.body);
  }

  data.success && handlers[data.type] &&  handlers[data.type].forEach(it => it(data.body));
});

/**
 * @param {Object} data
 */
const send = async (data, type) => {
  if (!(await checkReadyState())) {
    throw new WSConnectionError("No websocket connection");
  }
  const id = Math.floor(Math.random() * 1000);

  ws.send(JSON.stringify({ data, type, id }));

  return new Promise((resolve, reject) => {
    activeMessages[id] = { resolve, reject };
  });
};

//

const listen = (messageType, handle) => {
  if (Array.isArray(handlers[messageType])) {
    handlers[messageType].push(handle);
  } else {
    handlers[messageType] = [handle];
  }
};

export { send, listen };
