// App State
const state = {
    view: 'classes', // classes, subjects, topics, subtopics, content
    selectedClass: null,
    selectedSubject: null,
    selectedTopic: null,
    selectedSubtopic: null,
    content: null,
    apiKey: sessionStorage.getItem('gemini_api_key') || '',
    model: sessionStorage.getItem('gemini_model') || 'gemini-3-flash',
    theme: sessionStorage.getItem('theme') || 'dark', // dark, light
    accentColor: sessionStorage.getItem('accent_color') || '#34d399',
    cache: JSON.parse(sessionStorage.getItem('content_cache')) || {},
    history: JSON.parse(sessionStorage.getItem('browsing_history')) || [],
    currentItems: [], // Store items for searching
    currentOnClick: null, // Store click handler for searching
    currentPath: {} // Store current navigation path for history
};

// Class List (Sync with Android App)
const classes = [
    "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6",
    "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12",
    "BTech Computer Science Engineering", "BTech Electronics & Communication", "BTech Electrical Engineering",
    "BTech Mechanical Engineering", "BTech Civil Engineering", "BTech Information Technology",
    "BTech Artificial Intelligence", "BTech Data Science", "BE Instrumentation Engineering",
    "BA English", "BA Economics", "BA History", "BA Political Science", "BA Psychology",
    "BSc Physics", "BSc Chemistry", "BSc Mathematics", "BSc Computer Science", "BSc Zoology",
    "BSc Botany", "BSc Biotechnology", "BSc Microbiology", "BSc Environmental Science",
    "BCom General", "BCom Finance", "BCom Computer Applications",
    "BBA", "BBM", "BMS", "BCA", "LLB",
    "MTech Computer Science", "MTech VLSI", "MTech Structural Engineering",
    "MSc Physics", "MSc Chemistry", "MSc Mathematics", "MSc Data Science",
    "MA English", "MA Economics", "MA Psychology", "MCom", "MBA", "MCA", "LLM",
    "NEET", "JEE", "GATE", "UPSC", "CAT", "NET", "CA Foundation", "CS Executive", "CLAT",
    "MBBS", "BDS", "BAMS", "BHMS", "BUMS", "BSMS",
    "BSc Nursing", "BPT (Physiotherapy)", "BPharm", "BMLT (Medical Lab Technology)", "BOT (Occupational Therapy)",
    "BSc Radiology", "BSc Anesthesia Technology", "BSc Optometry", "BSc Dialysis Technology",
    "MD General Medicine", "MD Pediatrics", "MD Dermatology", "MD Radiology", "MD Psychiatry",
    "MS General Surgery", "MS Orthopedics", "MS ENT", "MS Ophthalmology",
    "MDS (Dental Surgery)", "MPharm", "MPT (Physiotherapy)", "MSc Nursing", "MSc Medical Biochemistry",
    "Diploma in Nursing", "Diploma in Medical Lab Technology", "Diploma in Radiology", "Diploma in Pharmacy"
];

// DOM Elements
const viewContainer = document.getElementById('view-container');
const navContainer = document.getElementById('nav-container');
const loadingOverlay = document.getElementById('loading');
const settingsModal = document.getElementById('settings-modal');
const settingsBtn = document.getElementById('settings-btn');
const closeSettings = document.getElementById('close-settings');
const apiTokenInput = document.getElementById('api-token');
const modelSelect = document.getElementById('model-select');
const saveSettingsBtn = document.getElementById('save-settings');
const settingsFeedback = document.getElementById('settings-feedback');
const globalSearch = document.getElementById('global-search');
const themeToggle = document.getElementById('theme-toggle');
const sunIcon = themeToggle.querySelector('.sun-icon');
const moonIcon = themeToggle.querySelector('.moon-icon');
const swatches = document.querySelectorAll('.swatch');
const historyModal = document.getElementById('history-modal');
const historyBtn = document.getElementById('history-btn');
const closeHistory = document.getElementById('close-history');
const historyList = document.getElementById('history-list');

// Initialize
function init() {
    apiTokenInput.value = state.apiKey;
    modelSelect.value = state.model;

    // Apply theme and accent
    applyTheme(state.theme);
    applyAccent(state.accentColor);

    render();
}

