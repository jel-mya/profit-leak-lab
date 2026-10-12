'use client';
import { useRef, useState, type SubmitEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { moneyCheckQuestions, moneyCheckAnswerLabels, reviewMoneyCheck, type MoneyCheckAnswer, type MoneyCheckResult } from '../../../core/money-check.mjs';

export default function MoneyCheck() {
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, MoneyCheckAnswer>>({});
  const [result, setResult] = useState<MoneyCheckResult | null>(null);
  const [error, setError] = useState('');
  const resultHeading = useRef<HTMLHeadingElement>(null);
  function focusQuestion(id: string) {
    requestAnimationFrame(() => document.getElementById(`${id}-yes`)?.focus());
  }
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const missing = moneyCheckQuestions.find(question => !answers[question.id]);
    if (missing) { setError('Answer all 10 questions. Not sure is a useful answer.'); focusQuestion(missing.id); return; }
    setError('');
    setResult(reviewMoneyCheck(answers));
    requestAnimationFrame(() => resultHeading.current?.focus());
  }
  function reset() {
    setAnswers({}); setResult(null); setError(''); focusQuestion(moneyCheckQuestions[0].id);
  }
  return <div className="app-shell">
    <header className="brandbar">
      <Link className="brand" href="/">ProfitLeakLab <span className="product-tag">FREE TRADE MONEY CHECK</span></Link>
      <span className="session-tag">Anonymous · browser memory only</span>
      <Link href="/">Financial control room</Link>
    </header>
    <main id="main" className="money-check">
      <section className="money-check-intro" aria-labelledby="check-title">
        <p className="eyebrow">10 QUESTIONS · NO ACCOUNT REQUIRED</p>
        <h1 id="check-title">Where is the money leaking from your trade business?</h1>
        <p className="money-check-lead">Run a free Trade Money Check to see which areas deserve a closer look: overdue customer money, supplier payments, labour overruns, job margin, retentions and basic financial controls.</p>
        <p className="money-check-trust">No bank connection. No accounting write-back. No customer records or contact details needed.</p>
        <p className="muted">Your answers stay in this page’s memory. Refreshing or leaving the page clears them. This check offers review priorities, not a dollar estimate or financial, tax or legal advice.</p>
        {!started && <Button onClick={() => { setStarted(true); focusQuestion(moneyCheckQuestions[0].id); }}>Start the free check</Button>}
      </section>
      {started && <>
        <form className="money-check-panel" onSubmit={submit} noValidate aria-labelledby="questions-title">
          <h2 id="questions-title">Tell us what you have noticed</h2>
          <p className="muted">Choose Yes, No or Not sure for every question. Not sure identifies an evidence gap; it is not a confirmed loss.</p>
          <p className="check-progress" aria-live="polite">{Object.keys(answers).length} of 10 answered</p>
          {moneyCheckQuestions.map((question, index) => <fieldset className="check-question" key={question.id}>
            <legend><span>{index + 1}.</span> {question.text}</legend>
            <div className="check-options">{(Object.keys(moneyCheckAnswerLabels) as MoneyCheckAnswer[]).map(answer => <label key={answer}>
              <input id={`${question.id}-${answer}`} type="radio" name={question.id} value={answer} required checked={answers[question.id] === answer} onChange={() => { setAnswers(previous => ({ ...previous, [question.id]: answer })); setResult(null); setError(''); }} />
              {moneyCheckAnswerLabels[answer]}
            </label>)}</div>
          </fieldset>)}
          {error && <p className="check-error" role="alert">{error}</p>}
          <div className="check-actions"><Button type="submit">See my review priorities</Button><Button type="button" variant="outline" onClick={reset}>Start again</Button></div>
        </form>
        {result && <section className="money-check-panel check-result" aria-labelledby="result-title">
          <p className="eyebrow">YOUR REVIEW PRIORITY</p>
          <h2 id="result-title" ref={resultHeading} tabIndex={-1}>{result.label}</h2>
          <p>{result.explanation}</p>
          <h3>What stood out</h3>
          <p>{result.attention.length} reported {result.attention.length === 1 ? 'symptom' : 'symptoms'} · {result.uncertain.length} {result.uncertain.length === 1 ? 'answer' : 'answers'} to confirm. These are review signals, not verified financial findings.</p>
          <details><summary>See all 10 answers and how they contributed</summary><ol className="check-responses">{result.responses.map(response => <li key={response.id}><p>{response.text}</p><strong>{moneyCheckAnswerLabels[response.answer]}</strong> — {response.status === 'attention' ? 'Reported symptom' : response.status === 'uncertain' ? 'Evidence gap to confirm' : 'No symptom reported by this answer'}</li>)}</ol></details>
          <h3>What to check next</h3>
          {result.nextChecks.length ? <ul className="check-evidence">{result.nextChecks.map(response => <li key={response.id}><strong>{response.area}{response.status === 'uncertain' ? ' — confirm what is happening' : ''}</strong><p>{response.evidence}</p></li>)}</ul> : <p>No specific symptom was reported. Keep a repeatable review of debtor ageing, supplier payments, job costs, labour and retention evidence.</p>}
          <h3>What ProfitLeakLab can test</h3>
          <ul className="check-evidence">{(result.nextChecks.length ? result.nextChecks : moneyCheckQuestions.filter(question => ['debtors', 'suppliers', 'margin', 'labour', 'retentions'].includes(question.id))).map(question => <li key={question.id}><Link href={question.href}>{question.area}</Link><p>{question.capability}</p></li>)}</ul>
          <h3>What this does not prove</h3>
          <p>A questionnaire cannot confirm a financial loss, fraud, theft, an accounting or tax error, or recoverable money. Findings need source evidence and amounts may overlap. Retention entitlement depends on the contract, claims and release conditions.</p>
          <h3>Next step</h3>
          <p>Open the local review to explore the synthetic demo. Prepare and review your own records separately when you are ready. You can also contact MYA through your usual channel; this check does not send your answers.</p>
          <div className="check-actions"><Link className="check-primary-link" href="/">Open local review / demo</Link><Link href="/retentions">Open retention review</Link></div>
        </section>}
      </>}
    </main>
  </div>;
}
