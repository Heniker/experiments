// I think this covers like 90% of RxJS use cases

import assert from 'assert'

const disalowConcurrency = (fn: (...arg: any[]) => void) => {
  let inprogressPromise = Promise.resolve()

  return async (...args: unknown[]) => {
    await inprogressPromise
    inprogressPromise = inprogressPromise.then(() => fn(...args))

    return inprogressPromise
  }
}

export class Observable<T extends unknown> {
  isActive: boolean = false // designed to stop quirky behavior in sync environments
  gen?: () => AsyncGenerator<unknown, unknown, unknown>
  callback?: (arg: unknown) => void

  async setCallback(fn: (arg: unknown) => void): Promise<void> {
    this.callback = fn

    for await (const it of this.createIterable()) {
      this.callback(it)
    }
  }

  createIterable() {
    assert(this.gen, 'Listener not found')

    this.isActive = true

    return this.gen()
  }

  /**
   * @returns A callback that can be called to notify subscribed elements about it's argument
   */
  createListener() {
    let resolve_: (arg: T) => void
    let promise = new Promise<T>((resolve, reject) => {
      resolve_ = resolve
    })

    const updatePromise = disalowConcurrency(async (arg: T) => {
      resolve_(arg)
      promise = new Promise<T>((resolve, reject) => {
        resolve_ = resolve
      })
    })

    this.gen = async function* () {
      while (true) {
        yield await promise
      }
    }

    return (arg: T) => {
      if (this.isActive) {
        updatePromise(arg)
      }
    }
  }
}

// usage :

const emitter = new Observable<number>()

const listener = emitter.createListener()

;(async () => {
  for await (const it of emitter.createIterable()) {
    console.log(it)
  }
})()
// equivalent to
emitter.setCallback(console.log)

listener(1)
listener(2)

setTimeout(() => listener(42), 1000)

// output:
// 1
// 1
// 2
// 2
// 42
// 42
