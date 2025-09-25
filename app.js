// ===== Pediatrics Calculator - Main Application =====
// Version: 2.1.0 - Optimized with reduced animations

(function () {
  'use strict';

  // ===== Constants & Configuration =====
  const CONFIG = {
    version: '2.1.0',
    storageKey: 'pedCalc_v2',
    defaults: {
      ageMonths: 12,
      weight: 10,
      ivType: 'NS',
      deficitPercent: 0,
      deficitHours: 24,
      viewMode: 'grid',
      roundingMode: 'nearest',
      theme: 'light',
      fontSize: 'medium',
      autoSave: true,
      showWarnings: true
    },
    // Reduced animation durations
    animation: {
      quick: 50,
      normal: 100,
      slow: 200
    }
  };

  // ===== Drug Database =====
  const DRUGS = [
    { id: 'amox',     name: 'Amoxicillin',      strength: '250mg/5ml',     times: 3, color: '#FFE0E6', grid: [1.5,2,2.5,3,4,4,5,5] },
    { id: 'augm',     name: 'Augmentin',        strength: '400/57mg/5ml',  times: 2, color: '#E6F7FF', grid: [1,1.5,2,2.5,3,3.5,4,4.5] },
    { id: 'cotr',     name: 'Cotrimoxazole',    strength: '200/40mg/5ml',  times: 2, minMonths: 2, color: '#FFF0E6', grid: [2.5,4,5,6,7.5,10,10,12.5] },
    { id: 'para120',  name: 'Paracetamol',      strength: '120mg/5ml',     times: 4, color: '#E6FFE6', grid: [2.5,4,5,6,6,8,10,10] },
    { id: 'para240',  name: 'Paracetamol HD',   strength: '240mg/5ml',     times: 4, color: '#E6FFE6', grid: [1.5,2,3,3,4,5,5,6] },
    { id: 'ibu',      name: 'Ibuprofen',        strength: '100mg/5ml',     times: 3, color: '#FFE6F0', grid: [1.5,2.5,2.5,4,4,5,5,7] },
    { id: 'cpm',      name: 'CPM',              strength: '2mg/5ml',       times: 3, minMonths: 6, color: '#F0E6FF', grid: [1.5,2.5,3,4,4.5,5.5,6,7.5] },
    { id: 'salb',     name: 'Salbutamol',       strength: '2mg/5ml',       times: 3, color: '#E6EFFF', grid: [1.5,2.5,2.5,4,4,5,5,5] },
    { id: 'cefix',    name: 'Cefixime',         strength: '100mg/5ml',     times: 2, color: '#FFE6E6', grid: [1,2,2.5,3,4,4.5,5,6] },
    { id: 'eryth',    name: 'Erythromycin',     strength: '125mg/5ml',     times: 4, color: '#FFEBE6', grid: [2.5,4,5,6.5,7.5,9,10,12.5] },
    { id: 'domp',     name: 'Domperidone',      strength: '5mg/5ml',       times: 3, color: '#E6FFF5', grid: [1.5,2,2.5,3,3,4,5,5] },
    { id: 'dicl',     name: 'Dicloxacillin',    strength: '62.5mg/5ml',    times: 4, color: '#FFF5E6', grid: [2.5,4,5,6,7.5,8,10,12.5] },
    { id: 'hyos',     name: 'Hyoscine',         strength: '5mg/5ml',       times: 3, color: '#FFE6EB', grid: [2.5,5,5,7.5,7.5,10,10,10] },
    { id: 'simeth',   name: 'Simethicone',      strength: '40mg/0.6ml',    times: 4, color: '#E6F5FF', ageBased: true },
    { id: 'ambrox',   name: 'Ambroxol',         strength: '30mg/5ml',      times: 3, color: '#F0E6FF', ageBased: true },
    { id: 'clar',     name: 'Clarithromycin',   strength: '125mg/5ml',     times: 2, color: '#FFE6F7', grid: [2,3,4,5,6,7,8,10] },
    { id: 'pred',     name: 'Prednisolone',     strength: '5mg/5ml',       times: 1, color: '#FFF0F5', grid: [5,8,10,13,15,18,20,25] },
    { id: 'fer',      name: 'Ferrous Sulfate',  strength: '15mg/0.6ml',    times: 2, color: '#F5E6D3', grid: [0.6,1,1.2,1.5,1.8,2,2.4,3] }
  ];

  const WEIGHT_POINTS = [5, 8, 10, 13, 15, 18, 20, 25];

  // ===== Main Application Class =====
  class PedCalc {
    constructor() {
      this.state = { ...CONFIG.defaults };
      this.els = {};
      this.timers = {};
      this.init();
    }

    // === Initialization ===
    init() {
      this.cacheDOMElements();
      this.loadState();
      this.bindEvents();
      this.updateAll();
      this.initKeyboardShortcuts();
      this.setupIOSFixes();
      console.log(`PedCalc v${CONFIG.version} initialized`);
    }

    setupIOSFixes() {
      // Prevent double-tap zoom on iOS
      let lastTouchEnd = 0;
      document.addEventListener('touchend', function (event) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      }, false);

      // Fix viewport on iOS
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
        viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
      }
    }

    cacheDOMElements() {
      const get = id => document.getElementById(id);

      this.els = {
        // Inputs
        ageMonths: get('ageMonths'),
        ageYears: get('ageYears'),
        weight: get('weight'),
        weightSlider: get('weightSlider'),
        ivType: get('ivType'),
        deficitSlider: get('deficitSlider'),
        deficitValue: get('deficitValue'),
        deficitHours: get('deficitHours'),

        // Results
        maintRate: get('maintRate'),
        deficitRate: get('deficitRate'),
        totalRate: get('totalRate'),

        // Drug container
        drugContainer: get('drugContainer'),

        // Status
        statusWeight: get('statusWeight'),
        statusAge: get('statusAge'),
        roundingStatus: get('roundingStatus'),

        // Controls
        fontSizeBtn: get('fontSizeBtn'),
        themeToggle: get('themeToggle'),
        settingsBtn: get('settingsBtn'),
        copyBtn: get('copyBtn'),
        exportBtn: get('exportBtn'),
        printBtn: get('printBtn'),

        // Modal
        settingsModal: get('settingsModal'),
        closeSettings: get('closeSettings'),
        roundingSelect: get('roundingSelect'),
        autoSave: get('autoSave'),
        showWarnings: get('showWarnings'),
        clearDataBtn: get('clearDataBtn'),

        // Toast
        toast: get('toast')
      };

      this.quickBtns = document.querySelectorAll('.quick-btn');
      this.viewBtns = document.querySelectorAll('.toggle-btn');
    }

    bindEvents() {
      const on = (el, event, handler) => {
        if (el) el.addEventListener(event, handler.bind(this));
      };

      // Patient inputs with reduced debounce
      on(this.els.ageMonths, 'input', this.debounce(this.handleAgeChange, 150));
      on(this.els.weight, 'input', this.debounce(this.handleWeightInput, 150));
      on(this.els.weightSlider, 'input', this.handleWeightSlider);

      // IV inputs
      on(this.els.ivType, 'change', this.handleIVChange);
      on(this.els.deficitSlider, 'input', this.handleDeficitChange);
      on(this.els.deficitHours, 'input', this.debounce(this.handleDeficitHours, 150));

      // Quick buttons
      this.quickBtns.forEach(btn => {
        on(btn, 'click', () => this.quickSelect(btn));
      });

      // View toggle
      this.viewBtns.forEach(btn => {
        on(btn, 'click', () => this.toggleView(btn));
      });

      // Controls
      on(this.els.fontSizeBtn, 'click', this.cycleFontSize);
      on(this.els.themeToggle, 'click', this.toggleTheme);
      on(this.els.settingsBtn, 'click', this.showSettings);
      on(this.els.closeSettings, 'click', this.hideSettings);

      // Actions
      on(this.els.copyBtn, 'click', this.copyData);
      on(this.els.exportBtn, 'click', this.exportData);
      on(this.els.printBtn, 'click', this.printData);

      // Settings
      on(this.els.roundingSelect, 'change', this.handleRoundingChange);
      on(this.els.autoSave, 'change', this.handleAutoSaveChange);
      on(this.els.showWarnings, 'change', this.handleWarningsChange);
      on(this.els.clearDataBtn, 'click', this.clearData);

      // Modal backdrop click
      on(this.els.settingsModal, 'click', (e) => {
        if (e.target === this.els.settingsModal) this.hideSettings();
      });

      // Save on tab hide
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.saveState();
      });

      // iOS specific: prevent zoom on double tap
      document.addEventListener('gesturestart', function (e) {
        e.preventDefault();
      });
    }

    initKeyboardShortcuts() {
      document.addEventListener('keydown', (e) => {
        const ctrl = e.ctrlKey || e.metaKey;

        if (ctrl) {
          switch(e.key) {
            case 's':
              e.preventDefault();
              this.exportData();
              break;
            case 'p':
              e.preventDefault();
              this.printData();
              break;
            case 'c':
              if (!window.getSelection().toString()) {
                e.preventDefault();
                this.copyData();
              }
              break;
            case 'd':
              e.preventDefault();
              this.toggleTheme();
              break;
          }
        } else if (e.key === 'Escape') {
          this.hideSettings();
        }
      });
    }

    // === State Management ===
    loadState() {
      try {
        const saved = localStorage.getItem(CONFIG.storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.version === CONFIG.version) {
            this.state = { ...this.state, ...parsed };
          }
        }
      } catch (e) {
        console.error('Failed to load state:', e);
      }
      this.applyState();
    }

    saveState() {
      if (!this.state.autoSave) return;
      try {
        const toSave = { ...this.state, version: CONFIG.version };
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(toSave));
      } catch (e) {
        console.error('Failed to save state:', e);
      }
    }

    applyState() {
      // Apply input values
      this.els.ageMonths.value = this.state.ageMonths;
      this.els.weight.value = this.state.weight;
      this.els.weightSlider.value = this.state.weight;
      this.els.ivType.value = this.state.ivType;
      this.els.deficitSlider.value = this.state.deficitPercent;
      this.els.deficitHours.value = this.state.deficitHours;
      this.els.roundingSelect.value = this.state.roundingMode;
      this.els.autoSave.checked = this.state.autoSave;
      this.els.showWarnings.checked = this.state.showWarnings;

      // Apply theme and size
      document.documentElement.setAttribute('data-theme', this.state.theme);
      document.documentElement.setAttribute('data-font-size', this.state.fontSize);
      if (this.els.themeToggle) {
        this.els.themeToggle.textContent = this.state.theme === 'dark' ? '☀️' : '🌙';
      }

      // Apply view mode
      this.viewBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === this.state.viewMode);
      });
    }

    // === Event Handlers ===
    handleAgeChange() {
      this.state.ageMonths = Math.max(0, parseInt(this.els.ageMonths.value) || 0);
      this.els.ageMonths.value = this.state.ageMonths;
      this.updateAge();
      this.updateDrugs();
      this.saveState();
    }

    handleWeightInput() {
      const weight = parseFloat(this.els.weight.value) || 0;
      this.state.weight = Math.max(2, Math.min(60, weight));
      this.els.weight.value = this.state.weight;
      this.els.weightSlider.value = this.state.weight;
      this.updateAll();
      this.saveState();
    }

    handleWeightSlider() {
      this.state.weight = parseFloat(this.els.weightSlider.value);
      this.els.weight.value = this.state.weight;
      this.updateAll();
      this.saveState();
    }

    handleIVChange() {
      this.state.ivType = this.els.ivType.value;
      this.saveState();
    }

    handleDeficitChange() {
      this.state.deficitPercent = parseFloat(this.els.deficitSlider.value);
      this.els.deficitValue.textContent = `${this.state.deficitPercent}%`;
      this.updateIV();
      this.saveState();
    }

    handleDeficitHours() {
      this.state.deficitHours = Math.max(1, parseInt(this.els.deficitHours.value) || 24);
      this.els.deficitHours.value = this.state.deficitHours;
      this.updateIV();
      this.saveState();
    }

    handleRoundingChange() {
      this.state.roundingMode = this.els.roundingSelect.value;
      this.els.roundingStatus.textContent =
        this.state.roundingMode === 'nearest' ? 'ปัดใกล้สุด' : 'คำนวณก้ำกึ่ง';
      this.updateDrugs();
      this.saveState();
    }

    handleAutoSaveChange() {
      this.state.autoSave = this.els.autoSave.checked;
      if (this.state.autoSave) {
        this.saveState();
        this.toast('✅ บันทึกอัตโนมัติเปิด');
      } else {
        this.toast('⚠️ บันทึกอัตโนมัติปิด');
      }
    }

    handleWarningsChange() {
      this.state.showWarnings = this.els.showWarnings.checked;
      this.updateDrugs();
      this.saveState();
    }

    quickSelect(btn) {
      const weight = parseFloat(btn.dataset.weight);
      const age = parseInt(btn.dataset.age);

      this.state.weight = weight;
      this.state.ageMonths = age;

      this.els.weight.value = weight;
      this.els.weightSlider.value = weight;
      this.els.ageMonths.value = age;

      // Quick visual feedback
      btn.style.transform = 'scale(0.95)';
      setTimeout(() => btn.style.transform = '', CONFIG.animation.quick);

      this.updateAll();
      this.saveState();
      this.toast(`✅ ${btn.textContent}`);
    }

    toggleView(btn) {
      this.viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.state.viewMode = btn.dataset.view;
      this.updateDrugs();
      this.saveState();
    }

    // === UI Controls ===
    toggleTheme() {
      this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', this.state.theme);
      if (this.els.themeToggle) {
        this.els.themeToggle.textContent = this.state.theme === 'dark' ? '☀️' : '🌙';
      }
      this.saveState();
      this.toast(this.state.theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode');
    }

    cycleFontSize() {
      const sizes = ['small', 'medium', 'large'];
      const current = sizes.indexOf(this.state.fontSize);
      this.state.fontSize = sizes[(current + 1) % sizes.length];
      document.documentElement.setAttribute('data-font-size', this.state.fontSize);
      this.saveState();

      const labels = { small: 'เล็ก', medium: 'ปกติ', large: 'ใหญ่' };
      this.toast(`📏 ขนาด: ${labels[this.state.fontSize]}`);
    }

    showSettings() {
      if (this.els.settingsModal) this.els.settingsModal.classList.add('show');
    }

    hideSettings() {
      if (this.els.settingsModal) this.els.settingsModal.classList.remove('show');
    }

    // === Calculations ===
    calculateIV() {
      const kg = this.state.weight;

      // Holliday-Segar daily volume (mL/day)
      let dailyML = 0;
      if (kg <= 10) {
        dailyML = kg * 100;
      } else if (kg <= 20) {
        dailyML = 1000 + (kg - 10) * 50;
      } else {
        dailyML = 1500 + (kg - 20) * 20;
      }

      const maintenance = dailyML / 24;

      // Deficit calculation
      const deficitTotal = (this.state.deficitPercent / 100) * kg * 1000;
      const deficitHourly = this.state.deficitHours > 0 ? deficitTotal / this.state.deficitHours : 0;

      return {
        maintenance: maintenance,
        deficit: deficitHourly,
        total: maintenance + deficitHourly
      };
    }

    calculateDose(drug, weight, ageMonths) {
      // Check age restriction
      if (drug.minMonths && ageMonths < drug.minMonths) {
        return { dose: 0, warning: `> ${drug.minMonths} เดือน`, restricted: true };
      }

      // Age-based dosing
      if (drug.ageBased) {
        const years = ageMonths / 12;
        let dose = 0;

        if (drug.id === 'simeth') {
          dose = years < 2 ? 0.3 : years < 12 ? 0.6 : 1.2;
        } else if (drug.id === 'ambrox') {
          dose = years < 2 ? 1.25 : years <= 10 ? 2.5 : 5;
        }

        return { dose };
      }

      // Weight-based grid dosing
      if (!drug.grid) return { dose: 0 };

      let dose = 0;

      if (this.state.roundingMode === 'nearest') {
        // Find nearest weight point
        let minDiff = Infinity;
        let nearestIdx = 0;

        WEIGHT_POINTS.forEach((point, idx) => {
          const diff = Math.abs(weight - point);
          if (diff < minDiff) {
            minDiff = diff;
            nearestIdx = idx;
          }
        });

        dose = drug.grid[nearestIdx] || 0;
      } else {
        // Interpolate between points
        if (weight <= WEIGHT_POINTS[0]) {
          dose = drug.grid[0];
        } else if (weight >= WEIGHT_POINTS[WEIGHT_POINTS.length - 1]) {
          dose = drug.grid[drug.grid.length - 1];
        } else {
          for (let i = 0; i < WEIGHT_POINTS.length - 1; i++) {
            if (weight >= WEIGHT_POINTS[i] && weight <= WEIGHT_POINTS[i + 1]) {
              const w1 = WEIGHT_POINTS[i];
              const w2 = WEIGHT_POINTS[i + 1];
              const d1 = drug.grid[i];
              const d2 = drug.grid[i + 1];
              const ratio = (weight - w1) / (w2 - w1);
              dose = d1 + (d2 - d1) * ratio;
              // Round to nearest 0.5
              dose = Math.round(dose * 2) / 2;
              break;
            }
          }
        }
      }

      return { dose };
    }

    // === Update Functions ===
    updateAll() {
      this.updateAge();
      this.updateIV();
      this.updateDrugs();
      this.updateStatus();
    }

    updateAge() {
      const months = this.state.ageMonths;
      const years = Math.floor(months / 12);
      const rem = months % 12;

      let text = '';
      if (years > 0) {
        text = `${years} ปี`;
        if (rem > 0) text += ` ${rem} ด`;
      } else if (months > 0) {
        text = `${months} เดือน`;
      } else {
        text = 'แรกเกิด';
      }

      if (this.els.ageYears) this.els.ageYears.textContent = `= ${text}`;
      if (this.els.statusAge) this.els.statusAge.textContent = text;
    }

    updateIV() {
      const iv = this.calculateIV();

      this.animateValue(this.els.maintRate, iv.maintenance.toFixed(1));
      this.animateValue(this.els.deficitRate, iv.deficit.toFixed(1));
      this.animateValue(this.els.totalRate, iv.total.toFixed(1));
    }

    updateDrugs() {
      const container = this.els.drugContainer;
      container.className = `drug-container ${this.state.viewMode}-view`;

      // Use requestAnimationFrame for smooth rendering
      requestAnimationFrame(() => {
        const fragment = document.createDocumentFragment();

        DRUGS.forEach((drug, idx) => {
          const result = this.calculateDose(drug, this.state.weight, this.state.ageMonths);
          const el = this.createDrugElement(drug, result, idx);
          fragment.appendChild(el);
        });

        container.innerHTML = '';
        container.appendChild(fragment);
      });
    }

    updateStatus() {
      if (this.els.statusWeight) this.els.statusWeight.textContent = `${this.state.weight} kg`;
      if (this.els.roundingStatus) {
        this.els.roundingStatus.textContent =
          this.state.roundingMode === 'nearest' ? 'ปัดใกล้สุด' : 'คำนวณก้ำกึ่ง';
      }
    }

    createDrugElement(drug, result, index) {
      const div = document.createElement('div');
      div.className = 'drug-item';

      if (result.restricted) {
        div.style.opacity = '0.5';
      }

      if (drug.color && this.state.viewMode === 'grid') {
        div.style.background = `linear-gradient(135deg, ${drug.color}, var(--bg))`;
      }

      // Removed animation delay for faster rendering

      const freq = drug.times ? `${drug.times}x/วัน` : 'PRN';
      const dose = (result.dose ?? 0).toFixed(1);

      if (this.state.viewMode === 'grid') {
        div.innerHTML = `
          <div class="drug-name" title="${drug.name}">${drug.name}</div>
          <div class="drug-info">${drug.strength}</div>
          <div class="drug-dose-display">
            <span class="dose-number">${dose}</span>
            <span class="dose-unit">ml</span>
          </div>
          <div class="drug-frequency">${freq}</div>
          ${result.warning && this.state.showWarnings ?
            `<div class="drug-warning">⚠️ ${result.warning}</div>` : ''}
        `;
      } else {
        div.innerHTML = `
          <div class="drug-details">
            <div class="drug-name">${drug.name}</div>
            <div class="drug-info">${drug.strength}</div>
            ${result.warning && this.state.showWarnings ?
              `<div class="drug-warning">⚠️ ${result.warning}</div>` : ''}
          </div>
          <div class="drug-frequency">${freq}</div>
          <div class="drug-dose-display">
            <span class="dose-number">${dose}</span>
            <span class="dose-unit">ml</span>
          </div>
        `;
      }

      // Click to copy single drug dose
      div.addEventListener('click', () => {
        if (!result.restricted) {
          const text = `${drug.name}: ${dose} ml (${freq})`;
          this.copyText(text);
          this.toast(`📋 ${drug.name}`);
        }
      });

      return div;
    }

    // === Data Operations ===
    copyData() {
      const text = this.generateSummary();
      this.copyText(text);
      this.toast('📋 คัดลอกแล้ว');
    }

    copyText(text) {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).catch(err => {
          console.error('Copy failed:', err);
          this.fallbackCopy(text);
        });
      } else {
        this.fallbackCopy(text);
      }
    }

    fallbackCopy(text) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Fallback copy failed:', err);
      }
      document.body.removeChild(textarea);
    }

    exportData() {
      const text = this.generateFullReport();
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pediatrics_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.toast('💾 บันทึกแล้ว');
    }

    printData() {
      window.print();
      this.toast('🖨️ กำลังพิมพ์...');
    }

    clearData() {
      if (confirm('⚠️ ล้างข้อมูลทั้งหมด?\\n\\nไม่สามารถย้อนกลับได้')) {
        localStorage.removeItem(CONFIG.storageKey);
        this.state = { ...CONFIG.defaults };
        this.applyState();
        this.updateAll();
        this.hideSettings();
        this.toast('🗑️ ล้างข้อมูลแล้ว');
      }
    }

    generateSummary() {
      const iv = this.calculateIV();
      const age = this.els.statusAge ? this.els.statusAge.textContent : '';
      const timestamp = new Date().toLocaleString('th-TH');

      let text = `📊 Pediatrics Calculator\\n`;
      text += `วันที่: ${timestamp}\\n\\n`;

      text += `👶 ผู้ป่วย\\n`;
      text += `อายุ: ${age}\\n`;
      text += `น้ำหนัก: ${this.state.weight} kg\\n\\n`;

      text += `💧 IV Fluid (${this.els.ivType.value})\\n`;
      text += `Maintenance: ${iv.maintenance.toFixed(1)} mL/hr\\n`;

      if (this.state.deficitPercent > 0) {
        text += `Deficit ${this.state.deficitPercent}%: ${iv.deficit.toFixed(1)} mL/hr\\n`;
      }

      text += `Total: ${iv.total.toFixed(1)} mL/hr\\n\\n`;

      text += `💊 ขนาดยา (ml/ครั้ง)\\n`;
      text += `วิธีปัด: ${this.els.roundingStatus ? this.els.roundingStatus.textContent : ''}\\n`;
      text += `─────────────────\\n`;

      DRUGS.forEach(drug => {
        const result = this.calculateDose(drug, this.state.weight, this.state.ageMonths);
        if (!result.restricted) {
          const freq = drug.times ? `${drug.times}x/วัน` : 'PRN';
          text += `${drug.name}: ${result.dose.toFixed(1)} ml (${freq})\\n`;
        }
      });

      return text;
    }

    generateFullReport() {
      const iv = this.calculateIV();
      const age = this.els.statusAge ? this.els.statusAge.textContent : '';
      const timestamp = new Date().toLocaleString('th-TH');

      let report = `════════════════════════════════\\n`;
      report += `    PEDIATRICS CALCULATOR\\n`;
      report += `    Version ${CONFIG.version}\\n`;
      report += `════════════════════════════════\\n\\n`;

      report += `📅 ${timestamp}\\n\\n`;

      report += `PATIENT DATA\\n`;
      report += `────────────\\n`;
      report += `Age: ${this.state.ageMonths} months (${age})\\n`;
      report += `Weight: ${this.state.weight} kg\\n\\n`;

      report += `IV FLUID CALCULATION\\n`;
      report += `────────────────────\\n`;
      report += `Type: ${this.els.ivType.value}\\n`;
      report += `Maintenance: ${iv.maintenance.toFixed(1)} mL/hr\\n`;

      if (this.state.deficitPercent > 0) {
        const deficitTotal = (this.state.deficitPercent / 100) * this.state.weight * 1000;
        report += `\\nDeficit Correction (${this.state.deficitPercent}%):\\n`;
        report += `• Total: ${deficitTotal.toFixed(0)} mL\\n`;
        report += `• Time: ${this.state.deficitHours} hours\\n`;
        report += `• Rate: ${iv.deficit.toFixed(1)} mL/hr\\n`;
      }

      report += `\\n⭐ Total Rate: ${iv.total.toFixed(1)} mL/hr\\n\\n`;

      report += `DRUG DOSING\\n`;
      report += `───────────\\n`;
      report += `Method: ${this.state.roundingMode === 'nearest' ? 'Nearest' : 'Interpolated'}\\n\\n`;

      let drugNum = 0;
      DRUGS.forEach(drug => {
        const result = this.calculateDose(drug, this.state.weight, this.state.ageMonths);
        drugNum++;

        report += `${drugNum}. ${drug.name} (${drug.strength})\\n`;

        if (result.restricted) {
          report += `   ⚠️ Age > ${drug.minMonths} months required\\n`;
        } else {
          const freq = drug.times ? `${drug.times}x/day` : 'PRN';
          report += `   Dose: ${result.dose.toFixed(1)} ml\\n`;
          report += `   Freq: ${freq}\\n`;
          if (drug.times) {
            const daily = result.dose * drug.times;
            report += `   Daily: ${daily.toFixed(1)} ml\\n`;
          }
        }
        report += '\\n';
      });

      report += `════════════════════════════════\\n`;
      report += `⚠️ For reference only\\n`;
      report += `Always verify with guidelines\\n`;
      report += `════════════════════════════════\\n`;

      return report;
    }

    // === Utilities ===
    animateValue(element, newValue) {
      if (!element) return;
      const oldValue = element.textContent;
      if (oldValue !== newValue) {
        element.classList.add('updating');
        element.textContent = newValue;
        setTimeout(() => {
          element.classList.remove('updating');
        }, CONFIG.animation.normal);
      }
    }

    toast(message, duration = 1500) {
      clearTimeout(this.timers.toast);
      if (!this.els.toast) return;
      this.els.toast.textContent = message;
      this.els.toast.classList.add('show');
      this.timers.toast = setTimeout(() => {
        this.els.toast.classList.remove('show');
      }, duration);
    }

    debounce(func, wait) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    }
  }

  // === Initialize Application ===
  function initApp() {
    // Basic feature check
    if (!window.localStorage || !document.querySelector) {
      alert('Browser not supported. Please update your browser.');
      return;
    }

    // Initialize calculator
    window.pedCalc = new PedCalc();

    // Handle online/offline status
    window.addEventListener('online', () => {
      if (window.pedCalc) window.pedCalc.toast('✅ Online');
    });

    window.addEventListener('offline', () => {
      if (window.pedCalc) window.pedCalc.toast('⚠️ Offline');
    });

    // Prevent accidental navigation when autosave is off
    window.addEventListener('beforeunload', (e) => {
      if (window.pedCalc && !window.pedCalc.state.autoSave) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  // Public API
  window.PedCalcAPI = {
    version: CONFIG.version,
    drugs: DRUGS,
    weights: WEIGHT_POINTS,
    getInstance: () => window.pedCalc
  };

})();
