'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { recoveryOutcome } from '../../core/recovery-outcome.mjs';
import type { Action, RecoveryInput } from '../../core/workspace.mjs';

export function ConnectedRecovery({ action, currency, disabled, save }: {
  action: Action;
  currency: string;
  disabled: boolean;
  save: (input: RecoveryInput) => Promise<unknown>;
}) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [evidence, setEvidence] = useState('');
  const [message, setMessage] = useState('');
  return <details className="action-source">
    <summary>Record or correct reported recovery</summary>
    <p className="muted">Enter the total recovery for this action, not an additional payment. Corrections create history and do not change the action status. Unsaved entries stay in this page only.</p>
    <form className="cloud-form" onSubmit={event => {
      event.preventDefault();
      if (disabled) return;
      setMessage('');
      let input: RecoveryInput;
      try { input = recoveryOutcome(amount, currency, date, evidence); }
      catch { setMessage('Enter a non-negative amount with up to two decimal places, a valid date and recovery evidence.'); return; }
      void save(input).then(() => { setAmount(''); setDate(''); setEvidence(''); setMessage('Reported recovery saved.'); }).catch(() => {
        setMessage('Entry retained. Check the workspace message and any recovery review before trying again.');
      });
    }}>
      <label>Total reported recovery ({currency})<Input aria-label={`Recovery amount for ${action.title}`} inputMode="decimal" required value={amount} disabled={disabled} onChange={event => setAmount(event.target.value)} /></label>
      <label>Recovery date<Input type="date" required value={date} disabled={disabled} onChange={event => setDate(event.target.value)} /></label>
      <label>Recovery evidence<Input required maxLength={1000} value={evidence} disabled={disabled} onChange={event => setEvidence(event.target.value)} /></label>
      <Button type="submit" disabled={disabled}>Save reported recovery</Button>
      <Button type="button" variant="outline" disabled={disabled} onClick={() => { setAmount(''); setDate(''); setEvidence(''); setMessage('Unsaved entry discarded. Saved recovery is unchanged.'); }}>Discard entry</Button>
      <output aria-live="polite">{message}</output>
    </form>
  </details>;
}
