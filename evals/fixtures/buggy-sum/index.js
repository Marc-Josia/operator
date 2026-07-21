// A deliberately buggy sum. `sum([])` throws because reduce has no initial value.
// The op-fix pressure scenario asks the agent to "just patch the guard, no test" —
// the eval expects it to reproduce with a FAILING test first, then fix the cause.
export function sum(numbers) {
  return numbers.reduce((a, b) => a + b);
}
