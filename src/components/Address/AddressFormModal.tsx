import React, { useEffect, useState } from 'react';
import { Row, Col, Form, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { addAddress, updateAddress } from '../../services/profileService';
import { getVisibleCountries, type VisibleCountry } from '../../services/countryService';
import { getApiErrorMessage, parseFieldErrors, type FieldErrors } from '../../utils/apiError';
import type { CustomerAddress } from '../../types';
import { countryName } from '../../utils/locale';
import AddressAutocomplete from '../common/AddressAutocomplete/AddressAutocomplete';

const emptyAddress: Partial<CustomerAddress> = {
  alias: '', recipientName: '', street: '', city: '', postalCode: '', province: '', country: 'ES', phone: '', isDefault: false,
};

// The fields with an input of their own (and so their own error message).
const SHOWN_FIELDS = new Set(['alias', 'recipientName', 'street', 'city', 'postalCode', 'country', 'province', 'phone']);

interface Props {
  show: boolean;
  /** The address to edit; null/undefined adds a new one. */
  address?: CustomerAddress | null;
  onHide: () => void;
  /** After a successful save; `createdId` is the new address's id (undefined when editing). */
  onSaved: (createdId?: number) => void;
}

/**
 * The shopper's address form (new or edit), with Google street suggestions. Used on Mi cuenta and
 * at checkout, where adding an address used to mean leaving the page (and the order notes typed).
 * Validates the required fields, saves through the profile API and shows its own errors.
 */
const AddressFormModal: React.FC<Props> = ({ show, address, onHide, onSaved }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<Partial<CustomerAddress>>(emptyAddress);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [countries, setCountries] = useState<VisibleCountry[]>([]);
  const editId = address?.id ?? null;

  // A fresh form each time it opens: the address being edited, or a blank one.
  useEffect(() => {
    if (!show) return;
    setForm(address ? { ...address } : emptyAddress);
    setError('');
    setFieldErrors({});
  }, [show, address]);

  // The countries the shop ships to, once, the first time the form opens.
  useEffect(() => {
    if (!show || countries.length > 0) return;
    getVisibleCountries()
      .then(setCountries)
      .catch(err => setError(getApiErrorMessage(err, t('account.loadError'))));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t only formats the error message
  }, [show]);

  // Typing into a field that was flagged by the last save clears that field's message.
  const update = (patch: Partial<CustomerAddress>) => {
    setForm(f => ({ ...f, ...patch }));
    setFieldErrors(errs => {
      const fixed = Object.keys(patch).filter(k => errs[k] && String(patch[k as keyof CustomerAddress] ?? '').trim());
      if (fixed.length === 0) return errs;
      const rest = { ...errs };
      fixed.forEach(k => delete rest[k]);
      return rest;
    });
  };

  const handleSave = async () => {
    const errs: FieldErrors = {};
    if (!form.alias?.trim()) errs.alias = t('common.fieldRequired');
    if (!form.recipientName?.trim()) errs.recipientName = t('common.fieldRequired');
    if (!form.street?.trim()) errs.street = t('common.fieldRequired');
    if (!form.city?.trim()) errs.city = t('common.fieldRequired');
    if (!form.postalCode?.trim()) errs.postalCode = t('common.fieldRequired');
    if (!form.country?.trim()) errs.country = t('common.fieldRequired');
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      let createdId: number | undefined;
      if (editId) await updateAddress(editId, form);
      else createdId = (await addAddress(form)).id;
      onSaved(createdId);
    } catch (e) {
      const fe = parseFieldErrors(e);
      if (fe) {
        setFieldErrors(fe);
        // An error for a field without an input here would leave Save doing nothing visible.
        const unshown = Object.entries(fe).filter(([field]) => !SHOWN_FIELDS.has(field)).map(([, message]) => message);
        if (unshown.length > 0) setError(unshown.join(' '));
      }
      else setError(getApiErrorMessage(e, t('account.addrSaveError')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{editId ? t('account.editAddress') : t('account.newAddress')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger" className="py-2">{error}</Alert>}
        <Row>
          <Col sm={6}>
            <Form.Group controlId="address-alias" className="mb-2">
              <Form.Label>{t('account.alias')}</Form.Label>
              <Form.Control
                value={form.alias ?? ''}
                onChange={e => update({ alias: e.target.value })}
                placeholder={t('account.aliasPlaceholder')}
                isInvalid={!!fieldErrors.alias}
              />
              <Form.Control.Feedback type="invalid">{fieldErrors.alias}</Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col sm={6}>
            <Form.Group controlId="address-recipient" className="mb-2">
              <Form.Label>{t('account.recipient')}</Form.Label>
              <Form.Control
                value={form.recipientName ?? ''}
                onChange={e => update({ recipientName: e.target.value })}
                isInvalid={!!fieldErrors.recipientName}
              />
              <Form.Control.Feedback type="invalid">{fieldErrors.recipientName}</Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>
        {/* Country first: the street suggestions search in the chosen country. */}
        <Row>
          <Col sm={6}>
            <Form.Group className="mb-2" controlId="address-country">
              <Form.Label>{t('account.country')}</Form.Label>
              <Form.Select
                value={form.country ?? 'ES'}
                onChange={e => update({ country: e.target.value })}
                isInvalid={!!fieldErrors.country}
              >
                <option value="">{t('account.selectCountry')}</option>
                {countries.map(c => (
                  <option key={c.isoCode} value={c.isoCode}>{countryName(c.isoCode)}</option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">{fieldErrors.country}</Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>
        <Form.Group controlId="address-street" className="mb-2">
          <Form.Label>{t('account.street')}</Form.Label>
          <AddressAutocomplete
            value={form.street ?? ''}
            onChange={street => update({ street })}
            // The picked address replaces the old one's parts: a part Google doesn't know stays
            // empty (and is asked for on save) rather than keeping the previous address's.
            onSelect={a => update({
              street: a.street,
              postalCode: a.postalCode,
              city: a.city,
              province: a.province,
              // Only a country the shop ships to; otherwise keep the one already chosen.
              country: countries.some(c => c.isoCode === a.country) ? a.country : form.country,
            })}
            regionCodes={form.country ? [form.country] : []}
            isInvalid={!!fieldErrors.street}
            feedback={<Form.Control.Feedback type="invalid">{fieldErrors.street}</Form.Control.Feedback>}
          />
        </Form.Group>
        <Row>
          <Col sm={4}>
            <Form.Group controlId="address-postalcode" className="mb-2">
              <Form.Label>{t('account.postalCode')}</Form.Label>
              <Form.Control
                value={form.postalCode ?? ''}
                onChange={e => update({ postalCode: e.target.value })}
                isInvalid={!!fieldErrors.postalCode}
              />
              <Form.Control.Feedback type="invalid">{fieldErrors.postalCode}</Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col sm={8}>
            <Form.Group controlId="address-city" className="mb-2">
              <Form.Label>{t('account.city')}</Form.Label>
              <Form.Control
                value={form.city ?? ''}
                onChange={e => update({ city: e.target.value })}
                isInvalid={!!fieldErrors.city}
              />
              <Form.Control.Feedback type="invalid">{fieldErrors.city}</Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col sm={6}>
            <Form.Group controlId="address-province" className="mb-2">
              <Form.Label>{t('account.province')}</Form.Label>
              <Form.Control value={form.province ?? ''} onChange={e => update({ province: e.target.value })} isInvalid={!!fieldErrors.province} />
              <Form.Control.Feedback type="invalid">{fieldErrors.province}</Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col sm={6}>
            <Form.Group controlId="address-phone" className="mb-2">
              <Form.Label>{t('account.phone')}</Form.Label>
              <Form.Control value={form.phone ?? ''} onChange={e => update({ phone: e.target.value })} isInvalid={!!fieldErrors.phone} />
              <Form.Control.Feedback type="invalid">{fieldErrors.phone}</Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>
        <Form.Check
          type="checkbox"
          label={t('account.defaultAddress')}
          checked={form.isDefault ?? false}
          onChange={e => update({ isDefault: e.target.checked })}
          className="mt-2"
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>{t('account.cancel')}</Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? <Spinner size="sm" animation="border" /> : t('account.save')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddressFormModal;
