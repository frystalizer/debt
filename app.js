// Local Storage Keys
const STORAGE_TASKS_KEY = "scheduler_tasks_list";
const STORAGE_COMPLETED_KEY = "scheduler_completed_keys";
const STORAGE_DEBT_KEY = "debt_tracker_total_debt";
const STORAGE_SALARY_KEY = "debt_tracker_monthly_salary";

const MILESTONE_STEP = 100000000; // Decrements in 100M chunks

// Dynamic Start Constraint Anchor (Defaults to July 15, 2026)
let calendarStartDate = new Date(2026, 6, 15); // Month is 0-indexed (6 = July)

// Dynamic Viewing State (Defaults to Current Real-World Date)
const now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth(); 
let selectedColor = "#f97316";

// Selected Date for Filter (null = default "Today & Overdue")
let selectedDate = null;

let monthlySalary = loadMonthlySalary();
let initialDebt = loadTotalDebt();

function loadMonthlySalary() {
  const saved = localStorage.getItem(STORAGE_SALARY_KEY);
  return saved ? parseFloat(saved) : 76000000;
}

function saveMonthlySalary(amount) {
  localStorage.setItem(STORAGE_SALARY_KEY, amount);
}

function loadTotalDebt() {
  const saved = localStorage.getItem(STORAGE_DEBT_KEY);
  return saved ? parseFloat(saved) : 300000000;
}

function saveTotalDebt(amount) {
  localStorage.setItem(STORAGE_DEBT_KEY, amount);
}

function loadTasks() {
  const saved = localStorage.getItem(STORAGE_TASKS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse tasks", e);
    }
  }
  return [];
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(tasks));
}

function loadCompletedKeys() {
  const saved = localStorage.getItem(STORAGE_COMPLETED_KEY);
  if (saved) {
    try {
      return new Set(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to parse completion records", e);
    }
  }
  return new Set();
}

function saveCompletedKeys(completedSet) {
  localStorage.setItem(STORAGE_COMPLETED_KEY, JSON.stringify(Array.from(completedSet)));
}

let tasks = loadTasks();
let completedKeys = loadCompletedKeys();

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

function isTaskDueOnDate(task, dateObj) {
  if (!task.startDate) return false;

  const targetKey = formatDateKey(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate()
  );

  const interval = Number(task.intervalDays);

  if (interval === 0 || isNaN(interval)) {
    return task.startDate === targetKey;
  }

  const [startYear, startMonth, startDay] = task.startDate.split('-').map(Number);
  const start = new Date(startYear, startMonth - 1, startDay);
  const target = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());

  if (target < start) return false;

  const diffTime = target.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return diffDays % interval === 0;
}

