// Polyfill for Symbol.metadata required by @colyseus/schema 4.x decorators
// when running with TypeScript experimentalDecorators on Node.js < 22.
// Must be imported BEFORE any module that defines a Schema (the @type decorators
// run at module load and read constructor[Symbol.metadata]).
if (!(Symbol as { metadata?: symbol }).metadata) {
  (Symbol as unknown as { metadata: symbol }).metadata = Symbol.for("Symbol.metadata");
}
