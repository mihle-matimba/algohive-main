# Algolend Lending Flow Reference

This document captures the intended end-to-end lending journey and highlights
what is currently implemented in the AlgoHive codebase.

## Target customer journey

1. **Algolend Landing (post-KYC)**  
   Introduce the payday loan product, present regulatory disclaimers, and allow
   customers to begin the application.

2. **Consents & Declarations**  
   Collect bureau, bank-link, employment, and DebiCheck consents alongside
   employer/salary metadata that unlock the rest of the journey.

3. **Credit Check Result**  
   Retrieve Experian score bands, display eligibility guidance, and surface
   retry/decline actions when bureau calls fail or return adverse outcomes.

4. **Bank Linking**  
   Use Experian/Open Banking to ingest account data (income, affordability,
   NSF events) with fallbacks to manual document upload when link attempts
   fail.

5. **Personalised Offer**  
   Generate an offer capped by affordability (principal, rate, initiation fee,
   service fee) and allow borrowers to adjust amounts, select due dates, and
   opt into strategy allocations or portfolio pledges.

6. **Disclosures & Contract**  
   Provide pre-agreement and credit agreement documents, collect acknowledgement
   checkboxes, and capture an OTP-backed e-signature.

7. **DebiCheck Mandate**  
   Create and authenticate the debit-order mandate, handling success, pending,
   and failure states with retry paths.

8. **Disbursement & Split**  
   Activate the loan ledger entry, disburse cash to the customer, optionally
   route a percentage to an investment strategy, and surface receipts.

9. **Loan Dashboard**  
   Maintain an active-loan dashboard with repayment schedules, mandate status,
   support options, and rescheduling controls where policy permits.

## State machine summary

| State | Description | Entry | Exit |
| --- | --- | --- | --- |
| STARTED | Application created after consent | — | BUREAU_CHECKING |
| BUREAU_CHECKING | Experian pull in progress | STARTED | BUREAU_OK / BUREAU_REFER / BUREAU_DECLINE / ERROR |
| BUREAU_OK | Score bands A/B | BUREAU_CHECKING | BANK_LINKING |
| BUREAU_REFER | Score bands C/D or thin file | BUREAU_CHECKING | BANK_LINKING / DECLINED |
| BUREAU_DECLINE | Band E or adverse flags | BUREAU_CHECKING | DECLINED |
| BANK_LINKING | Open Banking flow | BUREAU_OK / BUREAU_REFER | AFFORD_OK / AFFORD_REFER / AFFORD_FAIL |
| AFFORD_OK | Affordability pass | BANK_LINKING | OFFERED |
| AFFORD_REFER | Manual review required | BANK_LINKING | OFFERED / DECLINED |
| AFFORD_FAIL | Caps breached | BANK_LINKING | DECLINED |
| OFFERED | Offer generated | AFFORD_OK / AFFORD_REFER | OFFER_ACCEPTED / DECLINED |
| OFFER_ACCEPTED | Borrower accepts offer | OFFERED | CONTRACT_SIGN |
| CONTRACT_SIGN | E-signature capture | OFFER_ACCEPTED | DEBICHECK_AUTH |
| DEBICHECK_AUTH | Mandate in flight | CONTRACT_SIGN | READY_TO_DISBURSE / DECLINED |
| READY_TO_DISBURSE | All checks passed | DEBICHECK_AUTH | DISBURSED / ERROR |
| DISBURSED | Funds sent | READY_TO_DISBURSE | ACTIVE |
| ACTIVE | Loan live | DISBURSED | SETTLED / ARREARS / DEFAULT |
| SETTLED | Loan repaid | ACTIVE | — |
| ARREARS | DPD > 0 | ACTIVE | ACTIVE / DEFAULT / SETTLED |
| DEFAULT | Write-off/enforcement | ARREARS | — |
| DECLINED | Application stopped | any | — |
| ERROR | Technical fault | any | retry / rollback |

## Current implementation status

| Flow step | Status in repo | Notes |
| --- | --- | --- |
| Landing | Missing | No dedicated Algolend landing page exists in `public/`. |
| Consents | Missing | `public/loans.html` starts at calculator stage without consent capture. |
| Credit check | Missing | No Experian integration or score-band UI is present. |
| Bank linking | Missing | No Experian/Open Banking component or fallback upload flow. |
| Offer generation | Partial | Calculator UI renders but does not persist selections or enforce affordability rules. |
| Disclosures & contract | Missing | No document previews, download links, or e-signature workflow. |
| DebiCheck mandate | Missing | Mandate initiation/authentication is absent. |
| Disbursement & split | Missing | No serverless endpoint creates loans or triggers payouts/strategy allocation. |
| Loan dashboard | Partial | `public/lend.html` shows mocked loan data; Supabase queries and repayment widgets are TODO. |

## Next steps

1. **Design & build S1–S4**: Add landing, consent, credit-check, and bank-linking
   pages/modules that collect the prerequisite data and call the relevant
   Experian/Open Banking APIs.
2. **Extend calculator to full offer engine**: Implement backend logic for
   affordability, fees, and due-date detection, then persist borrower choices to
   Supabase via a new API route.
3. **Document delivery & signing**: Create contract PDF generation/storage,
   acknowledgement capture, and OTP-backed signing flows.
4. **DebiCheck integration**: Implement mandate creation, status polling, and
   error handling via a serverless endpoint.
5. **Disbursement orchestration**: Build payout automation and strategy allocation
   logic that transitions loans to `ACTIVE` once funds leave the treasury.
6. **Loan dashboard enhancements**: Replace mocks with live Supabase queries,
   surface mandate status, repayment timelines, and support tooling.

