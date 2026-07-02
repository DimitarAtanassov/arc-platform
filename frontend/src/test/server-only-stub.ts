// Vitest stub for the `server-only` guard. The real package throws when imported
// outside the React Server bundle; aliasing it here lets server modules (client,
// errors, config) be unit-tested in the jsdom environment.
export {};
