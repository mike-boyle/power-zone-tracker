import { href } from '../router';
import { Page } from '../ui/Page';
import { Button } from '../ui/Button';

export function NotFoundPage() {
  return (
    <Page title="Not found" subtitle="That page or ride doesn't exist.">
      <Button href={href('/')} variant="primary" size="lg" block>
        Back to Today
      </Button>
    </Page>
  );
}
