import { useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../contexts/ToastContext';
import { getApiErrorMessage } from '../../utils/apiError';

// Safety net: an API call whose failure no screen handles used to fail silently (visible only in
// the browser console) — the customer clicked and nothing happened. Any such rejected API promise
// now shows an error toast with the backend's own message. The 401 → login redirect stays quiet.
const UnhandledApiErrorToaster: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();

  useEffect(() => {
    const onUnhandled = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (!axios.isAxiosError(reason) || axios.isCancel(reason) || reason.response?.status === 401) return;
      event.preventDefault();
      showToast('danger', reason.response
        ? getApiErrorMessage(reason, t('common.unexpectedError'))
        : t('common.networkError'));
    };
    window.addEventListener('unhandledrejection', onUnhandled);
    return () => window.removeEventListener('unhandledrejection', onUnhandled);
  }, [showToast, t]);

  return null;
};

export default UnhandledApiErrorToaster;
