import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge, Modal } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaMapMarkerAlt, FaUser } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import { getProfile, updateProfile, addAddress, updateAddress, deleteAddress } from '../../services/profileService';
import { getVisibleCountries, type VisibleCountry } from '../../services/countryService';
import type { StorefrontProfile, CustomerAddress } from '../../types';

const emptyAddress: Partial<CustomerAddress> = {
  alias: '', recipientName: '', street: '', city: '', postalCode: '', province: '', country: 'ES', phone: '', isDefault: false,
};

const AccountPage: React.FC = () => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<StorefrontProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Address modal
  const [showAddr, setShowAddr] = useState(false);
  const [addrForm, setAddrForm] = useState<Partial<CustomerAddress>>(emptyAddress);
  const [editAddrId, setEditAddrId] = useState<number | null>(null);
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrError, setAddrError] = useState('');
  const [countries, setCountries] = useState<VisibleCountry[]>([]);

  useEffect(() => {
    Promise.all([
      getProfile(),
      getVisibleCountries(),
    ])
      .then(([p, c]) => { setProfile(p); setName(p.name); setPhone(p.phone ?? ''); setTaxId(p.taxId ?? ''); setCountries(c); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setProfileMsg(null);
    try {
      await updateProfile({ name, phone: phone || undefined, taxId: taxId || undefined });
      setProfileMsg({ type: 'success', text: t('account.saved') });
    } catch {
      setProfileMsg({ type: 'danger', text: t('account.saveError') });
    } finally {
      setSaving(false);
    }
  };

  const openAddAddr = () => { setAddrForm(emptyAddress); setEditAddrId(null); setAddrError(''); setShowAddr(true); };
  const openEditAddr = (a: CustomerAddress) => { setAddrForm({ ...a }); setEditAddrId(a.id); setAddrError(''); setShowAddr(true); };

  const handleSaveAddr = async () => {
    setAddrSaving(true);
    setAddrError('');
    try {
      if (editAddrId) {
        await updateAddress(editAddrId, addrForm);
      } else {
        await addAddress(addrForm);
      }
      const p = await getProfile();
      setProfile(p);
      setShowAddr(false);
    } catch (e) {
      setAddrError((axios.isAxiosError(e) && e.response?.data?.message) ?? t('account.addrSaveError'));
    } finally {
      setAddrSaving(false);
    }
  };

  const handleDeleteAddr = async (id: number) => {
    if (!confirm(t('account.deleteConfirm'))) return;
    try {
      await deleteAddress(id);
      setProfile(p => p ? { ...p, addresses: p.addresses.filter(a => a.id !== id) } : p);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <MainLayout><div className="text-center py-5"><Spinner animation="border" variant="primary" /></div></MainLayout>;
  if (!profile) return null;

  return (
    <MainLayout>
      <Container className="py-4">
        <h2 className="fw-bold mb-4">{t('account.title')}</h2>

        <Row>
          {/* Profile */}
          <Col lg={5} className="mb-4">
            <Card>
              <Card.Body>
                <h5 className="fw-semibold mb-3"><FaUser className="me-2" />{t('account.personalData')}</h5>
                {profileMsg && <Alert variant={profileMsg.type} className="py-2">{profileMsg.text}</Alert>}
                <Form onSubmit={handleSaveProfile}>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('account.name')}</Form.Label>
                    <Form.Control value={name} onChange={e => setName(e.target.value)} required />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('account.email')}</Form.Label>
                    <Form.Control value={profile.email} disabled />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('account.phone')}</Form.Label>
                    <Form.Control value={phone} onChange={e => setPhone(e.target.value)} />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('account.taxId')}</Form.Label>
                    <Form.Control value={taxId} onChange={e => setTaxId(e.target.value)} />
                  </Form.Group>
                  {profile.customerGroupName && (
                    <p className="text-muted small mb-3">{t('account.group')} <strong>{profile.customerGroupName}</strong></p>
                  )}
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? <Spinner size="sm" animation="border" /> : t('account.save')}
                  </Button>
                </Form>

                <hr />
                <Link to="/account/orders" className="btn btn-outline-secondary btn-sm w-100">{t('account.viewOrders')}</Link>
              </Card.Body>
            </Card>
          </Col>

          {/* Addresses */}
          <Col lg={7} className="mb-4">
            <Card>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-semibold mb-0"><FaMapMarkerAlt className="me-2" />{t('account.myAddresses')}</h5>
                  <Button size="sm" variant="primary" onClick={openAddAddr}><FaPlus className="me-1" />{t('account.add')}</Button>
                </div>

                {profile.addresses.length === 0 ? (
                  <p className="text-muted text-center py-3">{t('account.noAddresses')}</p>
                ) : (
                  profile.addresses.map(a => (
                    <div key={a.id} className="border rounded p-3 mb-2 d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-semibold">
                          {a.alias}
                          {a.isDefault && <Badge bg="primary" className="ms-2 fs-xs">{t('account.defaultBadge')}</Badge>}
                        </div>
                        <div className="text-muted small">{a.recipientName}</div>
                        <div className="text-muted small">{a.street}, {a.postalCode} {a.city}{a.province ? `, ${a.province}` : ''}</div>
                        <div className="text-muted small">{a.country}{a.phone ? ` · ${a.phone}` : ''}</div>
                      </div>
                      <div className="d-flex gap-1 ms-2">
                        <Button size="sm" variant="outline-secondary" onClick={() => openEditAddr(a)}><FaEdit /></Button>
                        <Button size="sm" variant="outline-danger" onClick={() => handleDeleteAddr(a.id)}><FaTrash /></Button>
                      </div>
                    </div>
                  ))
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Address Modal */}
      <Modal show={showAddr} onHide={() => setShowAddr(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editAddrId ? t('account.editAddress') : t('account.newAddress')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {addrError && <Alert variant="danger" className="py-2">{addrError}</Alert>}
          <Row>
            <Col sm={6}>
              <Form.Group className="mb-2">
                <Form.Label>{t('account.alias')}</Form.Label>
                <Form.Control value={addrForm.alias ?? ''} onChange={e => setAddrForm(f => ({ ...f, alias: e.target.value }))} placeholder={t('account.aliasPlaceholder')} />
              </Form.Group>
            </Col>
            <Col sm={6}>
              <Form.Group className="mb-2">
                <Form.Label>{t('account.recipient')}</Form.Label>
                <Form.Control value={addrForm.recipientName ?? ''} onChange={e => setAddrForm(f => ({ ...f, recipientName: e.target.value }))} />
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-2">
            <Form.Label>{t('account.street')}</Form.Label>
            <Form.Control value={addrForm.street ?? ''} onChange={e => setAddrForm(f => ({ ...f, street: e.target.value }))} />
          </Form.Group>
          <Row>
            <Col sm={4}>
              <Form.Group className="mb-2">
                <Form.Label>{t('account.postalCode')}</Form.Label>
                <Form.Control value={addrForm.postalCode ?? ''} onChange={e => setAddrForm(f => ({ ...f, postalCode: e.target.value }))} />
              </Form.Group>
            </Col>
            <Col sm={8}>
              <Form.Group className="mb-2">
                <Form.Label>{t('account.city')}</Form.Label>
                <Form.Control value={addrForm.city ?? ''} onChange={e => setAddrForm(f => ({ ...f, city: e.target.value }))} />
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col sm={6}>
              <Form.Group className="mb-2">
                <Form.Label>{t('account.province')}</Form.Label>
                <Form.Control value={addrForm.province ?? ''} onChange={e => setAddrForm(f => ({ ...f, province: e.target.value }))} />
              </Form.Group>
            </Col>
            <Col sm={6}>
              <Form.Group className="mb-2">
                <Form.Label>{t('account.country')}</Form.Label>
                <Form.Select value={addrForm.country ?? 'ES'} onChange={e => setAddrForm(f => ({ ...f, country: e.target.value }))}>
                  <option value="">{t('account.selectCountry')}</option>
                  {countries.map(c => (
                    <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-2">
            <Form.Label>{t('account.phone')}</Form.Label>
            <Form.Control value={addrForm.phone ?? ''} onChange={e => setAddrForm(f => ({ ...f, phone: e.target.value }))} />
          </Form.Group>
          <Form.Check
            type="checkbox"
            label={t('account.defaultAddress')}
            checked={addrForm.isDefault ?? false}
            onChange={e => setAddrForm(f => ({ ...f, isDefault: e.target.checked }))}
            className="mt-2"
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddr(false)}>{t('account.cancel')}</Button>
          <Button variant="primary" onClick={handleSaveAddr} disabled={addrSaving}>
            {addrSaving ? <Spinner size="sm" animation="border" /> : t('account.save')}
          </Button>
        </Modal.Footer>
      </Modal>
    </MainLayout>
  );
};

export default AccountPage;
