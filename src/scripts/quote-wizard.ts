import {
  finishPreferenceForFinish,
  finishStyleForStyle,
  isConfiguratorSelection,
  projectTypeForSpace,
} from './configurator';
import { business } from '~/data/site';

type Cleanup = () => void;

let activeCleanup: Cleanup | undefined;

const selectRadio = (form: HTMLFormElement, name: string, value: string | undefined) => {
  if (!value) return;
  const radio = Array.from(form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)).find(
    (input) => input.value === value
  );
  if (!radio) return;
  radio.checked = true;
  form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`).forEach((input) => {
    input.closest('[data-option-card]')?.classList.toggle('is-selected', input === radio);
  });
};

const setupQuoteWizard = () => {
  activeCleanup?.();
  const form = document.querySelector<HTMLFormElement>('[data-quote-form]');
  if (!form) {
    activeCleanup = undefined;
    return;
  }

  const steps = Array.from(form.querySelectorAll<HTMLElement>('[data-step]'));
  const dots = Array.from(form.querySelectorAll<HTMLElement>('[data-step-dot]'));
  const previous = form.querySelector<HTMLButtonElement>('[data-prev]');
  const next = form.querySelector<HTMLButtonElement>('[data-next]');
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]');
  const status = form.querySelector<HTMLElement>('[data-form-status]');
  const stepStatus = form.querySelector<HTMLElement>('[data-step-status]');
  const reviewList = form.querySelector<HTMLElement>('[data-review-list]');
  const success = form.querySelector<HTMLElement>('[data-quote-success]');
  const finishStyle = form.querySelector<HTMLInputElement>('[data-finish-style]');
  const stepLabels = ['Space type', 'Finish', 'Size', 'Surface', 'Location', 'Timeline', 'Contact', 'Review'];
  let step = 0;
  let submitting = false;

  const setStatus = (message = '', isError = false) => {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-error', isError);
    status.classList.toggle('is-success', Boolean(message) && !isError);
  };

  const populateReview = () => {
    if (!reviewList) return;
    const data = new FormData(form);
    reviewList.querySelectorAll<HTMLElement>('[data-review]').forEach((element) => {
      const field = element.dataset.review || '';
      const value = data.get(field);
      element.textContent = value ? String(value) : 'Not provided';
    });
  };

  const showStep = (focusTarget = false) => {
    steps.forEach((item, index) => {
      const active = index === step;
      item.classList.toggle('is-active', active);
      item.hidden = !active;
      item.toggleAttribute('inert', !active);
    });
    dots.forEach((item, index) => {
      item.classList.toggle('is-active', index === step);
      item.classList.toggle('is-complete', index < step);
    });
    if (previous) previous.hidden = step === 0;
    if (next) next.hidden = step === steps.length - 1;
    if (submit) submit.hidden = step !== steps.length - 1;
    if (stepStatus) stepStatus.textContent = `Step ${step + 1} of ${steps.length}: ${stepLabels[step]}`;
    setStatus();
    if (step === steps.length - 1) populateReview();
    if (focusTarget) steps[step]?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  };

  const isCurrentStepValid = () => {
    const current = steps[step];
    if (!current) return false;
    const required = Array.from(
      current.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[required], textarea[required]')
    );
    for (const field of required) {
      if (!field.reportValidity()) {
        field.focus();
        return false;
      }
    }
    const radioGroups = new Set(
      Array.from(current.querySelectorAll<HTMLInputElement>('input[type="radio"][required]')).map((radio) => radio.name)
    );
    for (const group of radioGroups) {
      if (current.querySelector(`input[name="${group}"]:checked`)) continue;
      const first = current.querySelector<HTMLInputElement>(`input[name="${group}"]`);
      first?.closest('[data-option-card]')?.classList.add('is-invalid');
      first?.focus();
      return false;
    }
    return true;
  };

  const applyConfiguratorSelection = (candidate: { space?: string; finish?: string; style?: string }) => {
    const selection = {
      space: candidate.space || '',
      finish: candidate.finish || '',
      style: candidate.style || '',
    };
    if (!isConfiguratorSelection(selection)) return false;
    selectRadio(form, 'projectType', projectTypeForSpace[selection.space]);
    selectRadio(form, 'finishPreference', finishPreferenceForFinish[selection.finish]);
    if (finishStyle) finishStyle.value = finishStyleForStyle[selection.style] || '';
    return true;
  };

  const params = new URLSearchParams(window.location.search);
  const fromUrl = {
    space: params.get('space') || undefined,
    finish: params.get('finish') || undefined,
    style: params.get('style') || undefined,
  };
  if (!applyConfiguratorSelection(fromUrl)) {
    try {
      applyConfiguratorSelection(JSON.parse(localStorage.getItem('prvn-finish-pref') || 'null'));
    } catch {
      // Corrupt local storage is safely ignored.
    }
  }

  const onOptionChange = (event: Event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    form.querySelectorAll<HTMLInputElement>(`input[name="${input.name}"]`).forEach((radio) => {
      radio.closest('[data-option-card]')?.classList.toggle('is-selected', radio === input);
      radio.closest('[data-option-card]')?.classList.remove('is-invalid');
    });
  };

  const onNext = () => {
    if (!isCurrentStepValid()) return;
    step = Math.min(step + 1, steps.length - 1);
    showStep(true);
  };
  const onPrevious = () => {
    step = Math.max(step - 1, 0);
    showStep(true);
  };
  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (step < steps.length - 1) {
      onNext();
      return;
    }

    const contactStep = steps[6];
    const contactFields = Array.from(contactStep?.querySelectorAll<HTMLInputElement>('input[required]') || []);
    for (const field of contactFields) {
      if (field.reportValidity()) continue;
      step = 6;
      showStep(true);
      field.focus();
      return;
    }

    submitting = true;
    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Sending...';
    }
    setStatus('Sending your request...');

    const payload: Record<string, string> = {};
    new FormData(form).forEach((value, key) => {
      payload[key] = String(value);
    });

    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'The request could not be sent right now. Please call or text PRVN.');
      }
      form.reset();
      form.querySelectorAll('[data-option-card]').forEach((card) => card.classList.remove('is-selected'));
      if (finishStyle) finishStyle.value = '';
      step = 0;
      showStep();
      if (success) {
        success.hidden = false;
        success.focus({ preventScroll: true });
      }
      setStatus('Request sent. PRVN will follow up using the contact details provided.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The request could not be sent right now.';
      setStatus(`${message} Call ${business.phoneDisplay} or text PRVN for faster help.`, true);
    } finally {
      submitting = false;
      if (submit) {
        submit.disabled = false;
        submit.textContent = 'Send quote request';
      }
    }
  };

  form.querySelectorAll<HTMLElement>('[data-step] h2').forEach((heading) => heading.setAttribute('tabindex', '-1'));
  form.addEventListener('change', onOptionChange);
  next?.addEventListener('click', onNext);
  previous?.addEventListener('click', onPrevious);
  form.addEventListener('submit', onSubmit);
  showStep();

  activeCleanup = () => {
    form.removeEventListener('change', onOptionChange);
    next?.removeEventListener('click', onNext);
    previous?.removeEventListener('click', onPrevious);
    form.removeEventListener('submit', onSubmit);
  };
};

if (typeof window !== 'undefined') {
  document.addEventListener('astro:before-swap', () => activeCleanup?.());
  document.addEventListener('astro:page-load', setupQuoteWizard);
  setupQuoteWizard();
}
