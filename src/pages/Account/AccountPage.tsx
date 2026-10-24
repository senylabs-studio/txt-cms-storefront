import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge, Modal } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaMapMarkerAlt, FaUser, FaLock, FaShieldAlt, FaEnvelope } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import MainLayout from '../../components/Layout/MainLayout';
import {
  getProfile, updateProfile, changePassword, updateEmail, resendEmailConfirmation, deleteAddress, updateNewsletterSubscription,
  downloadMyDataExport, requestAccountDeletion,
} from '../../services/profileService';
import { useToast } from '../../contexts/ToastContext';
import { getApiErrorMessage, parseFieldErrors, withoutFieldError, type FieldErrors } from '../../utils/apiError';
import type { StorefrontProfile, CustomerAddress } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { meetsPasswordRules } from '../../utils/password';
import IconTooltip from '../../components/common/IconTooltip/IconTooltip';
import PageLoader from '../../components/common/ScissorsLoader/PageLoader';
import { countryName } from '../../utils/locale';
import AddressFormModal from '../../components/Address/AddressFormModal';
import PasswordInput from '../../components/common/PasswordInput/PasswordInput';

const AccountPage: React.FC = () => {
  const { t } = useTranslation();
  const { siteName } = useSiteSettings();
  // The tab title: this screen's, not the previous page's.
  useDocumentMeta(`${t('account.title')} — ${siteName}`);
  const { login, updateUser } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<StorefrontProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Profile form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Newsletter switch
  const [newsletterSaving, setNewsletterSaving] = useState(false);
  const handleNewsletterChange = async (subscribed: boolean) => {
    setNewsletterSaving(true);
    try {
      const { pendingConfirmation } = await updateNewsletterSubscription(subscribed);
      // Pending = a confirmation email went out; the switch stays off until it's clicked.
      setProfile(p => (p ? { ...p, isSubscribedToNewsletter: subscribed && !pendingConfirmation } : p));
      showToast(pendingConfirmation ? 'info' : 'success',
        t(pendingConfirmation ? 'account.newsletterPending' : subscribed ? 'account.newsletterOn' : 'account.newsletterOff'));
    } catch (err) {
      showToast('danger', getApiErrorMessage(err, t('account.newsletterError')));
    } finally {
      setNewsletterSaving(false);
    }
  };

  // "Resend the confirmation link" under an unconfirmed email
  const [resending, setResending] = useState(false);
  const handleResendConfirmation = async () => {
    setResending(true);
    try {
      const { sent, alreadyConfirmed } = await resendEmailConfirmation();
      if (alreadyConfirmed) setProfile(p => (p ? { ...p, emailConfirmed: true } : p));
      showToast(sent ? 'success' : 'info',
        t(alreadyConfirmed ? 'account.confirmationAlready' : sent ? 'account.confirmationSent' : 'account.confirmationRecentlySent'));
    } catch (err) {
      showToast('danger', getApiErrorMessage(err, t('account.confirmationError')));
    } finally {
      setResending(false);
    }
  };

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [pwdFieldErrors, setPwdFieldErrors] = useState<FieldErrors>({});

  // Change email modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailFieldErrors, setEmailFieldErrors] = useState<FieldErrors>({});

  // Address modal: closed, a new address (null) or the one being edited.
  const [addrModal, setAddrModal] = useState<{ address: CustomerAddress | null } | null>(null);
  const [addrListError, setAddrListError] = useState('');

  // Privacy (GDPR)
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadInitialData = () => {
    setLoading(true);
    setLoadError('');
    getProfile()
      .then(p => { setProfile(p); setName(p.name); setPhone(p.phone ?? ''); setTaxId(p.taxId ?? ''); })
      .catch(err => setLoadError(getApiErrorMessage(err, t('account.loadError'))))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadInitialData is redefined every render; load once per mount
  useEffect(() => { loadInitialData(); }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setProfileMsg(null);
    try {
      await updateProfile({ name, phone: phone || undefined, taxId: taxId || undefined });
      updateUser({ name });
      setProfileMsg({ type: 'success', text: t('account.saved') });
    } catch (err) {
      setProfileMsg({ type: 'danger', text: getApiErrorMessage(err, t('account.saveError')) });
    } finally {
      setSaving(false);
    }
  };

  const openEmailModal = () => {
    setNewEmail(profile?.email ?? '');
    setEmailPassword('');
    setEmailError('');
    setEmailFieldErrors({});
    setShowEmailModal(true);
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setEmailFieldErrors({});
    setEmailSaving(true);
    try {
      const { pendingConfirmation } = await updateEmail(newEmail, profile?.isGuest ? undefined : emailPassword);
      setShowEmailModal(false);
      // Registered: nothing changes until the link sent to the new address is clicked.
      if (pendingConfirmation) {
        showToast('info', t('account.emailChangePending', { email: newEmail }));
        return;
      }
      updateUser({ email: newEmail });
      setProfile(p => p ? { ...p, email: newEmail } : p);
      showToast('success', t('account.emailChangeSuccess'));
    } catch (e) {
      const fe = parseFieldErrors(e);
      if (fe) setEmailFieldErrors(fe);
      else setEmailError(getApiErrorMessage(e, t('account.emailChangeError')));
    } finally {
      setEmailSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    setPwdFieldErrors({});
    if (!meetsPasswordRules(newPassword)) {
      setPwdFieldErrors({ newPassword: t('auth.register.passwordHint') });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdFieldErrors({ confirmPassword: t('account.passwordMismatch') });
      return;
    }
    setPwdSaving(true);
    try {
      // Same as the email change: keep this session signed in with the fresh token.
      login(await changePassword(currentPassword, newPassword));
      setPwdMsg({ type: 'success', text: t('account.passwordChanged') });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e) {
      const fe = parseFieldErrors(e);
      if (fe) setPwdFieldErrors(fe);
      else setPwdMsg({ type: 'danger', text: getApiErrorMessage(e, t('account.passwordChangeError')) });
    } finally {
      setPwdSaving(false);
    }
  };

  const openAddAddr = () => setAddrModal({ address: null });
  const openEditAddr = (a: CustomerAddress) => setAddrModal({ address: a });
  const handleAddrSaved = async () => {
    setAddrModal(null);
    showToast('success', t('account.addrSaveSuccess'));
    try { setProfile(await getProfile()); }
    catch (e) { setAddrListError(getApiErrorMessage(e, t('account.loadError'))); }
  };

  // Asked in a modal (house rule: never window.confirm).
  const [addrToDelete, setAddrToDelete] = useState<number | null>(null);
  const handleDeleteAddr = async (id: number) => {
    setAddrToDelete(null);
    setAddrListError('');
    try {
      await deleteAddress(id);
      // Reload rather than filter locally: deleting the default address makes the backend promote
      // another one to default, which a local filter wouldn't show.
      setProfile(await getProfile());
      showToast('success', t('account.addrDeleteSuccess'));
    } catch (e) {
      setAddrListError(getApiErrorMessage(e, t('account.addrDeleteError')));
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    setExportError('');
    try {
      await downloadMyDataExport();
      showToast('success', t('account.exportDataSuccess'));
    } catch (err) {
      setExportError(getApiErrorMessage(err, t('account.exportDataError')));
    } finally {
      setExporting(false);
    }
  };

  const handleRequestDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteSaving(true);
    setDeleteError('');
    try {
      await requestAccountDeletion(deleteReason || undefined);
      setProfile(p => p ? { ...p, deletionRequested: true } : p);
      setShowDeleteModal(false);
      setDeleteReason('');
      showToast('success', t('account.deletionRequestSuccess'));
    } catch (e) {
      setDeleteError(getApiErrorMessage(e, t('account.deletionRequestError')));
    } finally {
      setDeleteSaving(false);
    }
  };

  if (loading) return <MainLayout><PageLoader /></MainLayout>;
  if (!profile) return (
    <MainLayout>
      <Container className="py-5 text-center">
        <Alert variant="danger">{loadError}</Alert>
        <Button variant="primary" onClick={loadInitialData}>{t('account.retry')}</Button>
      </Container>
    </MainLayout>
  );

  return (
    <MainLayout>
      <Container className="py-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
          <h2 className="fw-bold mb-0">{t('account.title')}</h2>
          <Link to="/account/orders" className="btn btn-outline-secondary">{t('account.viewOrders')}</Link>
        </div>

        <Row>
          {/* Profile */}
          <Col lg={6} className="mb-4">
            <Card>
              <Card.Body>
                <h5 className="fw-semibold mb-3"><FaUser className="me-2" />{t('account.personalData')}</h5>
                {profileMsg && <Alert variant={profileMsg.type} className="py-2">{profileMsg.text}</Alert>}
                <Form onSubmit={handleSaveProfile}>
                  <Form.Group controlId="account-name" className="mb-3">
                    <Form.Label>{t('account.name')}</Form.Label>
                    <Form.Control value={name} onChange={e => setName(e.target.value)} required />
                  </Form.Group>
                  <Form.Group controlId="account-email" className="mb-3">
                    <Form.Label>{t('account.email')}</Form.Label>
                    <div className="d-flex gap-2">
                      <Form.Control value={profile.email} disabled />
                      <IconTooltip label={t('account.changeEmailTitle')}>
                        <Button variant="outline-secondary" onClick={openEmailModal} aria-label={t('account.changeEmailTitle')}>
                          <FaEdit />
                        </Button>
                      </IconTooltip>
                    </div>
                    {!profile.isGuest && profile.emailConfirmed === false && (
                      <Form.Text className="text-warning-emphasis d-block mt-1">
                        {t('account.emailNotConfirmed')}{' '}
                        <Button variant="link" size="sm" className="p-0 align-baseline" onClick={handleResendConfirmation} disabled={resending}>
                          {t('account.resendConfirmation')}
                        </Button>
                      </Form.Text>
                    )}
                  </Form.Group>
                  <Form.Group controlId="account-phone" className="mb-3">
                    <Form.Label>{t('account.phone')}</Form.Label>
                    <Form.Control value={phone} onChange={e => setPhone(e.target.value)} />
                  </Form.Group>
                  <Form.Group controlId="account-taxid" className="mb-3">
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
              </Card.Body>
            </Card>

            {/* A guest has no password (the backend 404s this for them) — they set one by converting. */}
            {!profile?.isGuest && (
              <Card className="mt-4">
                <Card.Body>
                  <h5 className="fw-semibold mb-3"><FaLock className="me-2" />{t('account.changePasswordTitle')}</h5>
                  {pwdMsg && <Alert variant={pwdMsg.type} className="py-2">{pwdMsg.text}</Alert>}
                  <Form onSubmit={handleChangePassword}>
                    <Form.Group controlId="account-currentpassword" className="mb-3">
                      <Form.Label>{t('account.currentPassword')}</Form.Label>
                      <PasswordInput
                        value={currentPassword}
                        onChange={e => { setCurrentPassword(e.target.value); setPwdFieldErrors(errs => withoutFieldError(errs, 'currentPassword')); }}
                        required autoComplete="current-password" isInvalid={!!pwdFieldErrors.currentPassword}
                        feedback={pwdFieldErrors.currentPassword}
                      />
                    </Form.Group>
                    <Form.Group controlId="account-newpassword" className="mb-3">
                      <Form.Label>{t('account.newPassword')}</Form.Label>
                      <PasswordInput
                        showRules
                        value={newPassword}
                        onChange={e => { setNewPassword(e.target.value); setPwdFieldErrors(errs => withoutFieldError(errs, 'newPassword')); }}
                        required autoComplete="new-password" minLength={6} isInvalid={!!pwdFieldErrors.newPassword}
                        feedback={pwdFieldErrors.newPassword}
                      />
                    </Form.Group>
                    <Form.Group controlId="account-confirmpassword" className="mb-3">
                      <Form.Label>{t('account.confirmPassword')}</Form.Label>
                      <PasswordInput
                        value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setPwdFieldErrors(errs => withoutFieldError(errs, 'confirmPassword')); }}
                        required autoComplete="new-password" isInvalid={!!pwdFieldErrors.confirmPassword}
                        feedback={pwdFieldErrors.confirmPassword}
                      />
                    </Form.Group>
                    <Button type="submit" variant="primary" disabled={pwdSaving}>
                      {pwdSaving ? <Spinner size="sm" animation="border" /> : t('account.changePassword')}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            )}

          </Col>

          {/* Addresses, newsletter and privacy */}
          <Col lg={6} className="mb-4">
            <Card>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-semibold mb-0"><FaMapMarkerAlt className="me-2" />{t('account.myAddresses')}</h5>
                  <Button size="sm" variant="primary" onClick={openAddAddr}><FaPlus className="me-1" />{t('account.add')}</Button>
                </div>

                {addrListError && <Alert variant="danger" dismissible onClose={() => setAddrListError('')} className="py-2">{addrListError}</Alert>}

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
                        <div className="text-muted small">{countryName(a.country)}{a.phone ? ` · ${a.phone}` : ''}</div>
                      </div>
                      <div className="d-flex gap-1 ms-2">
                        <IconTooltip label={t('account.editAddress')}>
                          <Button size="sm" variant="outline-secondary" aria-label={t('account.editAddress')} onClick={() => openEditAddr(a)}><FaEdit /></Button>
                        </IconTooltip>
                        <IconTooltip label={t('account.deleteAddress')}>
                          <Button size="sm" variant="outline-danger" aria-label={t('account.deleteAddress')} onClick={() => setAddrToDelete(a.id)}><FaTrash /></Button>
                        </IconTooltip>
                      </div>
                    </div>
                  ))
                )}
              </Card.Body>
            </Card>

            {profile && (
              <Card className="mt-4">
                <Card.Body>
                  <h5 className="fw-semibold mb-3"><FaEnvelope className="me-2" />{t('account.newsletterTitle')}</h5>
                  <Form.Check
                    type="switch" id="account-newsletter" disabled={newsletterSaving}
                    checked={!!profile.isSubscribedToNewsletter}
                    onChange={e => handleNewsletterChange(e.target.checked)}
                    label={t('account.newsletterLabel')}
                  />
                  <p className="text-muted small mb-0 mt-2">{t('account.newsletterHint')}</p>
                </Card.Body>
              </Card>
            )}

            <Card className="mt-4">
              <Card.Body>
                <h5 className="fw-semibold mb-3"><FaShieldAlt className="me-2" />{t('account.privacyTitle')}</h5>

                {exportError && <Alert variant="danger" className="py-2">{exportError}</Alert>}
                <p className="text-muted small mb-2">{t('account.exportDataSubtitle')}</p>
                <Button variant="outline-secondary" size="sm" className="w-100 mb-4" onClick={handleExportData} disabled={exporting}>
                  {exporting ? <Spinner size="sm" animation="border" /> : t('account.exportData')}
                </Button>

                <hr />

                {profile.deletionRequested ? (
                  <Alert variant="info" className="mb-0">{t('account.deletionPending')}</Alert>
                ) : (
                  <>
                    <p className="text-muted small mb-2">{t('account.deleteAccountSubtitle')}</p>
                    <Button variant="outline-danger" size="sm" className="w-100" onClick={() => setShowDeleteModal(true)}>
                      {t('account.deleteAccount')}
                    </Button>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Change Email Modal */}
      <Modal show={showEmailModal} onHide={() => setShowEmailModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('account.changeEmailTitle')}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateEmail}>
          <Modal.Body>
            {emailError && <Alert variant="danger" className="py-2">{emailError}</Alert>}
            <Form.Group controlId="account-newemail" className="mb-3">
              <Form.Label>{t('account.newEmail')}</Form.Label>
              <Form.Control
                type="email"
                value={newEmail}
                onChange={e => { setNewEmail(e.target.value); setEmailFieldErrors(errs => withoutFieldError(errs, 'newEmail')); }}
                required
                autoComplete="email"
                isInvalid={!!emailFieldErrors.newEmail}
              />
              <Form.Control.Feedback type="invalid">{emailFieldErrors.newEmail}</Form.Control.Feedback>
            </Form.Group>
            {!profile.isGuest && (
              <Form.Group controlId="account-currentpasswordforemail" className="mb-2">
                <Form.Label>{t('account.currentPasswordForEmail')}</Form.Label>
                <PasswordInput
                  value={emailPassword}
                  onChange={e => { setEmailPassword(e.target.value); setEmailFieldErrors(errs => withoutFieldError(errs, 'currentPassword')); }}
                  required
                  autoComplete="current-password"
                  isInvalid={!!emailFieldErrors.currentPassword}
                  feedback={emailFieldErrors.currentPassword}
                />
              </Form.Group>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEmailModal(false)}>{t('account.cancel')}</Button>
            <Button type="submit" variant="primary" disabled={emailSaving}>
              {emailSaving ? <Spinner size="sm" animation="border" /> : t('account.save')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <AddressFormModal
        show={addrModal !== null}
        address={addrModal?.address}
        onHide={() => setAddrModal(null)}
        onSaved={handleAddrSaved}
      />

      <Modal show={addrToDelete != null} onHide={() => setAddrToDelete(null)} centered>
        <Modal.Body>{t('account.deleteConfirm')}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setAddrToDelete(null)}>{t('account.cancel')}</Button>
          <Button variant="danger" onClick={() => addrToDelete != null && handleDeleteAddr(addrToDelete)}>{t('account.deleteAddressConfirm')}</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('account.deleteAccount')}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleRequestDeletion}>
          <Modal.Body>
            <p>{t('account.deleteAccountWarning')}</p>
            {deleteError && <Alert variant="danger" className="py-2">{deleteError}</Alert>}
            <Form.Group controlId="account-deletereasonlabel">
              <Form.Label>{t('account.deleteReasonLabel')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                placeholder={t('account.deleteReasonPlaceholder')}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>{t('account.cancel')}</Button>
            <Button type="submit" variant="danger" disabled={deleteSaving}>
              {deleteSaving ? <Spinner size="sm" animation="border" /> : t('account.confirmDeleteAccount')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </MainLayout>
  );
};

export default AccountPage;