// History Management
function addToHistory(title, path) {
    const historyItem = { title, path: { ...path }, timestamp: Date.now() };
    // Avoid immediate duplicates
    const lastItem = state.history[0];
    if (lastItem && lastItem.title === title && JSON.stringify(lastItem.path) === JSON.stringify(path)) return;

    state.history.unshift(historyItem);
    if (state.history.length > 20) state.history.pop();
    sessionStorage.setItem('browsing_history', JSON.stringify(state.history));
}

function renderHistory() {
    historyList.innerHTML = '';
    if (state.history.length === 0) {
        historyList.innerHTML = '<p style="text-align:center; padding: 2rem; color: var(--text-secondary);">No history yet.</p>';
        return;
    }
    state.history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-item-title">${item.title}</div>
            <div class="history-item-path">${formatPath(item.path)}</div>
        `;
        div.onclick = () => {
            restoreFromHistory(item);
            historyModal.classList.add('hidden');
        };
        historyList.appendChild(div);
    });
}

function formatPath(path) {
    const parts = [];
    if (path.class) parts.push(path.class);
    if (path.subject) parts.push(path.subject);
    if (path.topic) parts.push(path.topic);
    if (path.subtopic) parts.push(path.subtopic);
    return parts.join(' > ');
}

function restoreFromHistory(item) {
    state.selectedClass = item.path.class;
    state.selectedSubject = item.path.subject;
    state.selectedTopic = item.path.topic;
    state.selectedSubtopic = item.path.subtopic;

    if (item.path.subtopic) navigateToContent(item.path.subtopic);
    else if (item.path.topic) navigateToSubtopics(item.path.topic);
    else if (item.path.subject) navigateToTopics(item.path.subject);
    else navigateToSubjects(item.path.class);
}

// Navigation Functions
function navigateToClasses() {
    state.view = 'classes';
    state.selectedClass = null;
    state.selectedSubject = null;
    state.selectedTopic = null;
    state.selectedSubtopic = null;
    render();
}

function navigateToSubjects(className) {
    state.view = 'subjects';
    state.selectedClass = className;
    state.selectedSubject = null;
    state.selectedTopic = null;
    state.selectedSubtopic = null;
    state.currentPath = { class: className };
    render();
    fetchSubjects(className);
}

function navigateToTopics(subjectName) {
    state.view = 'topics';
    state.selectedSubject = subjectName;
    state.selectedTopic = null;
    state.selectedSubtopic = null;
    state.currentPath.subject = subjectName;
    render();
    fetchTopics(state.selectedClass, subjectName);
}

function navigateToSubtopics(topicName) {
    state.view = 'subtopics';
    state.selectedTopic = topicName;
    state.selectedSubtopic = null;
    state.currentPath.topic = topicName;
    render();
    fetchSubtopics(state.selectedClass, state.selectedSubject, topicName);
}

function navigateToContent(subtopicName) {
    state.view = 'content';
    state.selectedSubtopic = subtopicName;
    state.currentPath.subtopic = subtopicName;
    render();
    fetchContent(state.selectedClass, state.selectedSubject, state.selectedTopic, subtopicName);
}

// Rendering Logic
function render() {
    renderNav();
    viewContainer.innerHTML = '';

    if (state.view === 'classes') {
        renderGrid('Select Your Class', classes, navigateToSubjects);
    }
}

function renderNav() {
    navContainer.innerHTML = '';
    const breadcrumbs = [
        { name: 'Home', action: navigateToClasses }
    ];

    if (state.selectedClass) breadcrumbs.push({ name: state.selectedClass, action: () => navigateToSubjects(state.selectedClass) });
    if (state.selectedSubject) breadcrumbs.push({ name: state.selectedSubject, action: () => navigateToTopics(state.selectedSubject) });
    if (state.selectedTopic) breadcrumbs.push({ name: state.selectedTopic, action: () => navigateToSubtopics(state.selectedTopic) });
    if (state.selectedSubtopic) breadcrumbs.push({ name: state.selectedSubtopic, action: null });

    breadcrumbs.forEach((crumb, index) => {
        if (index > 0) {
            const sep = document.createElement('span');
            sep.className = 'nav-separator';
            sep.textContent = '/';
            navContainer.appendChild(sep);
        }
        const item = document.createElement('span');
        item.className = 'nav-item';
        item.textContent = crumb.name;
        if (crumb.action && index < breadcrumbs.length - 1) {
            item.onclick = crumb.action;
        } else {
            item.style.cursor = 'default';
            item.style.color = 'var(--text-primary)';
        }
        navContainer.appendChild(item);
    });
}

function renderGrid(title, items, onClick, refreshAction) {
    state.currentItems = items;
    state.currentOnClick = onClick;

    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.justifyContent = 'space-between';
    headerRow.style.alignItems = 'center';
    headerRow.style.marginBottom = '2rem';

    const titleEl = document.createElement('h1');
    titleEl.className = 'view-title';
    titleEl.style.margin = '0';
    titleEl.textContent = title;
    headerRow.appendChild(titleEl);

    if (refreshAction) {
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'icon-btn';
        refreshBtn.title = 'Refresh content';
        refreshBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>';
        refreshBtn.onclick = refreshAction;
        headerRow.appendChild(refreshBtn);
    }

    viewContainer.appendChild(headerRow);

    const grid = document.createElement('div');
    grid.className = 'tile-grid';
    grid.id = 'items-grid';

    renderTiles(items, onClick, grid);

    viewContainer.appendChild(grid);
}

function renderTiles(items, onClick, container) {
    container.innerHTML = '';
    items.forEach(item => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.innerHTML = `
            <div class="tile-name">${item}</div>
        `;
        tile.onclick = () => {
            globalSearch.value = ''; // Clear search on navigation
            onClick(item);
        };
        container.appendChild(tile);
    });
}

function renderContent(title, content) {
    viewContainer.innerHTML = '';

    const titleEl = document.createElement('h1');
    titleEl.className = 'view-title';
    titleEl.textContent = title;
    viewContainer.appendChild(titleEl);

    const card = document.createElement('div');
    card.className = 'content-card';

    // Print Button
    const printBtn = document.createElement('button');
    printBtn.className = 'print-btn';
    printBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        PDF
    `;
    printBtn.onclick = () => window.print();
    card.appendChild(printBtn);

    // Refresh Button (Content)
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'refresh-btn';
    refreshBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
        Refresh
    `;
    refreshBtn.onclick = () => fetchContent(state.selectedClass, state.selectedSubject, state.selectedTopic, state.selectedSubtopic, true);
    card.appendChild(refreshBtn);

    const bodyContainer = document.createElement('div');
    bodyContainer.className = 'content-body';
    bodyContainer.id = 'rendered-content';
    bodyContainer.innerHTML = marked.parse(content);
    card.appendChild(bodyContainer);

    viewContainer.appendChild(card);

    // Render LaTeX using KaTeX auto-render
    if (window.renderMathInElement) {
        renderMathInElement(document.getElementById('rendered-content'), {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false },
                { left: '\\[', right: '\\]', display: true }
            ],
            throwOnError: false
        });
    }
}

// Gemini API Integration
async function callGemini(prompt, cacheKey = null, forceRefresh = false) {
    if (cacheKey && !forceRefresh && state.cache[cacheKey]) {
        return state.cache[cacheKey];
    }

    if (!state.apiKey) {
        alert('Please set your Gemini API token in Settings first.');
        settingsModal.classList.remove('hidden');
        return null;
    }

    loadingOverlay.classList.remove('hidden');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${state.model}:generateContent?key=${state.apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        loadingOverlay.classList.add('hidden');

        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const result = data.candidates[0].content.parts[0].text;
            if (cacheKey) {
                state.cache[cacheKey] = result;
                sessionStorage.setItem('content_cache', JSON.stringify(state.cache));
            }
            return result;
        } else {
            console.error('API Error:', data);
            alert('Error from Gemini API. Check console.');
            return null;
        }
    } catch (error) {
        loadingOverlay.classList.add('hidden');
        console.error('Fetch Error:', error);
        alert('Failed to connect to Gemini API.');
        return null;
    }
}

async function fetchSubjects(className, forceRefresh = false) {
    const cacheKey = `subjects_${className}`;
    const prompt = `Generate a list of subjects for ${className}. Respond with just the subject names, one per line. No bullets, no numbers.`;
    const response = await callGemini(prompt, cacheKey, forceRefresh);
    if (response) {
        const items = response.split('\n').map(s => s.trim()).filter(s => s);
        renderGrid(`Subjects for ${className}`, items, navigateToTopics, () => fetchSubjects(className, true));
    }
}

async function fetchTopics(className, subject, forceRefresh = false) {
    const cacheKey = `topics_${className}_${subject}`;
    const prompt = `Generate a list of main topics for the subject "${subject}" in ${className}. One per line, no bullets.`;
    const response = await callGemini(prompt, cacheKey, forceRefresh);
    if (response) {
        const items = response.split('\n').map(s => s.trim()).filter(s => s);
        renderGrid(`${subject} Topics`, items, navigateToSubtopics, () => fetchTopics(className, subject, true));
    }
}

async function fetchSubtopics(className, subject, topic, forceRefresh = false) {
    const cacheKey = `subtopics_${className}_${subject}_${topic}`;
    const prompt = `Break down the topic "${topic}" into subtopics for ${className} ${subject}. One per line, no bullets.`;
    const response = await callGemini(prompt, cacheKey, forceRefresh);
    if (response) {
        const items = response.split('\n').map(s => s.trim()).filter(s => s);
        renderGrid(`${topic} Details`, items, navigateToContent, () => fetchSubtopics(className, subject, topic, true));
    }
}

async function fetchContent(className, subject, topic, subtopic, forceRefresh = false) {
    const cacheKey = `content_${className}_${subject}_${topic}_${subtopic}`;
    const prompt = `Create detailed and engaging learning material for ${className} students. 
    Subject: ${subject}
    Topic: ${topic}
    Subtopic: ${subtopic}
    Include explanations, examples, and key points. Use markdown-like structure.`;
    const response = await callGemini(prompt, cacheKey, forceRefresh);
    if (response) {
        addToHistory(`${subtopic}`, { class: className, subject, topic, subtopic });
        renderContent(subtopic, response);
    }
}

// Settings Handlers
settingsBtn.onclick = () => settingsModal.classList.remove('hidden');
closeSettings.onclick = () => settingsModal.classList.add('hidden');

saveSettingsBtn.onclick = () => {
    state.apiKey = apiTokenInput.value.trim();
    state.model = modelSelect.value;

    sessionStorage.setItem('gemini_api_key', state.apiKey);
    sessionStorage.setItem('gemini_model', state.model);

    settingsFeedback.textContent = 'Settings saved for this session!';
    setTimeout(() => {
        settingsFeedback.textContent = '';
        settingsModal.classList.add('hidden');
    }, 1500);
};

// History Handlers
historyBtn.onclick = () => {
    renderHistory();
    historyModal.classList.remove('hidden');
};
closeHistory.onclick = () => historyModal.classList.add('hidden');

// Theme and Palette Handlers
function applyTheme(theme) {
    state.theme = theme;
    document.body.classList.toggle('light-mode', theme === 'light');
    sunIcon.classList.toggle('hidden', theme === 'light');
    moonIcon.classList.toggle('hidden', theme === 'dark');
    sessionStorage.setItem('theme', theme);
}

function applyAccent(color) {
    state.accentColor = color;
    document.documentElement.style.setProperty('--accent-color', color);

    // Convert hex to rgb for glow
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);

    sessionStorage.setItem('accent_color', color);

    // Update swatches UI
    swatches.forEach(s => {
        s.classList.toggle('active', s.dataset.color === color);
    });
}

themeToggle.onclick = () => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
};

swatches.forEach(swatch => {
    swatch.onclick = () => {
        applyAccent(swatch.dataset.color);
    };
});

// Search Handler
globalSearch.oninput = (e) => {
    const query = e.target.value.toLowerCase().trim();
    const grid = document.getElementById('items-grid');
    if (!grid) return;

    const filtered = state.currentItems.filter(item =>
        item.toLowerCase().includes(query)
    );
    renderTiles(filtered, state.currentOnClick, grid);
};

// Start App
init();
