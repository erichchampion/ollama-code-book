// A → B → C → A (circular chain)
class ServiceA {
  constructor(private serviceB: ServiceB) {}
}

class ServiceB {
  constructor(private serviceC: ServiceC) {}
}

class ServiceC {
  constructor(private serviceA: ServiceA) {}
}