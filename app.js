// Base Configuration
const INITIAL_DEBT = 300000000; // 300M VND Target
const DAILY_RATE = 3450000; // 3.45M VND per workday
const BASE_WORKDAYS_CHECKED = 34; // 34 * 3.45M = 117.3M baseline
const BASE_STREAK = 9;
const NEXT_MILESTONE_TARGET = 200000000; // Target remaining debt milestone

// DOM Elements
const remainingDebtEl = document.getElementById("remaining-debt");
const progressFillEl = document.getElementById("progress-fill");
const progressPercentEl = document.getElementById("progress-percent");
const nextMilestoneEl = document.getElementById("next-milestone");
const workdaysLeftEl = document.getElementById("workdays-left");
const totalEarnedEl = document.getElementById("total-earned");
const streakCountEl = document.getElementById("streak-count");
const projectedDateEl = document.getElementById("projected-date");
const checkboxEl = document.getElementById("workday-checkbox");

// Helper: Format numbers to VND format
function formatVND(amount) {
  return amount.toLocaleString("vi-VN") + " VND";
}

// Helper: Calculate projected completion date based on 5-day workweeks
function calculateProjectedDate(remainingAmount) {
  const workdaysNeeded = Math.ceil(remainingAmount / DAILY_RATE);
  let currentDate = new Date(2026, 6, 24); // Starting anchor date: Jul 24, 2026
  let addedDays = 0;

  while (addedDays < workdaysNeeded) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude weekends
      addedDays++;
    }
  }

  return currentDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

// Core Update Logic
function updateTracker() {
  const isChecked = checkboxEl.checked;

  // Calculate current total workdays checked
  const totalWorkdays = BASE_WORKDAYS_CHECKED + (isChecked ? 0 : -1);

  // Earnings and Debt calculations
  const totalEarned = totalWorkdays * DAILY_RATE;
  const remainingDebt = Math.max(0, INITIAL_DEBT - totalEarned);
  const progressPercent = Math.min(100, Math.round((totalEarned / INITIAL_DEBT) * 100));

  // Milestone calculations
  const debtToMilestone = Math.max(0, remainingDebt - (INITIAL_DEBT - NEXT_MILESTONE_TARGET));
  const workdaysToMilestone = Math.ceil(debtToMilestone / DAILY_RATE);

  // Streak calculation
  const currentStreak = isChecked ? BASE_STREAK : BASE_STREAK - 1;

  // Render updates to UI
  remainingDebtEl.textContent = formatVND(remainingDebt);
  progressFillEl.style.width = `${progressPercent}%`;
  progressPercentEl.textContent = `${progressPercent}%`;

  nextMilestoneEl.textContent = `⬇ ${NEXT_MILESTONE_TARGET.toLocaleString("vi-VN")}`;
  workdaysLeftEl.textContent = `${workdaysToMilestone} workdays left`;

  totalEarnedEl.textContent = `${(totalEarned / 1000000).toFixed(2)}M`;
  streakCountEl.textContent = `🔥 ${currentStreak} workdays`;

  projectedDateEl.textContent = calculateProjectedDate(remainingDebt);
}

// Event Listener
checkboxEl.addEventListener("change", updateTracker);

// Initial Calculation
updateTracker();
