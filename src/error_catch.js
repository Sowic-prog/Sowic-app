export function ErrorBoundary({ children }) { return children; } window.onerror = (msg) => console.error("Global Error:", msg);
