// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Loan Modal
// ═══════════════════════════════════════════════════════════════

import { G } from '../game.js';
import { showToast } from './toast.js';
import { sfxGameOver } from '../sfx.js';
import { isAiCeoEnabled } from '../ai-ceo.js';

let initialized = false;

function ensureListeners() {
  if (initialized) return;
  initialized = true;

  const slider = document.getElementById('loan-amount-slider');
  const amountDisplay = document.getElementById('loan-amount-display');
  const interestPreview = document.getElementById('loan-interest-preview');

  if (slider) {
    slider.addEventListener('input', () => {
      const amount = parseInt(slider.value, 10);
      amountDisplay.textContent = '$' + amount.toLocaleString();
      interestPreview.textContent = '$' + Math.round(amount * G.loanInterestRate).toLocaleString();
    });
  }

  document.getElementById('loan-take-btn')?.addEventListener('click', () => {
    const amount = parseInt(slider.value, 10);
    G.takeLoan(amount);
    hideLoanModal();
    G.gameSpeed = 1;
    showToast(`🏦 Loan of $${amount.toLocaleString()} received! Repay before interest piles up.`);
  });

  document.getElementById('loan-decline-btn')?.addEventListener('click', () => {
    hideLoanModal();
    G.loanModalOpen = false;
    G.gameOver = true;
    sfxGameOver();
    showToast('💀 BANKRUPT! Your agency ran out of money.');
  });
}

export function showLoanModal() {
  ensureListeners();

  const modal = document.getElementById('loan-modal');
  if (!modal) return;

  // Update display values
  document.getElementById('loan-cash').textContent = '$' + G.money.toLocaleString();
  document.getElementById('loan-existing-debt').textContent = '$' + G.debt.toLocaleString();

  const slider = document.getElementById('loan-amount-slider');
  const amountDisplay = document.getElementById('loan-amount-display');
  const interestPreview = document.getElementById('loan-interest-preview');

  // Update dynamic interest rate display
  const rateDisplay = document.getElementById('loan-rate-display');
  if (rateDisplay) rateDisplay.textContent = `${Math.round(G.loanInterestRate * 100)}% per week`;

  // Scale loan options based on current costs
  const defaultAmount = Math.max(2000, Math.ceil(G.metrics.dailyCosts * 5 / 1000) * 1000);
  slider.value = defaultAmount;
  amountDisplay.textContent = '$' + defaultAmount.toLocaleString();
  interestPreview.textContent = '$' + Math.round(defaultAmount * G.loanInterestRate).toLocaleString();

  modal.style.display = 'flex';

  // AI CEO auto-accepts loans
  if (isAiCeoEnabled()) {
    const amount = parseInt(slider.value, 10);
    G.takeLoan(amount);
    hideLoanModal();
    G.gameSpeed = 2;
    showToast(`🤖 AI CEO took a $${amount.toLocaleString()} emergency loan.`);
  }
}

function hideLoanModal() {
  const modal = document.getElementById('loan-modal');
  if (modal) modal.style.display = 'none';
}
