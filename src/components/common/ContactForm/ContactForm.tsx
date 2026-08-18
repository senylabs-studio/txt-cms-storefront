import React, { useState } from 'react';
import { Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { submitContactForm } from '../../../services/contactService';
import './ContactForm.css';

const ContactForm: React.FC = () => {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await submitContactForm({ name, email, phone: phone || undefined, message });
      setSent(true);
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch {
      setError(t('contact.error'));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return <Alert variant="success" className="contact-form-success">{t('contact.success')}</Alert>;
  }

  return (
    <Form className="contact-form" onSubmit={handleSubmit}>
      <h2 className="contact-form-title">{t('contact.title')}</h2>
      {error && <Alert variant="danger" className="py-2">{error}</Alert>}
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>{t('contact.name')}</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              maxLength={150}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>{t('contact.email')}</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              maxLength={200}
            />
          </Form.Group>
        </Col>
      </Row>
      <Form.Group className="mb-3">
        <Form.Label>{t('contact.phone')} <span className="text-muted">({t('contact.optional')})</span></Form.Label>
        <Form.Control
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          maxLength={30}
        />
      </Form.Group>
      <Form.Group className="mb-4">
        <Form.Label>{t('contact.message')}</Form.Label>
        <Form.Control
          as="textarea"
          rows={5}
          value={message}
          onChange={e => setMessage(e.target.value)}
          required
          maxLength={2000}
        />
      </Form.Group>
      <Button type="submit" variant="primary" disabled={loading}>
        {loading ? <><Spinner size="sm" animation="border" className="me-2" />{t('contact.sending')}</> : t('contact.submit')}
      </Button>
    </Form>
  );
};

export default ContactForm;
