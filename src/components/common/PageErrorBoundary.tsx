import React from 'react';
import { Button, Container } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

interface BoundaryProps { resetKey: string; children: React.ReactNode }
interface BoundaryState { failed: boolean }

/** A page that fails to load or render (a chunk that won't download on a flaky connection, a
 *  render error) shows a message with a reload button instead of unmounting the whole shop to a
 *  blank page. Going to another page clears it. */
class Boundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  componentDidUpdate(prev: BoundaryProps) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    return this.state.failed ? <PageError /> : this.props.children;
  }
}

const PageError: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Container className="py-5 text-center" role="alert">
      <p className="mb-3">{t('common.pageLoadError')}</p>
      {/* A failed on-demand page stays failed until the page is reloaded (React.lazy keeps it). */}
      <Button variant="primary" onClick={() => window.location.reload()}>{t('common.reload')}</Button>
    </Container>
  );
};

const PageErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  return <Boundary resetKey={pathname}>{children}</Boundary>;
};

export default PageErrorBoundary;
