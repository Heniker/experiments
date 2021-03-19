interface NextableI<T> {
  value: T
  next?: NextableI<T>
}

export class Observable<T extends unknown> {
  private resolve: (arg: T) => void = () => {}
  // generator *emulation* because it's not possible to clone JS generators
  private nextable: NextableI<Promise<T>> = { value: undefined as any, next: {} as any }

  private updatePromise(arg: T) {
    const oldResolve = this.resolve
    const nextPromise = new Promise<T>((resolve) => {
      this.resolve = resolve
    })

    this.nextable = this.nextable.next as { value: Promise<T> }
    this.nextable.next = { value: nextPromise }

    oldResolve(arg)
  }

  constructor() {
    this.updatePromise(undefined as any)
  }

  async *values() {
    let currentNextable = this.nextable

    while (true) {
      currentNextable = currentNextable.next as { value: Promise<T> }
      const val = await currentNextable.value
      yield val
    }
  }

  emit(arg: T) {
    void this.updatePromise(arg)
  }

  [Symbol.asyncIterator] = this.values
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
