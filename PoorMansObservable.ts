// prolly the most needless usage of WeakRef

export class Observable<T extends unknown> {
  private resolve: (arg: T) => void = () => {}

  private promises: Set<WeakRef<Promise<T>>> = new Set()

  private emitCount = 0

  private finalizationGroup = new FinalizationRegistry((ref) => {
    this.promises.delete(ref)
    this.emitCount--
  })

  constructor() {
    this.updatePromise(undefined as any)
  }

  private updatePromise(arg: T) {
    this.resolve(arg)

    const promise = new Promise<T>((resolve) => {
      this.resolve = resolve
    })
    const ref = new WeakRef(promise)

    this.finalizationGroup.register(promise, ref)
    this.promises.add(ref)
  }

  private async *values() {
    const iterator = this.promises.values()

    ;[...new Array(this.emitCount)].forEach(() => {
      iterator.next()
    })

    while (true) {
      yield await iterator.next().value.deref()
    }
  }

  [Symbol.asyncIterator] = this.values

  emit(arg: T) {
    this.emitCount++
    void this.updatePromise(arg)
  }
}

// usage:

const obs = new Observable<string>()

obs.emit('ignored')
;(async () => {
  for await (let it of obs) {
    console.log(it)
  }
})()
;(async () => {
  const vals = obs.values()

  console.log((await vals.next()).value)

  await new Promise((res) => setTimeout(res, 2000))

  console.log((await vals.next()).value)
  console.log((await vals.next()).value)
})()

setTimeout(() => {
  obs.emit('43')
}, 1400)
setTimeout(() => {
  obs.emit('44')
}, 1500)
setTimeout(() => {
  obs.emit('45')
}, 1600)

/*
43
43
44
45
44
45
*/
