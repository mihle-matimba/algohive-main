const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const numberFormatter = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 0,
});

const formatCurrency = (value) => numberFormatter.format(Math.max(0, Number.isFinite(value) ? value : 0));

const addBusinessDays = (date, amount) => {
  const result = new Date(date.getTime());
  let added = 0;
  while (added < amount) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      added += 1;
    }
  }
  return result;
};

const lastBusinessDay = (year, monthIndex) => {
  const date = new Date(year, monthIndex + 1, 0);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() - 1);
  }
  return date;
};

const toDateInput = (date) => {
  const iso = date.toISOString();
  return iso.slice(0, 10);
};

const parseSalaryDay = (value, fromDate = new Date()) => {
  if (!value) return addBusinessDays(fromDate, 30);
  const trimmed = String(value).trim().toLowerCase();
  const base = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);

  if (trimmed === 'last' || trimmed === 'last-business-day') {
    const candidate = lastBusinessDay(fromDate.getFullYear(), fromDate.getMonth());
    if (candidate <= fromDate) {
      return lastBusinessDay(fromDate.getFullYear(), fromDate.getMonth() + 1);
    }
    return candidate;
  }

  const numeric = Number.parseInt(trimmed, 10);
  if (Number.isNaN(numeric) || numeric < 1 || numeric > 31) {
    return addBusinessDays(fromDate, 30);
  }

  const candidate = new Date(fromDate.getFullYear(), fromDate.getMonth(), numeric);
  if (candidate <= fromDate) {
    candidate.setMonth(candidate.getMonth() + 1);
  }

  // ensure business day
  if (candidate.getDay() === 0) {
    candidate.setDate(candidate.getDate() + 1);
  }
  if (candidate.getDay() === 6) {
    candidate.setDate(candidate.getDate() + 2);
  }

  return candidate;
};

const calculateFees = ({
  principal,
  dueDate,
  rateBucket = 0.14,
  disbursementDate = new Date(),
}) => {
  const amount = Math.max(500, Number(principal) || 0);
  const periodDays = Math.max(
    1,
    Math.ceil((new Date(dueDate).getTime() - new Date(disbursementDate).getTime()) / (1000 * 60 * 60 * 24)),
  );
  const initiationBase = 150 + 0.1 * Math.max(0, amount - 1000);
  const initiation = clamp(initiationBase, 0, 1050);
  const service = Math.min(60, (60 * periodDays) / 30);
  const interest = (rateBucket * amount * periodDays) / 30;
  const totalDue = amount + initiation + service + interest;

  return {
    principal: amount,
    initiation,
    service,
    interest,
    totalDue,
    periodDays,
  };
};

const simulateBureau = (consent) => {
  const salary = Number(consent?.netSalary) || 22000;
  const employmentType = String(consent?.employmentType || '').toLowerCase();
  const tenureMonths = consent?.employmentStart ? Math.max(1, Math.floor((Date.now() - Date.parse(consent.employmentStart)) / (1000 * 60 * 60 * 24 * 30))) : 18;

  const baseLimit = salary * 0.65;
  const tenureFactor = tenureMonths > 24 ? 1.1 : tenureMonths < 6 ? 0.65 : 1;
  const typeFactor = employmentType.includes('contract') ? 0.8 : 1;
  const limit = clamp(baseLimit * tenureFactor * typeFactor, 2000, 40000);

  const bands = tenureMonths < 6 ? 'C' : salary > 35000 ? 'A' : salary > 24000 ? 'B' : salary > 15000 ? 'C' : 'D';
  const status = bands === 'D' ? 'REFER' : bands === 'A' || bands === 'B' ? 'APPROVED' : 'REFER';

  return {
    status,
    band: bands,
    limit,
    adverseFlags: [],
    score: 620 + ['A', 'B', 'C', 'D', 'E'].indexOf(bands) * -45,
    message: status === 'APPROVED'
      ? 'Great news! You qualify for automatic approval. '
      : 'We can continue once we verify your income and expenses.',
  };
};

const simulateBankLink = (state) => {
  const salary = Number(state?.consent?.netSalary) || 22000;
  const instalmentCap = salary * 0.3;
  const residual = salary - instalmentCap - 2500;

  return {
    status: 'SUCCESS',
    accountsLinked: 2,
    incomeStreams: 1,
    affordability: {
      netMonthlyIncome: salary,
      totalDebtInstallments: salary - residual - instalmentCap,
      instalmentCap,
      residual,
      maximumLoan: clamp((instalmentCap * 30) / 0.14, 2000, 50000),
    },
    primaryAccount: {
      bank: 'FNB',
      accountNumber: '**** 2045',
    },
    nsfEvents: 0,
    paydayPattern: state?.consent?.salaryDay || '25',
  };
};

