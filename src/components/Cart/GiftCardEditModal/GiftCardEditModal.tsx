import React, { useEffect, useState } from 'react';
import { Modal, Form, Button, Alert, InputGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../../contexts/CartContext';
import { getGiftCardConfig } from '../../../services/giftCardService';
import { getApiErrorMessage } from '../../../utils/apiError';
import { snapGiftCardAmount } from '../../../utils/giftCard';
import type { CartItem, GiftCardConfig } from '../../../types';

interface Props {
  /** The gift card line being edited; null hides the modal. */
  item: CartItem | null;
  onClose: () => void;
  onSaved: () => void;
}

const MESSAGE_MAX = 500;

/** Corrects a gift card already in the cart — amount, who it's for, the message — in place. */
const GiftCardEditModal: React.FC<Props> = ({ item, onClose, onSaved }) => {
  const { t } = useTranslation();
  const { updateGiftCard, loading } = useCart();
  const [config, setConfig] = useState<GiftCardConfig | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!item?.giftCard) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fills the form from the line each time the modal opens on one
    setAmountInput(String(item.subtotal));
    setRecipientName(item.giftCard.recipientName);
    setRecipientEmail(item.giftCard.recipientEmail ?? '');
    setSenderName(item.giftCard.senderName);
    setMessage(item.giftCard.message ?? '');
    setError('');
    let cancelled = false;
    getGiftCardConfig().then(c => { if (!cancelled) setConfig(c); }).catch(() => { /* the server still checks the amount */ });
    return () => { cancelled = true; };
  }, [item]);

  const amount = () => {
    const value = parseFloat(amountInput);
    return config ? snapGiftCardAmount(value, config.minAmount, config.maxAmount, config.amountStep) : value;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    setError('');
    try {
      await updateGiftCard(item.id, {
        amount: amount(),
        recipientName: recipientName.trim(),
        recipientEmail: recipientEmail.trim() || undefined,
        senderName: senderName.trim(),
        message: message.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      setError(getApiErrorMessage(err, t('giftCard.editError')));
    }
  };

  return (
    <Modal show={!!item} onHide={loading ? undefined : onClose}>
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title>{t('giftCard.editTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" className="py-2">{error}</Alert>}
          <Form.Group className="mb-3" controlId="gce-amount">
            <Form.Label className="fw-semibold">{t('giftCard.amountLabel')}</Form.Label>
            <InputGroup style={{ maxWidth: 200 }}>
              <Form.Control type="number" inputMode="numeric" value={amountInput}
                min={config?.minAmount} max={config?.maxAmount} step={config?.amountStep}
                onChange={e => setAmountInput(e.target.value)}
                onBlur={() => setAmountInput(String(amount()))} />
              <InputGroup.Text>€</InputGroup.Text>
            </InputGroup>
          </Form.Group>
          <Form.Group className="mb-3" controlId="gce-recipient">
            <Form.Label className="fw-semibold">{t('giftCard.recipientName')}</Form.Label>
            <Form.Control maxLength={100} value={recipientName} onChange={e => setRecipientName(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3" controlId="gce-sender">
            <Form.Label className="fw-semibold">{t('giftCard.senderName')}</Form.Label>
            <Form.Control maxLength={100} value={senderName} onChange={e => setSenderName(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3" controlId="gce-message">
            <Form.Label className="fw-semibold">{t('giftCard.message')}</Form.Label>
            <Form.Control as="textarea" rows={3} maxLength={MESSAGE_MAX} value={message} onChange={e => setMessage(e.target.value)} />
            <Form.Text>{t('giftCard.messageCounter', { count: message.length })}</Form.Text>
          </Form.Group>
          <Form.Group controlId="gce-email">
            <Form.Label className="fw-semibold">{t('giftCard.recipientEmail')}</Form.Label>
            <Form.Control type="email" maxLength={256} value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} />
            <Form.Text>{t('giftCard.recipientEmailHint')}</Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={loading}>{t('giftCard.editCancel')}</Button>
          <Button type="submit" variant="primary" disabled={loading || !recipientName.trim() || !senderName.trim()}>{t('giftCard.editSave')}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default GiftCardEditModal;