function getTasksForDate(dateObj) {
  return tasks.filter(task => isTaskDueOnDate(task, dateObj));
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
    const rateInMillions = (dailyRate / 1000000).toFixed(1);
    subtitleEl.textContent = `${rateInMillions}M/day (${workdays} days)`;
  }

  const startYearThreshold = calendarStartDate.getFullYear();
  const startMonthThreshold = calendarStartDate.getMonth();

  if (prevBtn) {
    prevBtn.disabled = (currentYear === startYearThreshold && currentMonth === startMonthThreshold);
  }

  ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].forEach(d => {
    const div = document.createElement("div");
    div.className = "weekday";
    div.textContent = d;
    gridEl.appendChild(div);
  });

  let firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const padding = (firstDayIndex === 0) ? 6 : firstDayIndex - 1;
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let i = 0; i < padding; i++) {
    const padTile = document.createElement("div");
    padTile.className = "day-tile empty";
    gridEl.appendChild(padTile);
  }

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  for (let day = 1; day <= totalDays; day++) {
    const dayDate = new Date(currentYear, currentMonth, day);
    const dateKeyStr = formatDateKey(currentYear, currentMonth, day);
    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
    
    const isBeforeStart = dayDate < calendarStartDate;
    const isDisabled = isBeforeStart || isWeekend;

    const tile = document.createElement("div");

    if (isDisabled) {
      tile.className = "day-tile disabled";
    } else {
      tile.className = "day-tile clickable";
    }

    if (currentYear === todayYear && currentMonth === todayMonth && day === todayDay) {
      tile.classList.add("is-today");
    }

    if (selectedDate && 
        selectedDate.getFullYear() === currentYear && 
        selectedDate.getMonth() === currentMonth && 
        selectedDate.getDate() === day) {
      tile.classList.add("is-selected");
    }

    const numSpan = document.createElement("span");
    numSpan.className = "day-number";
    numSpan.textContent = day;
    tile.appendChild(numSpan);

    const dueTasks = getTasksForDate(dayDate);
    if (dueTasks.length > 0 && !isBeforeStart) {
      tile.classList.add("has-task");
      const indicator = document.createElement("div");
      indicator.className = "task-dots";

      let allDone = true;
      dueTasks.forEach(task => {
        const key = `${task.id}_${dateKeyStr}`;
        if (!completedKeys.has(key)) allDone = false;
      });

      if (allDone) {
        tile.classList.add("all-completed");
      }

      indicator.innerHTML = dueTasks.map(task => {
        const isDone = completedKeys.has(`${task.id}_${dateKeyStr}`);
        const dotColor = isDone ? 'var(--accent-green)' : (task.color || 'var(--accent)');
        return `<span class="dot" style="background-color: ${dotColor};"></span>`;
      }).join('');
      
      tile.appendChild(indicator);
    }

    if (!isDisabled) {
      const checkSpan = document.createElement("span");
      checkSpan.className = "check-mark";
      checkSpan.textContent = "✓";
      tile.appendChild(checkSpan);

      if (checkedKeys.has(dateKeyStr)) {
        tile.classList.add("checked");
      } else {
        tile.classList.add("unchecked");
      }

      tile.addEventListener("click", () => {
        if (selectedDate && 
            selectedDate.getFullYear() === currentYear && 
            selectedDate.getMonth() === currentMonth && 
            selectedDate.getDate() === day) {
          selectedDate = null;
        } else {
          selectedDate = new Date(currentYear, currentMonth, day);
        }

        if (checkedKeys.has(dateKeyStr)) {
          checkedKeys.delete(dateKeyStr);  
          tile.classList.remove("checked");
          tile.classList.add("unchecked");
        } else {
          checkedKeys.add(dateKeyStr);
          tile.classList.remove("unchecked");
          tile.classList.add("checked");

          tile.animate(
            [
              { transform: "scale(0.92)" },
              { transform: "scale(1.08)" },
              { transform: "scale(1)" }
            ],
            { duration: 250, easing: "ease-out" }
          );

          const curRate = getDailyRateForMonth(currentYear, currentMonth);
          const earnedMillions = curRate / 1000000;
          const totalEarned = calculateTotalEarned();
          const remainingDebt = Math.max(0, initialDebt - totalEarned);
          const projection = projectWorkdaysAhead(remainingDebt);

          showToast(earnedMillions, projection.workdaysCount);
        }

        saveDays();
        updateTracker();
        renderCalendar();
        renderUpcomingTasks();
      });
    }

    gridEl.appendChild(tile);
  }

  const totalSlotsRendered = padding + totalDays;
  const trailingPadding = (42 - totalSlotsRendered) % 7;
  for (let i = 0; i < trailingPadding; i++) {
    const padTile = document.createElement("div");
    padTile.className = "day-tile empty";
    gridEl.appendChild(padTile);
  }
}

