import { Button } from '@ugrc/utah-design-system';
import { useNavigate } from 'react-router';

export default function PageNotFound() {
  const message = '404';
  const details = 'This page does not exist';
  let stack: string | undefined;
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex flex-1 flex-col items-center gap-3 pt-16">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
      <Button size="extraLarge" onPress={() => navigate(-1)}>
        back
      </Button>
    </main>
  );
}
