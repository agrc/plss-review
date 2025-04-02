export function ErrorBoundary() {
  const message = 'Oops!';
  const details = 'An unexpected error occurred.';
  let stack: string | undefined;

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
