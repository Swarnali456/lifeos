(() => {
  'use strict';

  const KEY = 'lifeos_data_v1';

  const defaults = {
    tasks: [],
    goals: [],
    habits: [],
    expenses: [],
    interests: [],
    notes: [],
    preferences: {
      name: '',
      goal: '',
      time: 'morning',
      memory: false
    },
    theme: 'light'
  };

  const clone = value => JSON.parse(JSON.stringify(value));

  let data = load();

  function load() {
    try {
      return {
        ...clone(defaults),
        ...JSON.parse(localStorage.getItem(KEY) || '{}')
      };
    } catch {
      return clone(defaults);
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      toast('Could not save. Browser storage may be full.');
    }
  }

  const $ = id => document.getElementById(id);

  const safe = value => String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function showView(name) {
    document.querySelectorAll('.view').forEach(v => {
      v.classList.toggle('active', v.id === 'view-' + name);
    });

    document.querySelectorAll('.nav-link').forEach(b => {
      b.classList.toggle('active', b.dataset.view === name);
    });

    const titles = {
      overview: 'Your overview',
      manage: 'Manage your life',
      learn: 'Learn & grow',
      preferences: 'Preferences & memory'
    };

    $('page-title').textContent = titles[name] || 'LifeOS';
  }

  document.querySelectorAll('[data-view]').forEach(b => {
    b.addEventListener('click', () => showView(b.dataset.view));
  });

  document.querySelectorAll('[data-go]').forEach(b => {
    b.addEventListener('click', () => showView(b.dataset.go));
  });

  function addItem(formId, inputId, listKey) {
    $(formId).addEventListener('submit', e => {
      e.preventDefault();

      const value = $(inputId).value.trim();
      if (!value) return;

      data[listKey].unshift({
        id: uid(),
        text: value,
        done: false
      });

      $(inputId).value = '';
      save();
      render();
      toast('Added successfully.');
    });
  }

  addItem('task-form', 'task-input', 'tasks');
  addItem('goal-form', 'goal-input', 'goals');
  addItem('habit-form', 'habit-input', 'habits');
  addItem('interest-form', 'interest-input', 'interests');

  $('task-list').addEventListener('change', e => {
    if (e.target.matches('[data-task-check]')) {
      const item = data.tasks.find(x => x.id === e.target.dataset.taskCheck);
      if (item) item.done = e.target.checked;

      save();
      render();
    }
  });

  document.addEventListener('click', e => {
    const del = e.target.closest('[data-delete]');
    if (!del) return;

    const { delete: key, id } = del.dataset;

    if (Array.isArray(data[key])) {
      data[key] = data[key].filter(x => x.id !== id);
    }

    save();
    render();
  });

  $('expense-form').addEventListener('submit', e => {
    e.preventDefault();

    const name = $('expense-name').value.trim();
    const amount = Number($('expense-amount').value);

    if (!name || !Number.isFinite(amount) || amount <= 0) return;

    data.expenses.unshift({
      id: uid(),
      name,
      amount
    });

    $('expense-name').value = '';
    $('expense-amount').value = '';

    save();
    render();
    toast('Expense added.');
  });

  $('note-form').addEventListener('submit', e => {
    e.preventDefault();

    const title = $('note-title').value.trim();
    const content = $('note-content').value.trim();

    if (!title || !content) return;

    data.notes.unshift({
      id: uid(),
      title,
      content
    });

    $('note-title').value = '';
    $('note-content').value = '';

    save();
    render();
    toast('Note saved on this device.');
  });

  function renderList(id, items, key, labelKey = 'text', checkable = false) {
    const el = $(id);

    if (!items.length) {
      el.innerHTML = '<li class="empty-state">Nothing here yet. Add your first one above.</li>';
      return;
    }

    el.innerHTML = items.map(item => `
      <li class="item-row ${item.done ? 'done' : ''}">
        ${checkable ? `
          <input type="checkbox"
            data-task-check="${safe(item.id)}"
            ${item.done ? 'checked' : ''}
            aria-label="Mark ${safe(item[labelKey])} complete">
        ` : ''}
        <span class="item-text">${safe(item[labelKey])}</span>
        <button class="delete-button"
          data-delete="${key}"
          data-id="${safe(item.id)}"
          aria-label="Delete item">×</button>
      </li>
    `).join('');
  }

  function render() {
    renderList('task-list', data.tasks, 'tasks');
    renderList('goal-list', data.goals, 'goals');

    const today = new Date().toISOString().slice(0, 10);

    data.habits.forEach(h => {
      if (h.checkedDate !== today) h.checked = false;
    });

    $('habit-list').innerHTML = data.habits.length
      ? data.habits.map(h => `
        <li class="item-row ${h.checked ? 'done' : ''}">
          <input type="checkbox"
            data-habit-check="${safe(h.id)}"
            ${h.checked ? 'checked' : ''}
            aria-label="Check habit">
          <span class="item-text">${safe(h.text)}</span>
          <button class="delete-button"
            data-delete="habits"
            data-id="${safe(h.id)}"
            aria-label="Delete habit">×</button>
        </li>
      `).join('')
      : '<li class="empty-state">Nothing here yet. Add your first one above.</li>';

    $('habit-count').textContent =
      `${data.habits.filter(h => h.checked).length}/${data.habits.length}`;

    $('task-count').textContent =
      data.tasks.filter(t => !t.done).length + ' open';

    $('expense-list').innerHTML = data.expenses.length
      ? data.expenses.map(x => `
        <li class="item-row">
          <span class="item-text">${safe(x.name)}</span>
          <strong>₹${x.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
          <button class="delete-button"
            data-delete="expenses"
            data-id="${safe(x.id)}"
            aria-label="Delete expense">×</button>
        </li>
      `).join('')
      : '<li class="empty-state">No expenses recorded.</li>';

    $('expense-total').textContent =
      '₹' + data.expenses.reduce((s, x) => s + x.amount, 0)
        .toLocaleString('en-IN', { maximumFractionDigits: 2 });

    $('interest-list').innerHTML = data.interests.length
      ? data.interests.map(x => `
        <span class="tag">
          ${safe(x.text)}
          <button data-delete="interests"
            data-id="${safe(x.id)}"
            aria-label="Remove ${safe(x.text)}">×</button>
        </span>
      `).join('')
      : '<span class="empty-state">Add a topic you are curious about.</span>';

    $('note-list').innerHTML = data.notes.length
      ? data.notes.map(n => `
        <article class="note-card">
          <strong>${safe(n.title)}</strong>
          <p>${safe(n.content)}</p>
          <button class="delete-button"
            data-delete="notes"
            data-id="${safe(n.id)}">Delete</button>
        </article>
      `).join('')
      : '<p class="empty-state">Your saved notes will appear here.</p>';

    $('stat-completed').textContent =
      data.tasks.filter(t => t.done).length;

    $('stat-goals').textContent = data.goals.length;

    $('stat-habits').textContent =
      data.habits.filter(h => h.checked).length;

    const overview = data.tasks.filter(t => !t.done).slice(0, 4);

    $('overview-tasks').innerHTML = overview.length
      ? overview.map(t => `
        <div class="item-row">
          <span class="item-text">${safe(t.text)}</span>
        </div>
      `).join('')
      : 'No open tasks. Add one small task to get started.';

    updateSuggestion();
    save();
  }

  $('habit-list').addEventListener('change', e => {
    if (e.target.matches('[data-habit-check]')) {
      const h = data.habits.find(
        x => x.id === e.target.dataset.habitCheck
      );

      if (h) {
        h.checked = e.target.checked;
        h.checkedDate = new Date().toISOString().slice(0, 10);
      }

      save();
      render();
    }
  });

  function updateSuggestion() {
    const p = data.preferences;

    let title = 'Start with one small win.';
    let message = 'Add a task or goal. You can make progress without planning your entire day.';

    if (data.tasks.some(t => !t.done)) {
      title = 'Choose one task and begin.';
      message = 'You have an open task waiting. Try giving it 15 focused minutes.';
    } else if (data.goals.length) {
      title = 'Reconnect with a goal.';
      message = 'Your goals matter. Add one tiny action that moves one of them forward.';
    } else if (data.interests.length) {
      title = 'Follow your curiosity.';
      message = 'Pick one of your learning interests and spend a few minutes exploring it.';
    }

    if (p.goal) {
      message = `A small step towards "${p.goal}" is enough for today. ${message}`;
    }

    if (p.name) {
      title = `${p.name}, ${title.charAt(0).toLowerCase() + title.slice(1)}`;
    }

    $('suggestion-title').textContent = title;
    $('suggestion-text').textContent = message;

    $('welcome-title').textContent = p.name
      ? `Welcome back, ${p.name}.`
      : 'Make today count.';
  }

  const facts = [
    ['Space', 'Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.'],
    ['Nature', 'Octopuses have three hearts.'],
    ['Mathematics', 'A googol is the number 1 followed by 100 zeros.'],
    ['Science', 'Water expands when it freezes, which makes ice less dense than liquid water.'],
    ['Astronomy', 'Jupiter is the largest planet in our solar system.']
  ];

  let factIndex = 0;

  $('new-fact').addEventListener('click', () => {
    factIndex = (factIndex + 1) % facts.length;

    $('fact-title').textContent = facts[factIndex][0];
    $('fact-text').textContent = facts[factIndex][1];
  });

  const questions = [
    {
      q: 'Which planet is known as the Red Planet?',
      o: ['Venus', 'Mars', 'Jupiter'],
      a: 1,
      e: 'Mars looks reddish because of iron-rich dust on its surface.'
    },
    {
      q: 'What is 12 × 8?',
      o: ['86', '96', '108'],
      a: 1,
      e: '12 multiplied by 8 equals 96.'
    },
    {
      q: 'Who was the first person to walk on the Moon?',
      o: ['Yuri Gagarin', 'Neil Armstrong', 'Buzz Aldrin'],
      a: 1,
      e: 'Neil Armstrong stepped onto the Moon in July 1969.'
    }
  ];

  let qIndex = 0;

  function showQuestion() {
    const q = questions[qIndex];

    $('quiz-question').textContent = q.q;
    $('quiz-feedback').textContent = '';

    $('quiz-options').innerHTML = q.o.map((o, i) => `
      <button class="quiz-option" data-answer="${i}">
        ${safe(o)}
      </button>
    `).join('');
  }

  $('quiz-options').addEventListener('click', e => {
    const b = e.target.closest('[data-answer]');
    if (!b) return;

    const q = questions[qIndex];
    const correct = Number(b.dataset.answer) === q.a;

    $('quiz-feedback').textContent =
      (correct ? 'Correct! ' : 'Not quite. ') + q.e;

    $('quiz-options').querySelectorAll('button').forEach(x => {
      x.disabled = true;
    });
  });

  $('next-question').addEventListener('click', () => {
    qIndex = (qIndex + 1) % questions.length;
    showQuestion();
  });

  $('preferences-form').addEventListener('submit', e => {
    e.preventDefault();

    data.preferences = {
      name: $('pref-name').value.trim(),
      goal: $('pref-goal').value.trim(),
      time: $('pref-time').value,
      memory: $('pref-memory').checked
    };

    if (!data.preferences.memory) {
      data.preferences = {
        name: '',
        goal: '',
        time: data.preferences.time,
        memory: false
      };

      $('pref-name').value = '';
      $('pref-goal').value = '';
    }

    save();
    render();
    toast('Preferences saved.');
  });

  function fillPreferences() {
    const p = data.preferences;

    $('pref-name').value = p.name || '';
    $('pref-goal').value = p.goal || '';
    $('pref-time').value = p.time || 'morning';
    $('pref-memory').checked = !!p.memory;
  }

  $('clear-data').addEventListener('click', () => {
    if (!confirm('This will permanently clear all LifeOS data saved in this browser. Continue?')) {
      return;
    }

    localStorage.removeItem(KEY);
    data = clone(defaults);

    fillPreferences();
    render();

    toast('LifeOS data cleared.');
  });

  function setTheme(theme) {
    data.theme = theme;
    document.body.classList.toggle('dark', theme === 'dark');
    save();
  }

  $('theme-toggle').addEventListener('click', () => {
    setTheme(data.theme === 'dark' ? 'light' : 'dark');
  });

  $('global-search').addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) return;

    const routes = [
      ['overview', ['home', 'dashboard', 'overview']],
      ['manage', ['task', 'goal', 'habit', 'budget', 'expense', 'manage']],
      ['learn', ['learn', 'study', 'quiz', 'fact', 'note', 'interest']],
      ['preferences', ['memory', 'preference', 'name', 'theme', 'privacy', 'setting']]
    ];

    const match = routes.find(([, words]) =>
      words.some(w => q.includes(w))
    );

    if (match) showView(match[0]);
  });

  document.addEventListener('keydown', e => {
    if (
      e.key === '/' &&
      !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
    ) {
      e.preventDefault();
      $('global-search').focus();
    }

    if (e.key === 'Escape') {
      $('global-search').value = '';
      $('global-search').blur();
    }
  });

  const now = new Date();

  $('today-label').textContent = now
    .toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
    .toUpperCase();

  const hour = now.getHours();

  $('page-title').textContent =
    hour < 12 ? 'Good morning' :
    hour < 18 ? 'Good afternoon' :
    'Good evening';

  fillPreferences();
  setTheme(data.theme || 'light');
  showQuestion();
  render();

})();