const simulateOtp = () => {
  return {
    code: '123456',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };
};

const simulateMandate = (state) => ({
  status: 'SUCCESS',
  reference: `AH-${Date.now().toString().slice(-6)}`,
  channel: 'APP',
  account: state?.bank?.primaryAccount || null,
});

const simulateDisbursement = (state) => ({
  status: 'READY',
  transferReference: `TRF${Math.floor(Math.random() * 1e6)}`,
  etaMinutes: 4,
  receiptUrl: null,
});

const defaultRateForBand = (band) => ({
  A: 0.11,
  B: 0.14,
  C: 0.18,
  D: 0.24,
  E: 0.28,
}[band] || 0.2);

const updateChip = (el, { label, tone = 'slate' }) => {
  if (!el) return;
  el.textContent = label;
  el.dataset.tone = tone;
};

const updateTimeline = (timeline, reached) => {
  timeline.forEach((item, key) => {
    const status = reached.includes(key) ? 'complete' : 'pending';
    item.dataset.state = status;
  });
};

const createNoopApi = () => ({
  registerIntegration() {},
  setBorrowerContext() {},
  applyBureauResult() {},
  applyBankLinkResult() {},
  applyOfferAdjustments() {},
  markMandate() {},
  completeDisbursement() {},
  state: {},
});