function getLatestCheckedDate() {
  if (checkedKeys.size === 0) {
    const todayDate = new Date();
    return todayDate > calendarStartDate ? todayDate : new Date(calendarStartDate);
  }
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
    if (checkDate < calendarStartDate) {
      break;
    }

    if (!isWeekend) {
      const dateKey = formatDateKey(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
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

function getIntervalLabel(days) {
  switch (Number(days)) {
    case 0: return "Once";
    case 1: return "Daily";
    case 7: return "Weekly";
    case 14: return "Bi-weekly";
    case 30: return "Monthly";
    case 60: return "Bi-monthly";
    case 90: return "Quarterly";
    default: return `Every ${days} days`;
  }
}

function selectColorOption(colorHex) {
  selectedColor = colorHex;
  const colorPicker = document.getElementById("color-picker");
  if (!colorPicker) return;

  const options = colorPicker.querySelectorAll(".color-option");
  let matched = false;

  options.forEach(el => {
    if (el.dataset.color.toLowerCase() === colorHex.toLowerCase()) {
      el.classList.add("selected");
      matched = true;
    } else {
      el.classList.remove("selected");
    }
  });

  if (!matched && options.length > 0) {
    options[0].classList.add("selected");
    selectedColor = options[0].dataset.color;
  }
}

function openEditModal(task) {
  const modalOverlay = document.getElementById("task-modal");
  const modalTitle = document.getElementById("modal-title");
  const editIdInput = document.getElementById("editing-task-id");
  const titleInput = document.getElementById("task-title-input");
  const intervalSelect = document.getElementById("task-interval-select");
  const startInput = document.getElementById("task-start-input");
  const deleteBtn = document.getElementById("delete-task-btn");

  if (modalTitle) modalTitle.textContent = "Edit Task";
  if (editIdInput) editIdInput.value = task.id;
  if (titleInput) titleInput.value = task.title;
  if (intervalSelect) intervalSelect.value = task.intervalDays;
  if (startInput) startInput.value = task.startDate;

  selectColorOption(task.color || "#f97316");

  if (deleteBtn) deleteBtn.style.display = "inline-block";
  if (modalOverlay) modalOverlay.classList.remove("hidden");
}

function renderUpcomingTasks() {
  const container = document.getElementById("upcoming-tasks-list");
  const headerLabel = document.getElementById("due-tasks-label");
  const resetBtn = document.getElementById("reset-filter-btn");

  if (!container) return;

  container.innerHTML = "";

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  let taskList = [];

  if (selectedDate) {
    const formattedHeader = selectedDate.toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' });
    if (headerLabel) headerLabel.textContent = `Tasks for ${formattedHeader}`;
    if (resetBtn) resetBtn.classList.remove("hidden");

    const dateKeyStr = formatDateKey(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const dueOnDate = getTasksForDate(selectedDate);

    dueOnDate.forEach(task => {
      const isCompleted = completedKeys.has(`${task.id}_${dateKeyStr}`);
      const isOverdue = selectedDate < todayDate && !isCompleted;
      taskList.push({
        task,
        date: selectedDate,
        dateKeyStr,
        isCompleted,
        isOverdue
      });
    });

  } else {
    if (headerLabel) headerLabel.textContent = "Due Tasks";
    if (resetBtn) resetBtn.classList.add("hidden");

    let minDaysBack = 0;
    tasks.forEach(t => {
      if (t.startDate) {
        const [y, m, d] = t.startDate.split('-').map(Number);
        const sDate = new Date(y, m - 1, d);
        const diffDays = Math.floor((todayDate - sDate) / (1000 * 60 * 60 * 24));
        if (diffDays > minDaysBack) minDaysBack = diffDays;
      }
    });

    for (let i = minDaysBack; i > 0; i--) {
      const checkDate = new Date(todayDate);
      checkDate.setDate(todayDate.getDate() - i);

      const due = getTasksForDate(checkDate);
      const dateKeyStr = formatDateKey(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());

      due.forEach(task => {
        const isCompleted = completedKeys.has(`${task.id}_${dateKeyStr}`);
        if (!isCompleted) {
          taskList.push({
            task,
            date: checkDate,
            dateKeyStr,
            isCompleted: false,
            isOverdue: true
          });
        }
      });
    }

    const todayDue = getTasksForDate(todayDate);
    const todayKeyStr = formatDateKey(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());

    todayDue.forEach(task => {
      taskList.push({
        task,
        date: todayDate,
        dateKeyStr: todayKeyStr,
        isCompleted: completedKeys.has(`${task.id}_${todayKeyStr}`),
        isOverdue: false
      });
    });
  }

  if (taskList.length === 0) {
    const emptyMsg = selectedDate 
      ? `No tasks scheduled for ${selectedDate.toLocaleDateString("en-US", { month: 'short', day: 'numeric' })}.` 
      : `No tasks scheduled for today or past due.`;
    container.innerHTML = `<div class="empty-state">${emptyMsg}</div>`;
    return;
  }

  taskList.forEach(item => {
    const card = document.createElement("div");
    card.className = `task-card ${item.isCompleted ? 'completed' : ''}`;
    
    const taskColor = item.task.color || 'var(--accent)';
    card.style.borderLeftColor = item.isCompleted ? 'var(--accent-green)' : taskColor;

    const dateFormatted = item.date.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' });
    const overdueTag = item.isOverdue ? ' · <strong style="color: #ef4444;">Overdue</strong>' : '';

    card.innerHTML = `
      <div class="task-info">
        <div class="task-title">${item.task.title}</div>
        <div class="task-sub">${dateFormatted} · ${getIntervalLabel(item.task.intervalDays)}${overdueTag}</div>
      </div>
      <div class="task-actions">
        <button class="edit-btn" title="Edit Task">✏️</button>
        <button class="check-btn">${item.isCompleted ? '✓' : ''}</button>
      </div>
    `;

    card.querySelector(".edit-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      openEditModal(item.task);
    });

    card.querySelector(".check-btn").addEventListener("click", () => {
      const completionKey = `${item.task.id}_${item.dateKeyStr}`;
      if (completedKeys.has(completionKey)) {
        completedKeys.delete(completionKey);
      } else {
        completedKeys.add(completionKey);
        showToastMessage("Task Done!", item.task.title);
      }
      saveCompletedKeys(completedKeys);
      renderUpcomingTasks();
      renderCalendar();
    });

    container.appendChild(card);
  });
}

function deleteTask(id) {
  const taskToDelete = tasks.find(t => t.id === id);
  if (!taskToDelete) return;

  tasks = tasks.filter(t => t.id !== id);
  saveTasks(tasks);

  const newCompletedKeys = new Set();
  completedKeys.forEach(key => {
    if (!key.startsWith(`${id}_`)) {
      newCompletedKeys.add(key);
    }
  });
  completedKeys = newCompletedKeys;
  saveCompletedKeys(completedKeys);

  showToastMessage("Task Deleted", taskToDelete.title);
}

const toastMessages = [
  "🎉 Great work!",
  "💪 Keep going!",
  "🏠 One step closer.",
  "🔥 Streak continues!",
  "🚀 Nice progress!",
  "📈 You're getting there!"
];

let toastTimeout;

function showToast(amount, workdaysLeft) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  const randomMessage = toastMessages[Math.floor(Math.random() * toastMessages.length)];

  const amountEl = document.getElementById("toast-amount");
  if (amountEl) amountEl.textContent = `+${amount.toFixed(2)}M`;
  
  const msgEl = document.querySelector("#toast .toast-message");
  if (msgEl) msgEl.textContent = randomMessage;

  const subEl = document.getElementById("toast-sub");
  if (subEl) subEl.textContent = `${workdaysLeft} workdays left`;

  toast.classList.remove("hidden");
  toast.classList.remove("show");
  void toast.offsetWidth;

  toast.classList.add("show");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 350);
  }, 2000);
}

