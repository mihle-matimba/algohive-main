import { supabase } from "/js/supabase.js";

const LOAN_KEY = "ah_loan_application_id";
const STEP_PAGES = {
  1: "step1.html",
  2: "step2.html",
  3: "step3.html",
  4: "step4.html"
};
const DEFAULT_INTEREST_RATE = 0.15;
const STALE_LOAN_MS = 60 * 60 * 1000;

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

async function deleteLoanById(loanId) {
  if (!loanId) return false;
  const { error } = await supabase
    .from("loan_application")
    .delete()
    .eq("id", loanId);
  if (error) {
    console.error("Loan delete error:", error.message || error);
    return false;
  }
  return true;
}

function isStaleLoan(loan) {
  if (!loan) return false;
  if (loan.status !== "in_progress") return false;
  const timestamp = loan.updated_at || loan.created_at;
  if (!timestamp) return false;
  const updatedAt = new Date(timestamp).getTime();
  if (!Number.isFinite(updatedAt)) return false;
  return Date.now() - updatedAt > STALE_LOAN_MS;
}

export async function getActiveStoredLoan() {
  const loanId = localStorage.getItem(LOAN_KEY);
  if (!loanId) return null;
  const loan = await fetchLoanById(loanId);
  if (!loan) return null;
  if (isStaleLoan(loan)) {
    await deleteLoanById(loan.id);
    localStorage.removeItem(LOAN_KEY);
    return null;
  }
  if (loan.step_number === 4 || loan.status === "completed") return null;
  return loan;
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
      interest_rate: DEFAULT_INTEREST_RATE,
      status: "in_progress",
      principal_amount: 0,
      amount_repayable: 0,
      number_of_months: 1
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

  if (loan && (loan.step_number === 4 || loan.status === "completed") && currentStepNumber === 1) {
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
