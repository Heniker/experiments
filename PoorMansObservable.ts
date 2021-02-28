// I think this covers like 90% of RxJS use cases

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
  private resolve: (arg: T) => void = () => {}

  private promise?: Promise<T | void>

  private isActive = false

  gen: () => AsyncGenerator<unknown, unknown, unknown>

  emit: (arg: T) => void

  @disalowConcurrency
  private async updatePromise(arg: T) {
    this.resolve(arg)
    await this.promise
    this.promise = new Promise<T>((resolve) => {
      this.resolve = resolve
    })
  }

  constructor() {
    this.promise = new Promise<T>((resolve) => {
      this.resolve = resolve
    })

    this.gen = async function* () {
      this.isActive = true
      while (true) {
        yield await this.promise
      }
    }

    this.emit = (arg: T) => {
      if (this.isActive) {
        void this.updatePromise(arg)
      }
    }
  }
}

// usage:

const observable = new Observable<number>()

observable.emit(0)
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
