import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, InputGroup, Spinner } from 'react-bootstrap';
import { FaGift, FaMinus, FaPlus } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import { useCart } from '../../contexts/CartContext';
import { useAuthGate } from '../../contexts/AuthGateContext';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { checkGiftCardBalance, getGiftCardConfig } from '../../services/giftCardService';
import { getApiErrorMessage, parseFieldErrors, type FieldErrors } from '../../utils/apiError';
import { formatPrice } from '../../utils/pricing';
import { giftCardPresets, snapGiftCardAmount } from '../../utils/giftCard';
import type { GiftCardBalance, GiftCardConfig } from '../../types';
import './GiftCardPage.css';

const MESSAGE_MAX = 500;

const GiftCardPage: React.FC = () => {
  const { t } = useTranslation();
  const settings = useSiteSettings();
  const { addGiftCard, loading } = useCart();
  const { requireAuth } = useAuthGate();
  const { showToast } = useToast();

  const [config, setConfig] = useState<GiftCardConfig | null>(null);
  const [configError, setConfigError] = useState('');
  const [amount, setAmount] = useState(50);
  const [amountInput, setAmountInput] = useState('50');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [balanceCode, setBalanceCode] = useState('');
  const [balance, setBalance] = useState<GiftCardBalance | null>(null);
  const [balanceError, setBalanceError] = useState('');
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getGiftCardConfig()
      .then(c => {
        if (cancelled) return;
        setConfig(c);
        const start = snapGiftCardAmount(50, c.minAmount, c.maxAmount, c.amountStep);
        setAmount(start);
        setAmountInput(String(start));
      })
      .catch(err => { if (!cancelled) setConfigError(getApiErrorMessage(err, t('giftCard.loadError'))); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loaded once; t only words the fallback error
  }, []);

  const setSnappedAmount = (value: number) => {
    if (!config) return;
    const snapped = snapGiftCardAmount(value, config.minAmount, config.maxAmount, config.amountStep);
    setAmount(snapped);
    setAmountInput(String(snapped));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    if (!(await requireAuth())) return;
    try {
      await addGiftCard({
        amount,
        recipientName: recipientName.trim(),
        recipientEmail: recipientEmail.trim() || undefined,
        senderName: senderName.trim(),
        message: message.trim() || undefined,
      });
      showToast('success', t('giftCard.added'));
      setRecipientName('');
      setRecipientEmail('');
      setMessage('');
    } catch (err) {
      setFieldErrors(parseFieldErrors(err) ?? {});
      setError(getApiErrorMessage(err, t('giftCard.addError')));
    }
  };

  const handleCheckBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceCode.trim()) return;
    setBalance(null);
    setBalanceError('');
    setBalanceLoading(true);
    try {
      setBalance(await checkGiftCardBalance(balanceCode.trim()));
    } catch (err) {
      setBalanceError(getApiErrorMessage(err, t('giftCard.balanceError')));
    } finally {
      setBalanceLoading(false);
    }
  };

  const fieldError = (name: string) => fieldErrors[name] ?? fieldErrors[name.charAt(0).toUpperCase() + name.slice(1)];
  const minLabel = config ? formatPrice(config.minAmount) : '';
  const maxLabel = config ? formatPrice(config.maxAmount) : '';
  const stepLabel = config ? formatPrice(config.amountStep) : '';

  return (
    <MainLayout>
      <Container className="py-4">
        {config?.headerImageUrl ? (
          // The banner (set in the CMS) carries no text of its own: the title is laid over its
          // free side on wide screens and goes under it on phones, so it's always translated.
          <div className="gift-card-hero mb-4">
            <img src={config.headerImageUrl} alt="" className="gift-card-hero-img" />
            <div className="gift-card-hero-text">
              <h1 className="fw-bold mb-2">{t('giftCard.title')}</h1>
              <p className="mb-0">{t('giftCard.subtitle')}</p>
            </div>
          </div>
        ) : (
          <>
            <h1 className="fw-bold mb-2"><FaGift className="me-2" />{t('giftCard.title')}</h1>
            <p className="text-muted mb-4" style={{ maxWidth: 720 }}>{t('giftCard.subtitle')}</p>
          </>
        )}

        {configError && <Alert variant="danger">{configError}</Alert>}
        {!config && !configError && <div className="text-center py-5"><Spinner animation="border" /></div>}
        {config && !config.enabled && <Alert variant="info">{t('giftCard.unavailable')}</Alert>}

        {config?.enabled && (
          <Row className="g-4">
            <Col lg={6}>
              <Card>
                <Card.Body>
                  <Form onSubmit={handleSubmit} noValidate>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">{t('giftCard.amountLabel')}</Form.Label>
                      <div className="d-flex flex-wrap gap-2 mb-2 gift-card-amount-presets">
                        {giftCardPresets(config.minAmount, config.maxAmount, config.amountStep).map(v => (
                          <Button key={v} type="button" size="sm" variant={v === amount ? 'primary' : 'outline-primary'} onClick={() => setSnappedAmount(v)}>
                            {formatPrice(v)}
                          </Button>
                        ))}
                      </div>
                      <InputGroup style={{ maxWidth: 240 }}>
                        <Button type="button" variant="outline-secondary" aria-label={t('giftCard.decrease')} title={t('giftCard.decrease')}
                          disabled={amount <= config.minAmount} onClick={() => setSnappedAmount(amount - config.amountStep)}>
                          <FaMinus size={10} />
                        </Button>
                        <Form.Control
                          type="number"
                          inputMode="numeric"
                          min={config.minAmount}
                          max={config.maxAmount}
                          step={config.amountStep}
                          value={amountInput}
                          onChange={e => setAmountInput(e.target.value)}
                          onBlur={() => setSnappedAmount(parseFloat(amountInput))}
                          aria-label={t('giftCard.amountLabel')}
                          className="text-center"
                        />
                        <InputGroup.Text>€</InputGroup.Text>
                        <Button type="button" variant="outline-secondary" aria-label={t('giftCard.increase')} title={t('giftCard.increase')}
                          disabled={amount >= config.maxAmount} onClick={() => setSnappedAmount(amount + config.amountStep)}>
                          <FaPlus size={10} />
                        </Button>
                      </InputGroup>
                      <Form.Text>{t('giftCard.amountHint', { min: minLabel, max: maxLabel, step: stepLabel })}</Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="gc-recipient">
                      <Form.Label className="fw-semibold">{t('giftCard.recipientName')}</Form.Label>
                      <Form.Control value={recipientName} maxLength={100} required placeholder={t('giftCard.recipientNamePlaceholder')}
                        onChange={e => setRecipientName(e.target.value)} isInvalid={!!fieldError('recipientName')} />
                      <Form.Control.Feedback type="invalid">{fieldError('recipientName')}</Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="gc-sender">
                      <Form.Label className="fw-semibold">{t('giftCard.senderName')}</Form.Label>
                      <Form.Control value={senderName} maxLength={100} required placeholder={t('giftCard.senderNamePlaceholder')}
                        onChange={e => setSenderName(e.target.value)} isInvalid={!!fieldError('senderName')} />
                      <Form.Control.Feedback type="invalid">{fieldError('senderName')}</Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="gc-message">
                      <Form.Label className="fw-semibold">{t('giftCard.message')}</Form.Label>
                      <Form.Control as="textarea" rows={3} value={message} maxLength={MESSAGE_MAX} placeholder={t('giftCard.messagePlaceholder')}
                        onChange={e => setMessage(e.target.value)} isInvalid={!!fieldError('message')} />
                      <div className="d-flex justify-content-between">
                        <Form.Control.Feedback type="invalid" className="d-block">{fieldError('message')}</Form.Control.Feedback>
                        <Form.Text className="ms-auto">{t('giftCard.messageCounter', { count: message.length })}</Form.Text>
                      </div>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="gc-email">
                      <Form.Label className="fw-semibold">{t('giftCard.recipientEmail')}</Form.Label>
                      <Form.Control type="email" value={recipientEmail} maxLength={256}
                        onChange={e => setRecipientEmail(e.target.value)} isInvalid={!!fieldError('recipientEmail')} />
                      <Form.Control.Feedback type="invalid">{fieldError('recipientEmail')}</Form.Control.Feedback>
                      <Form.Text>{t('giftCard.recipientEmailHint')}</Form.Text>
                    </Form.Group>

                    {error && <Alert variant="danger" className="py-2">{error}</Alert>}

                    <Button type="submit" variant="primary" size="lg" className="w-100" disabled={loading || !recipientName.trim() || !senderName.trim()}>
                      {t('giftCard.addToCart')} · {formatPrice(amount)}
                    </Button>
                    <div className="small text-muted mt-2">{t('giftCard.separatePurchase')}</div>
                  </Form>
                </Card.Body>
              </Card>

              <Card className="mt-4">
                <Card.Body>
                  <h5 className="fw-bold">{t('giftCard.howItWorksTitle')}</h5>
                  <ol className="mb-0 small">
                    <li>{t('giftCard.howItWorks1')}</li>
                    <li>{t('giftCard.howItWorks2')}</li>
                    <li>{config.validityMonths > 0
                      ? t('giftCard.howItWorks3', { months: config.validityMonths })
                      : t('giftCard.howItWorks3NoExpiry')}</li>
                  </ol>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6}>
              <div className="small text-muted mb-2">{t('giftCard.previewTitle')}</div>
              <div className="gift-card-preview" data-testid="gift-card-preview">
                <div className="gift-card-preview-inner">
                  {settings.logoUrl
                    ? <img src={settings.logoUrl} alt={settings.siteName} className="gift-card-preview-logo" />
                    : <div className="gift-card-preview-site">{settings.siteName}</div>}
                  <div className="gift-card-preview-title">{t('giftCard.title')}</div>
                  <div className="gift-card-preview-rule" />
                  <div className="gift-card-preview-label">{t('giftCard.previewFor')}</div>
                  <div className="gift-card-preview-recipient">{recipientName.trim() || '…'}</div>
                  <div className="gift-card-preview-amount">{formatPrice(amount)}</div>
                  {message.trim() && <div className="gift-card-preview-message">“{message.trim()}”</div>}
                  <div className="gift-card-preview-from">
                    {t('giftCard.previewFrom')} <strong>{senderName.trim() || '…'}</strong>
                  </div>
                  <div className="gift-card-preview-code mt-4">{t('giftCard.previewCode')}</div>
                </div>
              </div>
            </Col>
          </Row>
        )}

        <Card className="mt-4" style={{ maxWidth: 560 }}>
          <Card.Body>
            <h5 className="fw-bold">{t('giftCard.balanceTitle')}</h5>
            <Form onSubmit={handleCheckBalance} className="d-flex gap-2">
              <Form.Control value={balanceCode} onChange={e => setBalanceCode(e.target.value)} placeholder={t('giftCard.balancePlaceholder')}
                aria-label={t('giftCard.balanceTitle')} style={{ textTransform: 'uppercase' }} />
              <Button type="submit" variant="outline-primary" disabled={balanceLoading || !balanceCode.trim()}>
                {balanceLoading ? <Spinner size="sm" animation="border" /> : t('giftCard.balanceCheck')}
              </Button>
            </Form>
            {balanceError && <div className="text-danger small mt-2">{balanceError}</div>}
            {balance && (
              <div className="mt-2" data-testid="gift-card-balance">
                <div className="fw-semibold">{t('giftCard.balanceResult', { amount: formatPrice(balance.balance) })}</div>
                {balance.expiresAt && (
                  <div className="small text-muted">{t('giftCard.balanceExpires', { date: new Date(balance.expiresAt).toLocaleDateString() })}</div>
                )}
                {!balance.usable && <div className="small text-warning">{t('giftCard.balanceNotUsable')}</div>}
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>
    </MainLayout>
  );
};

export default GiftCardPage;
