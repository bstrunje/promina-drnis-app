declare namespace Chai {
    interface Assertion {
      calledWith(...args: unknown[]): void;
    }
  }