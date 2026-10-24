import React, { useState } from 'react';
import { Button, Table } from 'react-bootstrap';
import { FaCopy, FaCheck } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import IconTooltip from '../common/IconTooltip/IconTooltip';
import { formatPrice } from '../../utils/pricing';
import { lastDayToPay } from '../../utils/bankTransfer';
import type { BankTransferDetails as Details } from '../../types';

// The IBAN and the concept are copied, not retyped: a wrong character sends the money elsewhere
// or leaves the payment unmatched.
const CopyButton: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
    }
  };
  return (
    <>
      <IconTooltip label={copied ? t('bankTransfer.copied') : label}>
        <Button variant="link" size="sm" className="p-0 ms-2 align-baseline" aria-label={label} onClick={copy}>
          {copied ? <FaCheck className="text-success" /> : <FaCopy />}
        </Button>
      </IconTooltip>
      {failed && <div className="small text-danger">{t('bankTransfer.copyFailed')}</div>}
    </>
  );
};

/** What to transfer, where and by when — for an order placed to pay by bank transfer. */
const BankTransferDetails: React.FC<{ details: Details }> = ({ details }) => {
  const { t } = useTranslation();
  return (
    <>
      <Table size="sm" className="mb-2 text-start" style={{ tableLayout: 'fixed', overflowWrap: 'anywhere' }}>
        <colgroup><col style={{ width: '7.5rem' }} /><col /></colgroup>
        <tbody>
          <tr>
            <th className="text-muted fw-normal">{t('bankTransfer.amount')}</th>
            <td className="fw-bold">{formatPrice(details.amount)}</td>
          </tr>
          <tr>
            <th className="text-muted fw-normal">{t('bankTransfer.iban')}</th>
            {/* The IBAN may wrap between its groups of four: kept on one line it pushed the table out
                of the card on a phone (2026-10-24). */}
            <td className="fw-bold">
              {details.iban}
              <CopyButton value={details.iban.replace(/\s+/g, '')} label={t('bankTransfer.copyIban')} />
            </td>
          </tr>
          <tr>
            <th className="text-muted fw-normal">{t('bankTransfer.holder')}</th>
            <td>{details.accountHolder}</td>
          </tr>
          <tr>
            <th className="text-muted fw-normal">{t('bankTransfer.concept')}</th>
            <td className="fw-bold">
              {details.concept}
              <CopyButton value={details.concept} label={t('bankTransfer.copyConcept')} />
            </td>
          </tr>
          <tr>
            <th className="text-muted fw-normal">{t('bankTransfer.deadline')}</th>
            <td>{lastDayToPay(details.paymentDueAt)}</td>
          </tr>
        </tbody>
      </Table>
      <p className="small text-muted mb-0 text-start">{t('bankTransfer.note')}</p>
    </>
  );
};

export default BankTransferDetails;
