function disallowConcurrency(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
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

  @disallowConcurrency
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

  async *values() {
    this.isActive = true
    while (true) {
      yield await this.promise
    }
  }
}
