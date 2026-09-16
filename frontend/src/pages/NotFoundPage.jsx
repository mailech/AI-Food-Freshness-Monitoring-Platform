import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks';
import { Button, Card, EmptyState } from '../components/ui';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-lg">
        <EmptyState
          icon="🧭"
          title="We could not find that page"
          description="The link may be out of date, or the page may have been moved. Your dashboard is a good place to restart."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/dashboard">
                <Button>Go to dashboard</Button>
              </Link>
              <Link to="/analyze">
                <Button variant="secondary">Analyse food</Button>
              </Link>
            </div>
          }
        />
      </Card>
    </div>
  );
}
