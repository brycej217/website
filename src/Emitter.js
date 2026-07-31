// event callback registry and signaler class
export class Emitter {
  constructor() {
    this.listeners = {}
  }

  on(event, callback) {
    // ('event name', fn: callback)
    this.listeners[event] ??= new Set() // nullish assignment
    this.listeners[event].add(callback)
    return () => this.off(event, callback) // return function that calls off
  }

  off(event, callback) {
    this.listeners[event]?.delete(callback)
  }

  emit(event, ...args) {
    this.listeners[event]?.forEach((cb) => cb(...args))
  }
}
