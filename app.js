// Base Configuration
const INITIAL_DEBT = 300000000; // 300M VND Target
const DAILY_RATE = 3450000; // 3.45M VND per workday
const NEXT_MILESTONE_TARGET = 200000000; // 200M target
const YEAR = 2026;
const MONTH = 6; // July (0-indexed in JS)
const START_DAY = 15; // Enable checking from July 15

// State: Track which days in July are checked (Defaulting 15th through 24th to active)
const checkedDays = new Set([15, 16, 17, 20, 21, 22, 23, 24]);

// DOM Elements
const calendarGrid = document.getElementById("calendar-grid");
const remainingDebtEl = document.getElementById("remaining-debt");
const progressFillEl = document.getElementById("progress-fill");
const progressPercentEl = document.getElementById("progress-percent");
const nextMilestoneEl = document.getElementById("next-milestone");
const workdaysLeftEl = document.getElementById("workdays-left");
const totalEarnedEl = document.getElementById("total-earned");
const streakCountEl = document.getElementById("streak-count");
const projectedDateEl = document.getElementById("projected-date");

// Render Weekday Labels (Mon - Sun)
function setupCalendarHeader() {
  const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  weekdays.forEach(day => {
    const el = document.createElement("div");
    el.className = "weekday-header";
    el.textContent = day;
    calendarGrid.appendChild(el);
  });
}

// Generate Calendar Days for July
function renderCalendar() {
  setupCalendarHeader();

  const firstDayIndex = new Date(YEAR, MONTH, 1).getDay();
  const totalDays = new Date(YEAR, MONTH + 1, 0).getDate();

  // Adjust for Monday start (0: Sun -> 6, 1: Mon -> 0, etc.)
  const paddingDays = (firstDayIndex + 6) % 7;

  // Add empty slots for month alignment
  for (let i = 0; i < paddingDays; i++) {
    const emptySlot = document.createElement("div");
    calendarGrid.appendChild(emptySlot);
  }

  // Create Day Buttons
  for (let day = 1; day <= totalDays; day++) {
    const btn = document.createElement("button");
    btn.className = "day-btn";
    btn.textContent = day;

    const dateObj = new Date(YEAR, MONTH, day);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Disable if before July 15 or weekend
    if (day < START_DAY || isWeekend) {
      btn.disabled = true;
    } else {
      if (checkedDays.has(day)) {
        btn.classList.add("active");
      }

      btn.addEventListener("click", () => toggleDay(day, btn));
    }

    calendarGrid.appendChild(btn);
  }
}

// Toggle day selection
function toggleDay(day, buttonEl) {
  if (checkedDays.has(day)) {
    checkedDays.delete(day);
    buttonEl.classList.remove("active");
  } else {
    checkedDays.add(day);
    buttonEl.classList.add("active");
  }
  updateTracker();
}

// Helper: Calculate active streak ending at the latest checked day
function calculateStreak() {
  let streak = 0;
  for (let day = 31; day >= START_DAY; day--) {
    const dateObj = new Date(YEAR, MONTH, day);
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

    if (!isWeekend) {
      if (checkedDays.has(day)) {
        streak++;
      } else if (streak > 0) {
        break; // End streak on missed workday
      }
    }
  }
  return streak;
}

// Helper: Estimate project end date based on remaining debt
function calculateProjectedDate(remainingAmount) {
  const workdaysNeeded = Math.ceil(remainingAmount / DAILY_RATE);
  let currentDate = new Date(YEAR, MONTH, 24); // Reference anchor date
  let addedDays = 0;

  while (addedDays < workdaysNeeded) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }

  return currentDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

// Calculate and render stats
function updateTracker() {
  const totalWorkdaysChecked = checkedDays.size;
  const totalEarned = totalWorkdaysChecked * DAILY_RATE;
  const remainingDebt = Math.max(0, INITIAL_DEBT - totalEarned);
  const progressPercent = Math.min(100, Math.round((totalEarned / INITIAL_DEBT) * 100));

  const debtToMilestone = Math.max(0, remainingDebt - (INITIAL_DEBT - NEXT_MILESTONE_TARGET));
  const workdaysToMilestone = Math.ceil(debtToMilestone / DAILY_RATE);

  remainingDebtEl.textContent = `${remainingDebt.toLocaleString("vi-VN")} VND`;
  progressFillEl.style.width = `${progressPercent}%`;
  progressPercentEl.textContent = `${progressPercent}%`;

  nextMilestoneEl.textContent = `⬇ ${NEXT_MILESTONE_TARGET.toLocaleString("vi-VN")} VND`;
  workdaysLeftEl.textContent = `${workdaysToMilestone} workdays left`;

  totalEarnedEl.textContent = `${(totalEarned / 1000000).toFixed(2)}M`;
  streakCountEl.textContent = `🔥 ${calculateStreak()} workdays`;

  projectedDateEl.textContent = calculateProjectedDate(remainingDebt);
}

// Initialize Application
renderCalendar();
updateTracker();
