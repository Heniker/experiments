function disalowConcurrency(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalFn = descriptor.value
  let inprogressPromise = Promise.resolve()
  descriptor.value = async function (...args: unknown[]) {
    await inprogressPromise
    inprogressPromise = inprogressPromise.then(() => originalFn.bind(this)(...args))
    return inprogressPromise
  }
}

export class Observable<T extends unknown> {
  private resolve!: (arg: T) => void

  private promise = new Promise<T>((resolve) => {
    this.resolve = resolve
  })

  private isActive = false

  @disalowConcurrency
  private async updatePromise(arg: T) {
    this.resolve(arg)
    await this.promise
    this.promise = new Promise<T>((resolve) => {
      this.resolve = resolve
    })
  }

  emit(arg: T) {
    if (this.isActive) {
      void this.updatePromise(arg)
    }
  }

  async *gen() {
    this.isActive = true
    while (true) {
      yield await this.promise
    }
  }
}

// usage:

const observable = new Observable<number>()

;(async () => {
  for await (const it of observable.gen()) {
    console.log(it)
  }
})()

observable.emit(1)
observable.emit(2)

setTimeout(() => observable.emit(42), 1000)

// output:
// 1
// 2
// 42