function showToastMessage(title, sub) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  const msgEl = document.querySelector("#toast .toast-message") || document.getElementById("toast-title");
  if (msgEl) msgEl.textContent = title;

  const subEl = document.getElementById("toast-sub");
  if (subEl) subEl.textContent = sub;

  toast.classList.remove("hidden");
  toast.classList.remove("show");
  void toast.offsetWidth;
  toast.classList.add("show");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, 2000);
}

function updateTracker() {
  const totalEarned = calculateTotalEarned();
  const remainingDebt = Math.max(0, initialDebt - totalEarned);
  const progressPercent = Math.min(100, Math.round((totalEarned / initialDebt) * 100));

  const nextMilestoneTarget = getNextMilestoneTarget(remainingDebt);
  const debtToMilestone = Math.max(0, remainingDebt - nextMilestoneTarget);
  const milestoneProjection = projectWorkdaysAhead(debtToMilestone);

  const totalProjection = projectWorkdaysAhead(remainingDebt);

  const remainingMillions = (remainingDebt / 1000000).toFixed(1);
  const remLargeEl = document.getElementById("remaining-debt-large");
  if (remLargeEl) remLargeEl.textContent = `${remainingMillions}M`;
  
  const remExactEl = document.getElementById("remaining-debt-exact");
  if (remExactEl) remExactEl.textContent = `${Math.round(remainingDebt).toLocaleString("vi-VN")} VND`;

  const fillEl = document.getElementById("progress-fill");
  if (fillEl) fillEl.style.width = `${progressPercent}%`;

  const percentEl = document.getElementById("progress-percent");
  if (percentEl) percentEl.textContent = `${progressPercent}%`;

  const nextMileEl = document.getElementById("next-milestone");
  const mileDateEl = document.getElementById("milestone-date");
  const workLeftEl = document.getElementById("workdays-left");

  if (remainingDebt <= 0) {
    if (nextMileEl) nextMileEl.textContent = `🎉 Fully Debt Free!`;
    if (mileDateEl) mileDateEl.textContent = `Target: Complete`;
    if (workLeftEl) workLeftEl.textContent = `0 workdays left`;
  } else {
    if (nextMileEl) nextMileEl.textContent = `⬇ ${nextMilestoneTarget.toLocaleString("vi-VN")} VND`;
    if (mileDateEl) mileDateEl.textContent = `Target: ${milestoneProjection.dateString}`;
    if (workLeftEl) workLeftEl.textContent = `${milestoneProjection.workdaysCount} workdays left`;
  }

  const totEarnedEl = document.getElementById("total-earned");
  if (totEarnedEl) totEarnedEl.textContent = `${(totalEarned / 1000000).toFixed(2)}M`;
  
  const streak = calculateStreak();
  const streakEl = document.getElementById("streak-count");
  if (streakEl) streakEl.innerHTML = `<span class="fire-emoji">🔥</span> ${streak} workdays`;

  const projDateEl = document.getElementById("projected-date");
  if (projDateEl) projDateEl.textContent = totalProjection.dateString;

  const totWorkLeftEl = document.getElementById("total-workdays-left");
  if (totWorkLeftEl) totWorkLeftEl.textContent = `${totalProjection.workdaysCount} total workdays remaining`;
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

function applyNewDebt() {
  const debtInput = document.getElementById("total-debt-input");
  if (!debtInput) return;

  const rawValue = debtInput.value.replace(/[^0-9]/g, "");
  const parsed = parseFloat(rawValue) || 0;

  initialDebt = parsed;
  saveTotalDebt(parsed);

  debtInput.value = parsed > 0 ? parsed.toLocaleString("vi-VN") : "";

  renderCalendar();
  updateTracker();
}

document.addEventListener("DOMContentLoaded", () => {
  const salaryInput = document.getElementById("monthly-salary-input");
  const applySalaryBtn = document.getElementById("apply-salary-btn");
  const debtInput = document.getElementById("total-debt-input");
  const applyDebtBtn = document.getElementById("apply-debt-btn");

  const prevBtn = document.getElementById("prev-month");
  const nextBtn = document.getElementById("next-month");
  const openModalBtn = document.getElementById("open-modal-btn");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const modalOverlay = document.getElementById("task-modal");
  const modalTitle = document.getElementById("modal-title");
  const editIdInput = document.getElementById("editing-task-id");
  const addBtn = document.getElementById("add-task-btn");
  const deleteBtn = document.getElementById("delete-task-btn");
  const colorPicker = document.getElementById("color-picker");
  const resetFilterBtn = document.getElementById("reset-filter-btn");

  // Calendar Start Date Picker
  const calendarStartDateInput = document.getElementById("calendar-start-date-input");
  if (calendarStartDateInput) {
    const initialKey = formatDateKey(calendarStartDate.getFullYear(), calendarStartDate.getMonth(), calendarStartDate.getDate());
    calendarStartDateInput.value = initialKey;

    calendarStartDateInput.addEventListener("change", (e) => {
      const val = e.target.value;
      if (!val) return;

      const [y, m, d] = val.split('-').map(Number);
      calendarStartDate = new Date(y, m - 1, d);
      currentYear = y;
      currentMonth = m - 1;

      renderCalendar();
      renderUpcomingTasks();
      updateTracker();
    });
  }

  const startDateInput = document.getElementById("task-start-input");
  if (startDateInput) {
    startDateInput.value = formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
  }

  if (colorPicker) {
    colorPicker.addEventListener("click", (e) => {
      const option = e.target.closest(".color-option");
      if (!option) return;

      colorPicker.querySelectorAll(".color-option").forEach(el => el.classList.remove("selected"));
      option.classList.add("selected");
      selectedColor = option.dataset.color;
    });
  }

  if (resetFilterBtn) {
    resetFilterBtn.addEventListener("click", () => {
      selectedDate = null;
      renderCalendar();
      renderUpcomingTasks();
    });
  }

  function openNewTaskModal() {
    if (modalTitle) modalTitle.textContent = "New Task";
    if (editIdInput) editIdInput.value = "";

    const titleInput = document.getElementById("task-title-input");
    if (titleInput) titleInput.value = "";

    const startInput = document.getElementById("task-start-input");
    if (startInput) {
      const defaultDate = selectedDate || now;
      startInput.value = formatDateKey(defaultDate.getFullYear(), defaultDate.getMonth(), defaultDate.getDate());
    }

    const intervalSelect = document.getElementById("task-interval-select");
    if (intervalSelect) intervalSelect.value = "0";

    selectColorOption("#f97316");

    if (deleteBtn) deleteBtn.style.display = "none";
    if (modalOverlay) modalOverlay.classList.remove("hidden");
  }

  function closeModal() {
    if (modalOverlay) modalOverlay.classList.add("hidden");
  }

  if (openModalBtn) openModalBtn.addEventListener("click", openNewTaskModal);
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);

  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      const editId = editIdInput ? editIdInput.value : "";
      if (editId) {
        deleteTask(editId);
        closeModal();
        renderUpcomingTasks();
        renderCalendar();
      }
    });
  }

  // Monthly Salary Handlers
  if (salaryInput) {
    salaryInput.value = Math.round(monthlySalary).toLocaleString("vi-VN");
    salaryInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") applyNewSalary();
    });
  }
  if (applySalaryBtn) applySalaryBtn.addEventListener("click", applyNewSalary);

  // Total Debt Handlers
  if (debtInput) {
    debtInput.value = Math.round(initialDebt).toLocaleString("vi-VN");
    debtInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") applyNewDebt();
    });
  }
  if (applyDebtBtn) applyDebtBtn.addEventListener("click", applyNewDebt);

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      const startYearThreshold = calendarStartDate.getFullYear();
      const startMonthThreshold = calendarStartDate.getMonth();

      if (currentYear > startYearThreshold || (currentYear === startYearThreshold && currentMonth > startMonthThreshold)) {
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

  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const titleInput = document.getElementById("task-title-input");
      const intervalSelect = document.getElementById("task-interval-select");
      const startInput = document.getElementById("task-start-input");
      const editId = editIdInput ? editIdInput.value : "";

      const title = titleInput ? titleInput.value.trim() : "";
      const interval = intervalSelect ? parseInt(intervalSelect.value, 10) : 0;
      const start = startInput ? startInput.value : "";

      if (!title || isNaN(interval) || !start) {
        showToastMessage("Error", "Please fill out all fields.");
        return;
      }

      if (editId) {
        const taskIdx = tasks.findIndex(t => t.id === editId);
        if (taskIdx !== -1) {
          tasks[taskIdx] = {
            ...tasks[taskIdx],
            title,
            intervalDays: interval,
            startDate: start,
            color: selectedColor
          };
          saveTasks(tasks);
          showToastMessage("Task Updated", title);
        }
      } else {
        const newTask = {
          id: Date.now().toString(),
          title,
          intervalDays: interval,
          startDate: start,
          color: selectedColor
        };
        tasks.push(newTask);
        saveTasks(tasks);
        showToastMessage("Added Task", title);
      }

      if (titleInput) titleInput.value = "";
      closeModal();

      renderUpcomingTasks();
      renderCalendar();
    });
  }

  renderCalendar();
  renderUpcomingTasks();
  updateTracker();
});
