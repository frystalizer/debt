const INITIAL_DEBT = 300000000; 
const MILESTONE_STEP = 100000000; // Decrements in 100M chunks

// Start Constraint Anchor: July 15, 2026
const START_YEAR = 2026;
const START_MONTH = 6; // July (0-indexed)
const START_DAY = 15; 

// Viewing state
let currentYear = 2026;
let currentMonth = 6; 

let monthlySalary = loadMonthlySalary();

function loadMonthlySalary() {
  const saved = localStorage.getItem("debt_tracker_monthly_salary");
  return saved ? parseFloat(saved) : 76000000;
}

function saveMonthlySalary(amount) {
  localStorage.setItem("debt_tracker_monthly_salary", amount);
}

function formatDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function loadSavedDays() {
  const saved = localStorage.getItem("debt_tracker_checked_keys");
  if (saved) {
    try {
      return new Set(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to parse local storage", e);
    }
  }
  return new Set([15, 16, 17, 20, 21, 22, 23, 24].map(d => formatDateKey(2026, 6, d)));
}

let checkedKeys = loadSavedDays();

function saveDays() {
  localStorage.setItem("debt_tracker_checked_keys", JSON.stringify(Array.from(checkedKeys)));
}

function getWorkdaysInMonth(year, month) {
  const totalDays = new Date(year, month + 1, 0).getDate();
  let workdays = 0;
  for (let day = 1; day <= totalDays; day++) {
    const dayOfWeek = new Date(year, month, day).getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workdays++;
    }
  }
  return workdays;
}

function getDailyRateForMonth(year, month) {
  const workdays = getWorkdaysInMonth(year, month);
  return workdays > 0 ? monthlySalary / workdays : 0;
}

function renderCalendar() {
  const gridEl = document.getElementById("calendar-grid");
  const titleEl = document.getElementById("calendar-title");
  const subtitleEl = document.getElementById("month-rate-subtitle");
  const prevBtn = document.getElementById("prev-month");

  if (!gridEl || !titleEl) return;

  gridEl.innerHTML = "";

  const dateObj = new Date(currentYear, currentMonth, 1);
  const monthName = dateObj.toLocaleString('en-US', { month: 'long' });
  titleEl.textContent = `${monthName} ${currentYear}`;

  const workdays = getWorkdaysInMonth(currentYear, currentMonth);
  const dailyRate = getDailyRateForMonth(currentYear, currentMonth);
  if (subtitleEl) {
    subtitleEl.textContent = `${Math.round(dailyRate).toLocaleString("vi-VN")} VND/day (${workdays} days)`;
  }

  if (prevBtn) {
    prevBtn.disabled = (currentYear === START_YEAR && currentMonth === START_MONTH);
  }

  ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].forEach(d => {
    const div = document.createElement("div");
    div.className = "weekday";
    div.textContent = d;
    gridEl.appendChild(div);
  });

  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const padding = (firstDayIndex + 6) % 7; 

  for (let i = 0; i < padding; i++) {
    gridEl.appendChild(document.createElement("div"));
  }

  // Real-time "Today" checker
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  for (let day = 1; day <= totalDays; day++) {
    const dayDate = new Date(currentYear, currentMonth, day);
    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
    const isBeforeStart = currentYear === START_YEAR && currentMonth === START_MONTH && day < START_DAY;
    const isDisabled = isBeforeStart || isWeekend;

    const tile = document.createElement("div");
    tile.className = "day-tile";

    // Attach "Today" white glow ring
    if (currentYear === todayYear && currentMonth === todayMonth && day === todayDay) {
      tile.classList.add("is-today");
    }

    const numSpan = document.createElement("span");
    numSpan.className = "day-number";
    numSpan.textContent = day;
    tile.appendChild(numSpan);

    if (isDisabled) {
      tile.classList.add("disabled");
    } else {
      const checkSpan = document.createElement("span");
      checkSpan.className = "check-mark";
      checkSpan.textContent = "✓";
      tile.appendChild(checkSpan);

      const dateKey = formatDateKey(currentYear, currentMonth, day);

      if (checkedKeys.has(dateKey)) {
        tile.classList.add("checked");
      } else {
        tile.classList.add("unchecked");
      }

      tile.addEventListener("click", () => {
        if (checkedKeys.has(dateKey)) {
          checkedKeys.delete(dateKey);
          tile.classList.remove("checked");
          tile.classList.add("unchecked");
        } else {
          checkedKeys.add(dateKey);
          tile.classList.remove("unchecked");
          tile.classList.add("checked");
        }
        saveDays();
        updateTracker();
      });
    }

    gridEl.appendChild(tile);
  }
}

