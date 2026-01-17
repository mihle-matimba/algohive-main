import { supabase } from "/js/supabase.js";

const LOAN_KEY = "ah_loan_application_id";
const STEP_PAGES = {
  1: "step1.html",
  2: "step2.html",
  3: "step3.html",
  4: "step4.html"
};
const DEFAULT_INTEREST_RATE = 0.15;

async function fetchLoanById(loanId) {
  if (!loanId) return null;
  const { data, error } = await supabase
    .from("loan_application")
    .select("*")
    .eq("id", loanId)
    .maybeSingle();
  if (error) {
    console.error("Loan fetch error:", error.message || error);
    return null;
  }
  return data || null;
}

export async function updateLoan(loanId, fields) {
  if (!loanId) return null;
  const { data, error } = await supabase
    .from("loan_application")
    .update({
      ...fields,
      updated_at: new Date().toISOString()
    })
    .eq("id", loanId)
    .select()
    .single();
  if (error) {
    console.error("Loan update error:", error.message || error);
    return null;
  }
  return data;
}

async function createLoan(stepNumber) {
  const { data, error } = await supabase
    .from("loan_application")
    .insert({
      step_number: stepNumber,
      interest_rate: DEFAULT_INTEREST_RATE
    })
    .select()
    .single();
  if (error) {
    console.error("Loan create error:", error.message || error);
    return null;
  }
  if (data?.id) {
    localStorage.setItem(LOAN_KEY, data.id);
  }
  return data;
}

export async function initLoanStep(currentStepNumber, { updateStep = true } = {}) {
  const loanId = localStorage.getItem(LOAN_KEY);
  let loan = await fetchLoanById(loanId);

  if (loan && loan.step_number === 4 && currentStepNumber === 1) {
    localStorage.removeItem(LOAN_KEY);
    loan = null;
  }

  if (!loan) {
    loan = await createLoan(currentStepNumber);
    return loan;
  }

  if (loan.step_number > currentStepNumber && loan.step_number < 4) {
    const nextPage = STEP_PAGES[loan.step_number];
    if (nextPage) {
      window.location.href = nextPage;
      return null;
    }
  }

  if (updateStep && loan.step_number < currentStepNumber) {
    const updated = await updateLoan(loan.id, { step_number: currentStepNumber });
    if (updated) {
      loan = updated;
    }
  }

  return loan;
}

export function getStoredLoanId() {
  return localStorage.getItem(LOAN_KEY);
}

export function clearStoredLoan() {
  localStorage.removeItem(LOAN_KEY);
}
