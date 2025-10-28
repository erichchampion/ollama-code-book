// A depends on B
class ServiceA {
  constructor(private serviceB: ServiceB) {}
}

// B depends on A (circular!)
class ServiceB {
  constructor(private serviceA: ServiceA) {}
}

// Cannot be created:
// To create A, we need B
// To create B, we need A
// Infinite loop!