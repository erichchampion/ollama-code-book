// Easy to test
export class ServiceA {
  constructor(private serviceB: ServiceB) {}
}

// Test with mock
const mock = { /* ... */ };
const service = new ServiceA(mock);