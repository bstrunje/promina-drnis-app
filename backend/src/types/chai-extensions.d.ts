declare namespace Chai {
    interface Assertion {
      calledWith(...args: any[]): void;
    }
  }