function getLatestCheckedDate() {
  if (checkedKeys.size === 0) return new Date(2026, 6, 24);
  const sorted = Array.from(checkedKeys).sort();
  const latestKey = sorted[sorted.length - 1];
  const [y, m, d] = latestKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function calculateTotalEarned() {
  let totalEarned = 0;
  checkedKeys.forEach(dateKey => {
    const [y, m] = dateKey.split('-').map(Number);
    totalEarned += getDailyRateForMonth(y, m - 1);
  });
  return totalEarned;
}

function calculateStreak() {
  let streak = 0;
  let checkDate = getLatestCheckedDate();

  while (true) {
    const isWeekend = checkDate.getDay() === 0 || checkDate.getDay() === 6;
    const year = checkDate.getFullYear();
    const month = checkDate.getMonth();
    const day = checkDate.getDate();

    if (year < START_YEAR || (year === START_YEAR && month === START_MONTH && day < START_DAY)) {
      break;
    }

    if (!isWeekend) {
      const dateKey = formatDateKey(year, month, day);
      if (checkedKeys.has(dateKey)) {
        streak++;
      } else if (streak > 0) {
        break;
      }
    }

    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}

function projectWorkdaysAhead(remainingDebtTarget) {
  if (remainingDebtTarget <= 0) {
    return {
      dateString: "Achieved! 🎉",
      workdaysCount: 0
    };
  }

  let currentDate = getLatestCheckedDate();
  let accumulatedEarning = 0;
  let workdaysCount = 0;

  while (accumulatedEarning < remainingDebtTarget) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const y = currentDate.getFullYear();
      const m = currentDate.getMonth();
      accumulatedEarning += getDailyRateForMonth(y, m);
      workdaysCount++;
    }
  }

  return {
    dateString: currentDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }),
    workdaysCount: workdaysCount
  };
}

function getNextMilestoneTarget(currentRemainingDebt) {
  if (currentRemainingDebt <= 0) return 0;
  const nextTarget = Math.floor((currentRemainingDebt - 1) / MILESTONE_STEP) * MILESTONE_STEP;
  return Math.max(0, nextTarget);
}

function updateTracker() {
  const totalEarned = calculateTotalEarned();
  const remainingDebt = Math.max(0, INITIAL_DEBT - totalEarned);
  const progressPercent = Math.min(100, Math.round((totalEarned / INITIAL_DEBT) * 100));

  const nextMilestoneTarget = getNextMilestoneTarget(remainingDebt);
  const debtToMilestone = Math.max(0, remainingDebt - nextMilestoneTarget);
  const milestoneProjection = projectWorkdaysAhead(debtToMilestone);

  const totalProjection = projectWorkdaysAhead(remainingDebt);

  document.getElementById("remaining-debt").textContent = `${Math.round(remainingDebt).toLocaleString("vi-VN")} VND`;
  document.getElementById("progress-fill").style.width = `${progressPercent}%`;
  document.getElementById("progress-percent").textContent = `${progressPercent}%`;

  if (remainingDebt <= 0) {
    document.getElementById("next-milestone").textContent = `🎉 Fully Debt Free!`;
    document.getElementById("milestone-date").textContent = `Target: Complete`;
    document.getElementById("workdays-left").textContent = `0 workdays left`;
  } else {
    document.getElementById("next-milestone").textContent = `⬇ ${nextMilestoneTarget.toLocaleString("vi-VN")} VND`;
    document.getElementById("milestone-date").textContent = `Target: ${milestoneProjection.dateString}`;
    document.getElementById("workdays-left").textContent = `${milestoneProjection.workdaysCount} workdays left`;
  }

  document.getElementById("total-earned").textContent = `${(totalEarned / 1000000).toFixed(2)}M`;
  document.getElementById("streak-count").textContent = `🔥 ${calculateStreak()} workdays`;

  document.getElementById("projected-date").textContent = totalProjection.dateString;
  document.getElementById("total-workdays-left").textContent = `${totalProjection.workdaysCount} total workdays remaining`;
}

function applyNewSalary() {
  const salaryInput = document.getElementById("monthly-salary-input");
  if (!salaryInput) return;

  const rawValue = salaryInput.value.replace(/[^0-9]/g, "");
  const parsed = parseFloat(rawValue) || 0;

  monthlySalary = parsed;
  saveMonthlySalary(parsed);

  salaryInput.value = parsed > 0 ? parsed.toLocaleString("vi-VN") : "";

  renderCalendar();
  updateTracker();
}

document.addEventListener("DOMContentLoaded", () => {
  const salaryInput = document.getElementById("monthly-salary-input");
  const applyBtn = document.getElementById("apply-salary-btn");
  const prevBtn = document.getElementById("prev-month");
  const nextBtn = document.getElementById("next-month");

  if (salaryInput) {
    salaryInput.value = Math.round(monthlySalary).toLocaleString("vi-VN");

    salaryInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        applyNewSalary();
      }
    });
  }

  if (applyBtn) {
    applyBtn.addEventListener("click", applyNewSalary);
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentYear > START_YEAR || (currentYear === START_YEAR && currentMonth > START_MONTH)) {
        if (currentMonth === 0) {
          currentMonth = 11;
          currentYear--;
        } else {
          currentMonth--;
        }
        renderCalendar();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (currentMonth === 11) {
        currentMonth = 0;
        currentYear++;
      } else {
        currentMonth++;
      }
      renderCalendar();
    });
  }

  renderCalendar();
  updateTracker();
});
