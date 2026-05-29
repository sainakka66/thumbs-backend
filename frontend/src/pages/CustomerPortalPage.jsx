import PageHeader from '../components/ui/PageHeader';
import { Card, CardBody } from '../components/ui/Card';

export default function CustomerPortalPage() {
  return (
    <div className="page-container pb-20 lg:pb-0">
      <PageHeader title="Customer Portal" subtitle="View orders and account information" />
      <Card>
        <CardBody>
          <p className="text-sub">
            Welcome to the Thumbs Up customer portal. Order history and account features will appear here.
            Contact your distributor for support.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