export function initAlgolendFlow(options = {}) {
  const root = document.querySelector(options.selector ?? '[data-algolend-flow]');
  if (!root) {
    return createNoopApi();
  }

  const stepOrder = ['consents', 'bureau', 'bank', 'offer', 'contract', 'mandate', 'disbursement'];
  const stepPanels = new Map(
    stepOrder.map((step) => [step, root.querySelector(`[data-step="${step}"]`)]).filter(([, el]) => el),
  );
  const stepperItems = new Map(
    [...root.querySelectorAll('[data-step-item]')].map((el) => [el.dataset.stepItem, el]),
  );
  const timelineItems = new Map(
    [...document.querySelectorAll('[data-timeline-state]')].map((el) => [el.dataset.timelineState, el]),
  );
  const chip = document.querySelector('[data-application-state]');

  const integrations = { ...(options.integrations || {}) };
  const simulate = options.simulate ?? true;

  const state = {
    step: 'consents',
    borrower: {},
    consent: {},
    bureau: null,
    bank: null,
    offer: null,
    contract: { acknowledged: false, otpVerified: false },
    mandate: null,
    disbursement: null,
  };

  const reachedTimeline = new Set(['STARTED']);

  const setStep = (step) => {
    if (!stepPanels.has(step)) return;
    state.step = step;
    stepPanels.forEach((panel, key) => {
      if (!panel) return;
      const isActive = key === step;
      panel.classList.toggle('hidden', !isActive);
      panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });
    stepperItems.forEach((item, key) => {
      const idx = stepOrder.indexOf(key);
      const activeIndex = stepOrder.indexOf(step);
      item.dataset.status = idx < activeIndex ? 'complete' : idx === activeIndex ? 'current' : 'upcoming';
    });

    const timelineMap = {
      consents: 'STARTED',
      bureau: 'BUREAU_CHECKING',
      bank: 'BANK_LINKING',
      offer: 'OFFERED',
      contract: 'CONTRACT_SIGN',
      mandate: 'DEBICHECK_AUTH',
      disbursement: 'READY_TO_DISBURSE',
    };
    const labelMap = {
      consents: { label: 'Collecting consents', tone: 'slate' },
      bureau: { label: 'Running bureau check', tone: 'amber' },
      bank: { label: 'Linking bank statements', tone: 'amber' },
      offer: { label: 'Offer ready', tone: 'emerald' },
      contract: { label: 'Contract signing', tone: 'emerald' },
      mandate: { label: 'DebiCheck authentication', tone: 'emerald' },
      disbursement: { label: 'Disbursement in flight', tone: 'emerald' },
    };

    const timelineState = timelineMap[step];
    if (timelineState) reachedTimeline.add(timelineState);
    updateTimeline(timelineItems, Array.from(reachedTimeline));
    updateChip(chip, labelMap[step] || { label: 'In progress', tone: 'slate' });

    window.dispatchEvent(
      new CustomEvent('algolend:step-change', { detail: { step, state: { ...state } } }),
    );
  };

  const callIntegration = async (name, payload) => {
    if (typeof integrations[name] === 'function') {
      return integrations[name](payload, api);
    }
    if (!simulate) return null;
    switch (name) {
      case 'bureau':
        return simulateBureau(payload);
      case 'bank':
        return simulateBankLink(state);
      case 'otpSend':
        return simulateOtp();
      case 'mandate':
        return simulateMandate(state);
      case 'disbursement':
        return simulateDisbursement(state);
      default:
        return null;
    }
  };

  const consentForm = root.querySelector('#consent-form');
  const consentError = root.querySelector('[data-consent-error]');

  const bureauStatus = root.querySelector('[data-bureau-outcome]');
  const bureauBand = root.querySelector('[data-bureau-band]');
  const bureauLimit = root.querySelector('[data-bureau-limit]');
  const bureauMessage = root.querySelector('[data-bureau-message]');
  const bureauReasons = root.querySelector('[data-bureau-reasons]');
  const bureauActions = {
    retry: root.querySelector('[data-action="retry-bureau"]'),
    continue: root.querySelector('[data-action="continue-bank"]'),
  };

  const bankStatus = root.querySelector('[data-bank-status]');
  const bankSummary = root.querySelector('[data-bank-summary]');
  const bankAffordability = {
    income: root.querySelector('[data-afford-income]'),
    debt: root.querySelector('[data-afford-debt]'),
    cap: root.querySelector('[data-afford-cap]'),
    residual: root.querySelector('[data-afford-residual]'),
  };
  const bankActions = {
    start: root.querySelector('[data-action="start-bank-link"]'),
    upload: root.querySelector('[data-action="manual-upload"]'),
    continue: root.querySelector('[data-action="to-offer"]'),
  };

  const offerControls = {
    wrapper: root.querySelector('[data-offer-wrapper]'),
    amount: root.querySelector('#offer-amount'),
    amountDisplay: root.querySelector('[data-offer-amount-display]'),
    dueDate: root.querySelector('#offer-due-date'),
    strategy: root.querySelector('#offer-strategy-allocation'),
    strategyDisplay: root.querySelector('[data-offer-strategy-display]'),
    declaration: root.querySelector('[data-offer-declaration]'),
    submit: root.querySelector('[data-action="accept-offer"]'),
    summary: {
      principal: root.querySelector('[data-offer-principal]'),
      initiation: root.querySelector('[data-offer-initiation]'),
      service: root.querySelector('[data-offer-service]'),
      interest: root.querySelector('[data-offer-interest]'),
      total: root.querySelector('[data-offer-total]'),
      days: root.querySelector('[data-offer-days]'),
      dueDate: root.querySelector('[data-offer-due-date-display]'),
    },
  };

  const contractElements = {
    checks: Array.from(root.querySelectorAll('input[data-contract-ack]')),
    sendOtp: root.querySelector('[data-action="send-otp"]'),
    otpInfo: root.querySelector('[data-otp-info]'),
    otpInput: root.querySelector('#contract-otp'),
    verifyOtp: root.querySelector('[data-action="verify-otp"]'),
    continue: root.querySelector('[data-action="contract-continue"]'),
  };

  const mandateElements = {
    summary: root.querySelector('[data-mandate-summary]'),
    status: root.querySelector('[data-mandate-status]'),
    start: root.querySelector('[data-action="start-mandate"]'),
    continue: root.querySelector('[data-action="mandate-continue"]'),
  };

  const disbursementElements = {
    summary: root.querySelector('[data-disbursement-summary]'),
    receipt: root.querySelector('[data-action="download-receipt"]'),
  };

  const updateOfferSummary = () => {
    if (!offerControls.amount || !offerControls.summary) return;
    const principal = Number(offerControls.amount.value || 0);
    const dueDate = offerControls.dueDate?.value || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const rate = defaultRateForBand(state?.bureau?.band);
    const fees = calculateFees({ principal, dueDate, rateBucket: rate });

    offerControls.summary.principal.textContent = formatCurrency(fees.principal);
    offerControls.summary.initiation.textContent = formatCurrency(fees.initiation);
    offerControls.summary.service.textContent = formatCurrency(fees.service);
    offerControls.summary.interest.textContent = formatCurrency(fees.interest);
    offerControls.summary.total.textContent = formatCurrency(fees.totalDue);
    offerControls.summary.days.textContent = `${fees.periodDays} days`;
    offerControls.summary.dueDate.textContent = new Date(dueDate).toLocaleDateString('en-ZA', {
      year: 'numeric', month: 'short', day: 'numeric',
    });

    if (offerControls.amountDisplay) {
      offerControls.amountDisplay.textContent = formatCurrency(principal);
    }
    if (offerControls.strategy && offerControls.strategyDisplay) {
      const allocation = Number(offerControls.strategy.value || 0);
      offerControls.strategyDisplay.textContent = `${allocation}% (${formatCurrency((principal * allocation) / 100)})`;
    }

    state.offer = {
      ...(state.offer || {}),
      amount: principal,
      dueDate,
      fees,
      strategyAllocation: Number(offerControls.strategy?.value || 0),
    };
  };

  const applyBureauResult = (result) => {
    if (!result) return;
    state.bureau = result;
    if (bureauStatus) {
      bureauStatus.dataset.outcome = String(result.status || 'PENDING').toLowerCase();
    }
    if (bureauBand) bureauBand.textContent = result.band ? `Band ${result.band}` : 'Band —';
    if (bureauLimit) bureauLimit.textContent = formatCurrency(result.limit || 0);
    if (bureauMessage) bureauMessage.textContent = result.message || '';

    if (bureauReasons) {
      bureauReasons.innerHTML = '';
      (result.adverseFlags || []).forEach((flag) => {
        const li = document.createElement('li');
        li.textContent = flag;
        bureauReasons.appendChild(li);
      });
      bureauReasons.classList.toggle('hidden', !(result.adverseFlags || []).length);
    }

    const allowContinue = ['APPROVED', 'REFER'].includes(String(result.status).toUpperCase());
    if (bureauActions.continue) {
      bureauActions.continue.disabled = !allowContinue;
    }

    if (result.status === 'DECLINE') {
      reachedTimeline.add('DECLINED');
      updateChip(chip, { label: 'Declined', tone: 'rose' });
    } else {
      reachedTimeline.add('BUREAU_OK');
    }

    const max = Math.max(500, Math.min(result.limit || 0, result.maximumAffordable || Infinity));
    if (offerControls.amount) {
      offerControls.amount.max = String(max);
      const preset = Math.min(max, Number(offerControls.amount.value || 0) || max);
      offerControls.amount.value = preset;
    }
    if (offerControls.strategy) {
      offerControls.strategy.value = offerControls.strategy.min || '0';
    }

    updateOfferSummary();
  };

  const applyBankLinkResult = (result) => {
    if (!result) return;
    state.bank = result;
    if (bankStatus) {
      bankStatus.dataset.outcome = String(result.status || 'PENDING').toLowerCase();
      bankStatus.textContent = result.status === 'SUCCESS'
        ? 'Bank data linked'
        : result.status === 'PARTIAL'
          ? 'Partial data received'
          : 'Link failed';
    }
    if (bankSummary) {
      bankSummary.textContent = result.status === 'SUCCESS'
        ? `Linked ${result.accountsLinked || 0} accounts via Experian.`
        : result.status === 'PARTIAL'
          ? 'We received some data. Upload payslips to continue.'
          : 'We could not access your account. Try again or upload documents.';
    }

    const affordability = result.affordability || {};
    if (bankAffordability.income) bankAffordability.income.textContent = formatCurrency(affordability.netMonthlyIncome || 0);
    if (bankAffordability.debt) bankAffordability.debt.textContent = formatCurrency(affordability.totalDebtInstallments || 0);
    if (bankAffordability.cap) bankAffordability.cap.textContent = formatCurrency(affordability.instalmentCap || 0);
    if (bankAffordability.residual) bankAffordability.residual.textContent = formatCurrency(affordability.residual || 0);

    if (offerControls.amount) {
      const cap = affordability.maximumLoan || state?.bureau?.limit || Number(offerControls.amount.max) || 0;
      const max = Math.max(500, Math.min(cap, state?.bureau?.limit || cap));
      offerControls.amount.max = String(max);
      if (Number(offerControls.amount.value) > max) {
        offerControls.amount.value = String(max);
      }
    }

    if (bankActions.continue) {
      bankActions.continue.disabled = result.status !== 'SUCCESS' && result.status !== 'PARTIAL';
    }

    updateOfferSummary();
  };

  const markMandate = (result) => {
    if (!result) return;
    state.mandate = result;
    if (mandateElements.status) {
      mandateElements.status.dataset.outcome = String(result.status || 'PENDING').toLowerCase();
      mandateElements.status.textContent = result.status === 'SUCCESS'
        ? 'Mandate authenticated'
        : result.status === 'PENDING'
          ? 'Awaiting bank confirmation'
          : 'Mandate failed';
    }
    if (mandateElements.summary) {
      mandateElements.summary.querySelector('[data-mandate-reference]')?.textContent = result.reference || 'Pending';
      mandateElements.summary.querySelector('[data-mandate-channel]')?.textContent = result.channel || '—';
      mandateElements.summary.querySelector('[data-mandate-account]')?.textContent = result.account?.accountNumber || '—';
    }

    if (mandateElements.continue) {
      mandateElements.continue.disabled = result.status !== 'SUCCESS';
    }
  };

  const completeDisbursement = (payload) => {
    state.disbursement = payload;
    reachedTimeline.add('DISBURSED');
    updateTimeline(timelineItems, Array.from(reachedTimeline));
    updateChip(chip, { label: 'Disbursed', tone: 'emerald' });

    if (disbursementElements.summary) {
      disbursementElements.summary.querySelector('[data-disbursement-reference]')?.textContent = payload?.transferReference || 'Pending';
      disbursementElements.summary.querySelector('[data-disbursement-eta]')?.textContent = payload?.etaMinutes ? `${payload.etaMinutes} minutes` : 'Shortly';
    }
    if (payload?.receiptUrl && disbursementElements.receipt) {
      disbursementElements.receipt.disabled = false;
      disbursementElements.receipt.href = payload.receiptUrl;
    }
  };

  const api = {
    registerIntegration(name, handler) {
      integrations[name] = handler;
    },
    setBorrowerContext(context = {}) {
      state.borrower = { ...state.borrower, ...context };
      if (offerControls.dueDate && !offerControls.dueDate.value) {
        const nextSalary = parseSalaryDay(context.salaryDay, new Date());
        offerControls.dueDate.value = toDateInput(nextSalary);
        updateOfferSummary();
      }
    },
    applyBureauResult,
    applyBankLinkResult,
    applyOfferAdjustments(data = {}) {
      if (offerControls.amount && data.maxAmount) {
        offerControls.amount.max = String(data.maxAmount);
      }
      if (offerControls.dueDate && data.dueDate) {
        offerControls.dueDate.value = data.dueDate;
      }
      updateOfferSummary();
    },
    markMandate,
    completeDisbursement,
    state,
  };

  window.algolendFlow = api;

  const resetConsentError = () => {
    if (consentError) {
      consentError.classList.add('hidden');
      consentError.textContent = '';
    }
  };

  const showConsentError = (message) => {
    if (!consentError) return;
    consentError.textContent = message;
    consentError.classList.remove('hidden');
  };

  consentForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    resetConsentError();
    const formData = new FormData(consentForm);
    const requiredChecks = Array.from(consentForm.querySelectorAll('input[data-consent]'));
    const missing = requiredChecks.filter((input) => !input.checked);
    if (missing.length) {
      showConsentError('Please provide all mandatory consents to continue.');
      return;
    }

    const employer = (formData.get('employer') || '').toString().trim();
    const employmentType = formData.get('employmentType');
    const employmentStart = formData.get('employmentStart');
    const salaryDay = formData.get('salaryDay');
    const netSalary = Number(formData.get('netSalary') || 0);

    if (!employer || !employmentType || !employmentStart || !salaryDay) {
      showConsentError('Employer, employment type, start date, and salary day are required.');
      return;
    }

    state.consent = {
      employer,
      employmentType,
      employmentStart,
      salaryDay,
      netSalary: Number.isFinite(netSalary) ? netSalary : null,
      declarations: requiredChecks.map((input) => input.name),
    };

    setStep('bureau');
    if (bureauStatus) {
      bureauStatus.dataset.outcome = 'pending';
    }
    if (bureauMessage) {
      bureauMessage.textContent = 'Connecting to Experian to retrieve your score band...';
    }
    if (bureauActions.continue) {
      bureauActions.continue.disabled = true;
    }

    try {
      const result = await callIntegration('bureau', state.consent);
      if (result) {
        applyBureauResult(result);
      } else {
        showConsentError('Unable to contact Experian. Please retry.');
        setStep('consents');
      }
    } catch (error) {
      console.error(error);
      showConsentError('We hit an unexpected error while calling Experian.');
      setStep('consents');
    }
  });

  bureauActions.retry?.addEventListener('click', async () => {
    if (!state.consent) return;
    if (bureauStatus) bureauStatus.dataset.outcome = 'pending';
    if (bureauMessage) bureauMessage.textContent = 'Retrying Experian pull...';
    try {
      const result = await callIntegration('bureau', state.consent);
      if (result) {
        applyBureauResult(result);
      }
    } catch (error) {
      console.error(error);
    }
  });

  bureauActions.continue?.addEventListener('click', () => {
    setStep('bank');
    if (bankStatus) {
      bankStatus.dataset.outcome = 'pending';
      bankStatus.textContent = 'Waiting for Experian bank-link...';
    }
  });

  bankActions.start?.addEventListener('click', async () => {
    if (bankStatus) {
      bankStatus.dataset.outcome = 'pending';
      bankStatus.textContent = 'Redirecting to secure bank link...';
    }
    try {
      const result = await callIntegration('bank', state);
      if (result) {
        applyBankLinkResult(result);
      }
    } catch (error) {
      console.error(error);
      if (bankStatus) {
        bankStatus.dataset.outcome = 'error';
        bankStatus.textContent = 'Something went wrong linking your bank.';
      }
    }
  });

  bankActions.upload?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('algolend:document-upload-requested'));
  });

  bankActions.continue?.addEventListener('click', () => {
    setStep('offer');
    updateOfferSummary();
  });

  offerControls.amount?.addEventListener('input', updateOfferSummary);
  offerControls.dueDate?.addEventListener('change', updateOfferSummary);
  offerControls.strategy?.addEventListener('input', updateOfferSummary);
  offerControls.declaration?.addEventListener('change', () => {
    if (!offerControls.submit) return;
    offerControls.submit.disabled = !offerControls.declaration.checked;
  });

  offerControls.submit?.addEventListener('click', () => {
    if (!offerControls.declaration?.checked) return;
    setStep('contract');
  });

  const syncContractState = () => {
    const allChecked = contractElements.checks.every((input) => input.checked);
    const ready = allChecked && state.contract.otpVerified;
    if (contractElements.continue) {
      contractElements.continue.disabled = !ready;
    }
  };

  contractElements.checks.forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      syncContractState();
    });
  });

  contractElements.sendOtp?.addEventListener('click', async () => {
    try {
      const response = await callIntegration('otpSend', state);
      if (response?.code) {
        state.contract.pendingOtp = response.code;
        state.contract.otpExpiresAt = response.expiresAt;
        if (contractElements.otpInfo) {
          contractElements.otpInfo.textContent = `OTP sent. ${response.expiresAt ? 'Expires at ' + new Date(response.expiresAt).toLocaleTimeString() : ''}`;
          contractElements.otpInfo.classList.remove('hidden');
        }
      }
    } catch (error) {
      console.error(error);
      if (contractElements.otpInfo) {
        contractElements.otpInfo.textContent = 'Failed to send OTP. Please retry.';
        contractElements.otpInfo.classList.remove('hidden');
      }
    }
  });

  contractElements.verifyOtp?.addEventListener('click', () => {
    const input = contractElements.otpInput?.value?.trim();
    if (!input) return;
    if (state.contract.pendingOtp && input === state.contract.pendingOtp) {
      state.contract.otpVerified = true;
      if (contractElements.otpInfo) {
        contractElements.otpInfo.textContent = 'OTP verified.';
        contractElements.otpInfo.classList.remove('hidden');
      }
    } else {
      state.contract.otpVerified = false;
      if (contractElements.otpInfo) {
        contractElements.otpInfo.textContent = 'Incorrect OTP. Please try again.';
        contractElements.otpInfo.classList.remove('hidden');
      }
    }
    syncContractState();
  });

  contractElements.continue?.addEventListener('click', () => {
    setStep('mandate');
  });

  mandateElements.start?.addEventListener('click', async () => {
    if (mandateElements.status) {
      mandateElements.status.dataset.outcome = 'pending';
      mandateElements.status.textContent = 'Contacting your bank...';
    }
    try {
      const result = await callIntegration('mandate', state);
      if (result) {
        markMandate(result);
      }
    } catch (error) {
      console.error(error);
      if (mandateElements.status) {
        mandateElements.status.dataset.outcome = 'error';
        mandateElements.status.textContent = 'Mandate failed. Please retry.';
      }
    }
  });

  mandateElements.continue?.addEventListener('click', async () => {
    setStep('disbursement');
    const payload = await callIntegration('disbursement', state);
    completeDisbursement(payload || {});
  });

  updateOfferSummary();
  setStep('consents');
  syncContractState();

  return api;
}
