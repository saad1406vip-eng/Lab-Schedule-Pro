// ==========================================
// البيانات الأساسية
// ==========================================
let sections = JSON.parse(localStorage.getItem('labSections')) || [
    "CHEM & REC", "CHEM & VIRO", "B/B & HEMA", "MICRO & PARA"
];

let employees = JSON.parse(localStorage.getItem('labEmployees')) || [
    { id: 1, name: "SAAD ALI", job: "0123105", section: "CHEM & REC", role: "excluded" },
    { id: 2, name: "BADER MOHD", job: "7670327", section: "CHEM & REC", role: "excluded" },
    { id: 3, name: "MOHD DHAKIL", job: "0123124", section: "CHEM & VIRO", role: "tech" },
    { id: 4, name: "HOSSAM SAEED", job: "66540", section: "CHEM & VIRO", role: "tech" },
    { id: 5, name: "MANSOUR MOHD", job: "7670350", section: "CHEM & VIRO", role: "tech" },
    { id: 6, name: "MOHD SAHLAN", job: "7221400", section: "CHEM & VIRO", role: "tech" },
    { id: 7, name: "MISFER AYED", job: "7219250", section: "CHEM & VIRO", role: "tech" },
    { id: 8, name: "MOHD NASSER", job: "7221389", section: "CHEM & VIRO", role: "tech" },
    { id: 9, name: "DR. HATIM", job: "7245417", section: "B/B & HEMA", role: "excluded" },
    { id: 10, name: "FAHAD ABDULLAH", job: "46139", section: "B/B & HEMA", role: "tech" },
    { id: 11, name: "MOHD SAAD", job: "0124959", section: "B/B & HEMA", role: "tech" },
    { id: 12, name: "MOHD SALEH", job: "62526", section: "B/B & HEMA", role: "tech" },
    { id: 13, name: "SAAD EID", job: "7707014", section: "B/B & HEMA", role: "tech" },
    { id: 14, name: "SULTAN MOHD", job: "0123074", section: "B/B & HEMA", role: "tech" },
    { id: 15, name: "NAIF ABDULLAH", job: "7241475", section: "B/B & HEMA", role: "tech" },
    { id: 16, name: "ABDULAZIZ RASHID", job: "7669825", section: "MICRO & PARA", role: "tech" },
    { id: 17, name: "MOHD KHALAF", job: "65269", section: "MICRO & PARA", role: "tech" },
    { id: 18, name: "NAIF MOHD", job: "7670368", section: "MICRO & PARA", role: "tech" }
];

// خصائص الموظفين (تُطبَّق مرة واحدة على من لا يملكها)
const FLAG_DEFAULTS = {
    "MOHD DHAKIL":      { dutyMode: 'weekend', deputyRank: 1, pairKey: 'khalaf-dhakil', weekendLast: true },
    "ABDULAZIZ RASHID": { dutyMode: 'weekend', deputyRank: 1 },
    "MOHD KHALAF":      { dutyMode: 'weekend', needsPartner: true, pairKey: 'khalaf-dhakil', weekendLast: true },
    "MOHD SAAD":        { pairKey: 'bb-expert', deputyRank: 1 },
    "FAHAD ABDULLAH":   { pairKey: 'bb-expert', deputyRank: 2 }
};
function migrateEmployees() {
    employees.forEach(e => {
        if (e.dutyMode === undefined) {
            Object.assign(e, { dutyMode: 'all', needsPartner: false, pairKey: '', deputyRank: 0, weekendLast: false }, FLAG_DEFAULTS[e.name] || {});
        }
    });
    localStorage.setItem('labEmployees', JSON.stringify(employees));
}
migrateEmployees();

let employeeOrder = JSON.parse(localStorage.getItem('employeeOrder')) || {};
let ramadanDates = JSON.parse(localStorage.getItem('ramadanDates')) || [
    { hijri: '1448', start: '2027-02-08', end: '2027-03-09' }
];
let officialHolidays = JSON.parse(localStorage.getItem('officialHolidays')) || [];

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// ==========================================
// الإعدادات
// ==========================================
const MIN_REST_HOURS = 9;       // أقل فاصل بين شفتين
const MAX_RUN = 5;              // أقصى أيام عمل متتالية
const FIRST_VALIDATED_IDX = 2026 * 12 + 10;   // نوفمبر 2026 (أكتوبر معتمد مسبقاً)
const WEEKEND_COUNT_FROM_IDX = 2026 * 12 + 9;  // عدّاد الويكند في التقرير (للاطلاع فقط)
const SHIFT_TIME = {            // [بداية, نهاية] بالساعات (النهاية بعد 24 = اليوم التالي)
    M: [7.5, 16], E: [15.5, 23.5], N: [23.5, 31.5],
    R1: [10, 16], R2: [16, 22], R3: [22, 28], R4: [4, 10]
};
const SEL_IDS = ['lightTech1Select', 'lightTech2Select', 'nightTech1Select', 'nightTech2Select', 'weekendMorning1Select', 'weekendMorning2Select'];

// ==========================================
// الروتيشن الرسمي (مأخوذ حرفياً من ملف «الروتيشن 2026-2027»)
// الأسماء يجب أن تطابق أسماء الموظفين في التطبيق (الحروف الكبيرة والصغيرة غير مهمة)
// في كل زوج: الاسم الأول والثاني بالترتيب الذي يحدد أيام الراحة:
//   مسائي/ليلي: الأول راحته الجمعة والسبت، والثاني الأحد والاثنين
//   صباح الويكند: الأول راحته الأربعاء والخميس، والثاني الأحد والاثنين
// الدورة 12 شهراً تبدأ أكتوبر 2026 ثم تعود من أكتوبر 2027 وهكذا
// ==========================================
const ROTATION_START_IDX = 2026 * 12 + 9;
const ROTATION_TABLE = [
    /* 10 أكتوبر  */ { E: ["MISFER AYED", "SULTAN MOHD"],    N: ["MOHD NASSER", "NAIF ABDULLAH"], W: ["MOHD SALEH", "NAIF MOHD"] },
    /* 11 نوفمبر  */ { E: ["HOSSAM SAEED", "MOHD SAHLAN"],   N: ["MANSOUR MOHD", "FAHAD ABDULLAH"], W: ["SAAD EID", "MOHD KHALAF"] },
    /* 12 ديسمبر  */ { E: ["MOHD SALEH", "SAAD EID"],        N: ["MOHD SAAD", "NAIF MOHD"],       W: ["MANSOUR MOHD", "HOSSAM SAEED"] },
    /* 1  يناير   */ { E: ["MOHD NASSER", "SULTAN MOHD"],    N: ["MISFER AYED", "NAIF ABDULLAH"], W: ["MOHD SAHLAN", "FAHAD ABDULLAH"] },
    /* 2  فبراير  */ { E: ["HOSSAM SAEED", "MOHD SAHLAN"],   N: ["MANSOUR MOHD", "FAHAD ABDULLAH"], W: ["MISFER AYED", "NAIF ABDULLAH"] },
    /* 3  مارس    */ { E: ["MOHD SAAD", "MOHD SALEH"],       N: ["NAIF MOHD", "SAAD EID"],        W: ["SULTAN MOHD", "MOHD NASSER"] },
    /* 4  أبريل   */ { E: ["SULTAN MOHD", "NAIF ABDULLAH"],  N: ["MISFER AYED", "MOHD NASSER"],   W: ["NAIF MOHD", "MOHD SALEH"] },
    /* 5  مايو    */ { E: ["MANSOUR MOHD", "HOSSAM SAEED"],  N: ["FAHAD ABDULLAH", "MOHD SAHLAN"], W: ["SAAD EID", "MOHD KHALAF"] },
    /* 6  يونيو   */ { E: ["MOHD SALEH", "MOHD SAAD"],       N: ["SAAD EID", "NAIF MOHD"],        W: ["MANSOUR MOHD", "HOSSAM SAEED"] },
    /* 7  يوليو   */ { E: ["SULTAN MOHD", "NAIF ABDULLAH"],  N: ["MISFER AYED", "MOHD NASSER"],   W: ["FAHAD ABDULLAH", "MOHD SAHLAN"] },
    /* 8  أغسطس   */ { E: ["HOSSAM SAEED", "MOHD SAHLAN"],   N: ["MANSOUR MOHD", "FAHAD ABDULLAH"], W: ["MISFER AYED", "NAIF ABDULLAH"] },
    /* 9  سبتمبر  */ { E: ["MOHD SAAD", "NAIF MOHD"],        N: ["MOHD SALEH", "SAAD EID"],       W: ["SULTAN MOHD", "MOHD NASSER"] }
];

// جداول مثبّتة حرفياً من الملف (أشهر رمضان وما عدّلته بنفسك): تُعرض كما هي بدل الحساب
// المفتاح اسم الموظف، والقيمة رموز الأيام بالترتيب
const FIXED_GRIDS = {
    "2027-02": {
        "SAAD ALI": "M M M M O O M R1 R1 R1 R1 O O R1 R1 R1 R1 R1 O O R1 R1 R1 R1 R1 O O R1",
        "BADER MOHD": "M M M M O O M R1 R1 R1 R1 O O R1 R1 R1 R1 R1 O O R1 R1 R1 R1 R1 O O R1",
        "MOHD DHAKIL": "M M M M O O M R1 R1 R1 R1 O O R1 R1 R1 R1 R1 O O R1 R1 R1 R1 R1 O O R1",
        "HOSSAM SAEED": "E E E E O O E R3 R3 R3 R3 O O R3 R3 R3 R3 R3 O O R3 R3 R3 R3 R3 O O R3",
        "MANSOUR MOHD": "N N N N O O N R4 R4 R4 R4 O O R4 R4 R4 R4 R4 O O R4 R4 R4 R4 R4 O O R4",
        "MOHD SAHLAN": "O E E E E E O O R3 R3 R3 R3 R3 O O R3 R3 R3 R3 R3 O O R3 R3 R3 R3 R3 O",
        "MISFER AYED": "M M O O M M M R1 R1 O O R1 R1 R1 R1 R1 O O R1 R1 R1 R1 R1 O O R1 R1 R1",
        "MOHD NASSER": "M M M M O O M R2 R2 R2 R2 O O R2 R2 R2 R2 R2 O O R2 R2 R2 R2 R2 O O R2",
        "DR. HATIM": "M M M M O O M R1 R1 R1 R1 O O R1 R1 R1 R1 R1 O O R1 R1 R1 R1 R1 O O R1",
        "FAHAD ABDULLAH": "O N N N N N O O R4 R4 R4 R4 R4 O O R4 R4 R4 R4 R4 O O R4 R4 R4 R4 R4 O",
        "MOHD SAAD": "M M M M O O M R2 R2 R2 R2 O O R2 R2 R2 R2 R2 O O R2 R2 R2 R2 R2 O O R2",
        "MOHD SALEH": "M M M M O O M R2 R2 O O R2 R2 R2 R2 R2 R2 R2 O O R2 R2 R2 R2 R2 O O R2",
        "SAAD EID": "M M M M O O M R2 R2 R2 R2 O O R2 R2 R2 O O R2 R2 R2 R2 R2 R2 R2 O O R2",
        "SULTAN MOHD": "M M M M O O M R2 R2 R2 R2 O O R2 R2 R2 R2 R2 O O R2 R2 R2 O O R2 R2 R2",
        "NAIF ABDULLAH": "O M M M M M O O R1 R1 R1 R1 R1 O O R1 R1 R1 R1 R1 O O R1 R1 R1 R1 R1 O",
        "ABDULAZIZ RASHID": "M M M M O O M R1 R1 R1 R1 O O R1 R1 R1 R1 R1 O O R1 R1 R1 R1 R1 O O R1",
        "MOHD KHALAF": "M M M M O O M R2 R2 R2 R2 O O R2 R2 R2 R2 R2 O O R2 R2 R2 R2 R2 O O R2",
        "NAIF MOHD": "M M M M O O M R2 R2 R2 R2 O O R2 R2 R2 R2 R2 O O R2 R2 R2 R2 R2 O O R2"
    },
    "2027-03": {
        "SAAD ALI": "R1 R1 R1 R1 O O R1 R1 M M M O O M M M M M O O M M M M M O O M M M M",
        "BADER MOHD": "R1 R1 R1 R1 O O R1 R1 M M M O O M M M M M O O M M M M M O O M M M M",
        "MOHD DHAKIL": "R1 R1 R1 R1 O O R1 R1 M M M O O M M M M M O O M M M M M O O M M M M",
        "HOSSAM SAEED": "R2 R2 O O R2 R2 R2 R2 M M M O O M M M M M O O M M M M M O O M M M M",
        "MANSOUR MOHD": "R2 R2 R2 R2 O O R2 R2 M M M O O M M M M M O O M M M M M O O M M M M",
        "MOHD SAHLAN": "R2 R2 R2 R2 O O R2 R2 M M M O O M M M M M O O M M M M M O O M M M M",
        "MISFER AYED": "R2 R2 R2 R2 O O R2 R2 M M M O O M M M M M O O M M M M M O O M M M M",
        "MOHD NASSER": "O R1 R1 R1 R1 R1 O O M M M M M O O M M M M M O O M M M M M O O M M",
        "DR. HATIM": "R1 R1 R1 R1 O O R1 R1 M M M O O M M M M M O O M M M M M O O M M M M",
        "FAHAD ABDULLAH": "R2 R2 R2 R2 O O R2 R2 M M M O O M M M M M O O M M M M M O O M M M M",
        "MOHD SAAD": "R3 R3 R3 R3 O O R3 R3 E E E O O E E E E E O O E E E E E O O E E E E",
        "MOHD SALEH": "O R3 R3 R3 R3 R3 O O E E E E E O O E E E E E O O E E E E E O O E E",
        "SAAD EID": "O R4 R4 R4 R4 R4 O O N N N N N O O N N N N N O O N N N N N O O N N",
        "SULTAN MOHD": "R1 R1 O O R1 R1 R1 R1 M O O M M M M M O O M M M M M O O M M M M M O",
        "NAIF ABDULLAH": "R2 R2 R2 R2 O O R2 R2 M M M O O M M M M M O O M M M M M O O M M M M",
        "ABDULAZIZ RASHID": "R1 R1 R1 R1 O O R1 R1 M M M O O M M M M M O O M M M M M O O M M M M",
        "MOHD KHALAF": "R2 R2 R2 R2 O O R2 R2 M M M O O M M M M M O O M M M M M O O M M M M",
        "NAIF MOHD": "R4 R4 R4 R4 O O R4 R4 N N N O O N N N N N O O N N N N N O O N N N N"
    }
};

function empIdByName(name) {
    const n = String(name).trim().toLowerCase();
    const e = employees.find(x => String(x.name).trim().toLowerCase() === n);
    return e ? e.id : null;
}

// أسماء شهر معيّن حسب جدول الدورة (12 شهراً)
function rotationNames(y, m) {
    const idx = y * 12 + m;
    const p = (((idx - ROTATION_START_IDX) % 12) + 12) % 12;
    const t = ROTATION_TABLE[p];
    return { E: t.E.slice(), N: t.N.slice(), W: t.W.slice() };
}

// تشكيلة الشهر + الأسماء غير الموجودة بين الموظفين
function rotationRoster(y, m) {
    const nm = rotationNames(y, m);
    const conv = arr => arr.map(empIdByName);
    const missing = nm.E.concat(nm.N, nm.W).filter(n => empIdByName(n) === null);
    return { roster: { E: conv(nm.E), N: conv(nm.N), W: conv(nm.W) }, missing };
}

// ==========================================
// سجل الروتيشن (المرجع الدائم للأشهر)
// ==========================================
function monthKey(y, m) { return y + '-' + String(m + 1).padStart(2, '0'); }
function keyToIdx(k) { const [y, m] = k.split('-').map(Number); return y * 12 + (m - 1); }
function idxToKey(i) { return monthKey(Math.floor(i / 12), i % 12); }

let rotLog = JSON.parse(localStorage.getItem('labHistory'));
let draftKeys = new Set();      // أشهر مقترحة لم تُعتمد بعد (لا تُحفظ)
if (!rotLog) seedHistory();

// أكتوبر 2026 من الجدول الرسمي؛ بقية الأشهر تُبنى منه عند الحاجة
function seedHistory() {
    rotLog = { "2026-10": rotationRoster(2026, 9).roster };
    saveHistory();
}
function saveHistory() {
    const out = {};
    Object.keys(rotLog).forEach(k => { if (!draftKeys.has(k)) out[k] = rotLog[k]; });
    localStorage.setItem('labHistory', JSON.stringify(out));
}
function commitThrough(idx) {
    [...draftKeys].forEach(k => { if (keyToIdx(k) <= idx) draftKeys.delete(k); });
    saveHistory();
}
function purgeDraftsAfter(idx) {
    [...draftKeys].forEach(k => { if (keyToIdx(k) > idx) { delete rotLog[k]; draftKeys.delete(k); } });
}
function dropDrafts() {
    [...draftKeys].forEach(k => delete rotLog[k]);
    draftKeys.clear();
}
function repickFrom(idx) {
    Object.keys(rotLog).forEach(k => { if (keyToIdx(k) >= idx) { delete rotLog[k]; draftKeys.delete(k); } });
    saveHistory();
}

// تحديث لمرة واحدة: إعادة بناء كل الأشهر من جدول الملف الرسمي
function migrateV6() {
    if (localStorage.getItem('labMigV6')) return;
    rotLog = {};
    draftKeys.clear();
    seedHistory();
    localStorage.setItem('labMigV6', '1');
}
migrateV6();

function sortedEmployees() {
    return [...employees].sort((a, b) => (employeeOrder[a.id] || 999) - (employeeOrder[b.id] || 999));
}

// ==========================================
// عدّادات (للاطلاع في التقرير وللموظف الجديد)
// ==========================================
function computeStats(limitIdx, wFrom) {
    if (wFrom === undefined) wFrom = WEEKEND_COUNT_FROM_IDX;
    const st = {};
    employees.forEach(e => {
        const b = e.base || {};
        st[e.id] = { E: b.E || 0, N: b.N || 0, W: b.W || 0, w0: 0, last: -999, lastEN: -999 };
    });
    Object.keys(rotLog).sort().forEach(k => {
        const i = keyToIdx(k);
        if (i >= limitIdx) return;
        ['E', 'N', 'W'].forEach(t => (rotLog[k][t] || []).forEach((id, pos) => {
            const s = st[id];
            if (!s) return;
            if (t === 'W') {
                if (i >= wFrom) { s.W++; if (pos === 0) s.w0++; }
            } else {
                s[t]++;
                if (i > s.lastEN) s.lastEN = i;
            }
            if (i > s.last) s.last = i;
        }));
    });
    return st;
}

// يبني الأشهر الناقصة من الجدول الرسمي حتى الشهر المطلوب
function ensureHistory(y, m) {
    const keys = Object.keys(rotLog).sort();
    if (!keys.length) return;
    const last = keyToIdx(keys[keys.length - 1]);
    const target = y * 12 + m;
    for (let i = last + 1; i <= target; i++) {
        const rp = rotationRoster(Math.floor(i / 12), i % 12);
        if (rp.missing.length) break;
        const k = idxToKey(i);
        rotLog[k] = rp.roster;
        draftKeys.add(k);
    }
}

function rosterIsValid(r) {
    const ok = id => employees.some(e => e.id === id && e.role === 'tech');
    return !!r && ['E', 'N', 'W'].every(t => (r[t] || []).length === 2 && r[t].every(ok));
}

// ==========================================
// التحميل الأولي
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // إزالة صندوق «تعريف سريع بالأزرار» والشريط السفلي المكرر (Generate / PDF) من الواجهة
    document.querySelectorAll('.help-box, .bottom-bar').forEach(el => el.remove());
    const appEl = document.querySelector('.app');
    if (appEl) appEl.style.paddingBottom = '24px';
    populateMonthSelect();
    renderSections();
    renderEmployeeList();
    renderOrderList();
    populateShiftSelectors();
    updateButtonsForRamadan();
    onMonthChange();
});

function populateMonthSelect() {
    const select = document.getElementById('monthSelect');
    select.innerHTML = '';
    monthNames.forEach((m, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = m;
        select.appendChild(opt);
    });
    select.value = new Date().getMonth();
    document.getElementById('yearInput').value = new Date().getFullYear();
}

function readYM() {
    return {
        year: parseInt(document.getElementById('yearInput').value),
        month: parseInt(document.getElementById('monthSelect').value)
    };
}

function onMonthChange() {
    const { year, month } = readYM();
    if (isNaN(year) || isNaN(month)) return;
    ensureHistory(year, month);
    fillSelectorsFromHistory(monthKey(year, month));
}

document.addEventListener('change', (e) => {
    if (e.target.id === 'monthSelect' || e.target.id === 'yearInput') {
        updateButtonsForRamadan();
        onMonthChange();
    }
});

// ==========================================
// الأقسام
// ==========================================
function renderSections() {
    const list = document.getElementById('sectionList');
    list.innerHTML = '';
    sections.forEach((sec, index) => {
        const li = document.createElement('li');
        li.innerHTML = `${sec} <button onclick="removeSection(${index})">X</button>`;
        list.appendChild(li);
    });
    const select = document.getElementById('empSection');
    select.innerHTML = '';
    sections.forEach(sec => {
        const opt = document.createElement('option');
        opt.value = sec;
        opt.textContent = sec;
        select.appendChild(opt);
    });
}

function addSection() {
    const name = document.getElementById('newSectionName').value.trim();
    if (!name) return alert('Enter section name');
    if (sections.includes(name)) return alert('Section already exists');
    sections.push(name);
    saveSections();
    renderSections();
    document.getElementById('newSectionName').value = '';
}

function removeSection(index) {
    if (confirm('Are you sure?')) {
        sections.splice(index, 1);
        saveSections();
        renderSections();
    }
}

function saveSections() {
    localStorage.setItem('labSections', JSON.stringify(sections));
}

// ==========================================
// الموظفون
// ==========================================
function renderEmployeeList() {
    const list = document.getElementById('employeeList');
    list.innerHTML = '';
    employees.forEach(emp => {
        const li = document.createElement('li');
        const flags = emp.role === 'tech' ? `
            <select title="نوع المناوبات" onchange="setEmpField(${emp.id},'dutyMode',this.value)">
                <option value="all" ${emp.dutyMode === 'all' ? 'selected' : ''}>All duties</option>
                <option value="weekend" ${emp.dutyMode === 'weekend' ? 'selected' : ''}>Weekend only</option>
                <option value="none" ${emp.dutyMode === 'none' ? 'selected' : ''}>No duties</option>
            </select>
            <label title="لا يعمل الويكند وحده"><input type="checkbox" ${emp.needsPartner ? 'checked' : ''}
                onchange="setEmpField(${emp.id},'needsPartner',this.checked)">partner</label>
            <input type="text" placeholder="pair" title="مفتاح الازدواج: من يتشاركون نفس المفتاح لا يُكلَّفون في شهر واحد"
                value="${emp.pairKey || ''}" onchange="setEmpField(${emp.id},'pairKey',this.value.trim())">
            <input type="number" min="0" max="9" title="رتبة نائب القسم في رمضان (0 = لا)"
                value="${emp.deputyRank || 0}" onchange="setEmpField(${emp.id},'deputyRank',parseInt(this.value)||0)">
            <label title="دوره في صباح الويكند يأتي بعد الجميع"><input type="checkbox" ${emp.weekendLast ? 'checked' : ''}
                onchange="setEmpField(${emp.id},'weekendLast',this.checked)">last</label>
        ` : '';
        li.innerHTML = `<b>${emp.name}</b> (${emp.role === 'excluded' ? 'Admin' : 'Tech'}) ${flags}
            <button onclick="removeEmployee(${emp.id})">X</button>`;
        list.appendChild(li);
    });
}

function setEmpField(id, field, val) {
    const e = employees.find(x => x.id === id);
    if (!e) return;
    e[field] = val;
    saveEmployees();
    dropDrafts();
    onMonthChange();
}

function addEmployee() {
    const name = document.getElementById('empName').value.trim();
    const job = document.getElementById('empJob').value.trim();
    const section = document.getElementById('empSection').value;
    const role = document.getElementById('empRole').value;
    if (!name || !job) return alert('Please enter Name and Job Number');
    const lastEl = document.getElementById('empLast');
    const emp = {
        id: Date.now(), name, job, section, role,
        dutyMode: document.getElementById('empDuty').value,
        needsPartner: document.getElementById('empPartner').checked,
        pairKey: document.getElementById('empPair').value.trim(),
        deputyRank: parseInt(document.getElementById('empDeputy').value) || 0,
        weekendLast: lastEl ? lastEl.checked : false
    };
    if (role === 'tech') {
        const st = computeStats(1e9);
        const tt = employees.filter(e => e.role === 'tech');
        const ta = tt.filter(e => e.dutyMode === 'all');
        const mn = (arr, f) => arr.length ? Math.min(...arr.map(f)) : 0;
        emp.base = { E: mn(ta, e => st[e.id].E), N: mn(ta, e => st[e.id].N), W: mn(tt, e => st[e.id].W) };
    }
    employees.push(emp);
    saveEmployees();
    dropDrafts();
    renderEmployeeList();
    renderOrderList();
    populateShiftSelectors();
    onMonthChange();
    ['empName', 'empJob', 'empPair', 'empDeputy'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('empPartner').checked = false;
    if (lastEl) lastEl.checked = false;
    document.getElementById('empDuty').value = 'all';
}

function removeEmployee(id) {
    if (confirm('Remove this employee? (اطبع/صدّر الأشهر السابقة قبل الحذف)')) {
        employees = employees.filter(e => e.id !== id);
        delete employeeOrder[id];
        saveEmployees();
        saveOrder();
        dropDrafts();
        renderEmployeeList();
        renderOrderList();
        populateShiftSelectors();
        onMonthChange();
    }
}

function saveEmployees() {
    localStorage.setItem('labEmployees', JSON.stringify(employees));
}

function renderOrderList() {
    const container = document.getElementById('orderList');
    if (!container) return;
    container.innerHTML = '';
    sortedEmployees().forEach((emp, index) => {
        const div = document.createElement('div');
        div.className = 'order-item';
        const currentOrder = employeeOrder[emp.id] || (index + 1);
        div.innerHTML = `
            <label>${emp.name}</label>
            <input type="number" min="1" max="99" value="${currentOrder}"
                   onchange="updateOrder(${emp.id}, this.value)">
        `;
        container.appendChild(div);
    });
}

function updateOrder(empId, value) {
    const num = parseInt(value);
    if (isNaN(num) || num < 1) return;
    employeeOrder[empId] = num;
    saveOrder();
}

function saveOrder() {
    localStorage.setItem('employeeOrder', JSON.stringify(employeeOrder));
}

function applyOrder() {
    employees = sortedEmployees();
    saveEmployees();
    renderOrderList();
    alert('تم تطبيق الترتيب بنجاح');
}

function populateShiftSelectors() {
    const techs = employees.filter(e => e.role === 'tech');
    SEL_IDS.forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        const currentVal = sel.value;
        sel.innerHTML = '<option value="">-- Select --</option>';
        techs.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = `${t.name} (${t.section})`;
            sel.appendChild(opt);
        });
        if (currentVal) sel.value = currentVal;
    });
}

function readSelectors() {
    return SEL_IDS.map(id => {
        const v = document.getElementById(id).value;
        return v === '' ? null : Number(v);
    });
}

function fillSelectorsFromHistory(key) {
    const r = rotLog[key];
    const vals = r ? [r.E[0], r.E[1], r.N[0], r.N[1], r.W[0], r.W[1]] : [null, null, null, null, null, null];
    SEL_IDS.forEach((id, i) => {
        const s = document.getElementById(id);
        if (s) s.value = vals[i] == null ? '' : String(vals[i]);
    });
}

// ==========================================
// رمضان والإجازات
// ==========================================
function openRamadanDialog() {
    document.getElementById('ramadanDialog').style.display = 'flex';
    renderSavedRamadanList();
}
function closeRamadanDialog() {
    document.getElementById('ramadanDialog').style.display = 'none';
}
function saveRamadanDates() {
    const hijri = document.getElementById('ramadanHijri').value.trim();
    const start = document.getElementById('ramadanStart').value;
    const end = document.getElementById('ramadanEnd').value;
    if (!start || !end) { alert('الرجاء إدخال تاريخ البداية والنهاية'); return; }
    if (new Date(start) > new Date(end)) { alert('تاريخ البداية يجب أن يكون قبل النهاية'); return; }
    ramadanDates.push({ hijri, start, end });
    localStorage.setItem('ramadanDates', JSON.stringify(ramadanDates));
    document.getElementById('ramadanHijri').value = '';
    document.getElementById('ramadanStart').value = '';
    document.getElementById('ramadanEnd').value = '';
    renderSavedRamadanList();
    updateButtonsForRamadan();
    alert('✅ تم حفظ رمضان ' + (hijri || ''));
}
function renderSavedRamadanList() {
    const list = document.getElementById('savedRamadanList');
    if (!list) return;
    list.innerHTML = '<h4>الفترات المحفوظة:</h4>';
    if (ramadanDates.length === 0) {
        list.innerHTML += '<p style="color:#999;">لا يوجد رمضان محفوظ</p>';
        return;
    }
    ramadanDates.forEach((r, i) => {
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `<span>${r.hijri || ''} — ${r.start} → ${r.end}</span>
                         <button onclick="deleteRamadan(${i})">X</button>`;
        list.appendChild(div);
    });
}
function deleteRamadan(index) {
    if (!confirm('حذف هذه الفترة؟')) return;
    ramadanDates.splice(index, 1);
    localStorage.setItem('ramadanDates', JSON.stringify(ramadanDates));
    renderSavedRamadanList();
    updateButtonsForRamadan();
}
function isRamadanDay(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    for (let r of ramadanDates) {
        const [sy, sm, sd] = r.start.split('-').map(Number);
        const [ey, em, ed] = r.end.split('-').map(Number);
        if (d >= new Date(sy, sm - 1, sd) && d <= new Date(ey, em - 1, ed)) return true;
    }
    return false;
}
function isOfficialHoliday(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    for (let h of officialHolidays) {
        const [hy, hm, hd] = h.split('-').map(Number);
        if (d.getTime() === new Date(hy, hm - 1, hd).getTime()) return true;
    }
    return false;
}
function isSpecialDay(date) {
    return isRamadanDay(date) && !isOfficialHoliday(date);
}
function monthHasRamadan(month, year) {
    const dim = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= dim; d++) if (isSpecialDay(new Date(year, month, d))) return true;
    return false;
}
function updateButtonsForRamadan() {
    const { year, month } = readYM();
    const rotBtn = document.getElementById('rotationBtn');
    if (!rotBtn) return;
    if (monthHasRamadan(month, year)) {
        rotBtn.textContent = '🌙 تطبيق نظام رمضان';
        rotBtn.classList.add('btn-ramadan-add');
        rotBtn.classList.remove('btn-rotation');
    } else {
        rotBtn.textContent = 'تطبيق نظام الروتيشن';
        rotBtn.classList.add('btn-rotation');
        rotBtn.classList.remove('btn-ramadan-add');
    }
}

// ==========================================
// محرك الجدول
// ==========================================
function startOfWeekSunday(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - x.getDay());
    return x;
}

// تشكيلة أي يوم = تشكيلة شهره هو (يبدأ التبديل يوم 1 وينتهي بنهاية الشهر)
function rosterKeyForDate(d) {
    const k = monthKey(d.getFullYear(), d.getMonth());
    return rotLog[k] ? k : null;
}

function roleOf(roster, id) {
    if (!roster) return null;
    for (const t of ['E', 'N', 'W']) {
        const i = (roster[t] || []).indexOf(id);
        if (i >= 0) return { t, i };
    }
    return null;
}

// dow: 0=الأحد ... 6=السبت
function baseCode(duty, dow) {
    if (!duty) return (dow === 5 || dow === 6) ? 'O' : 'M';
    const { t, i } = duty;
    if (t === 'W') {
        const off = i === 0 ? [3, 4] : [0, 1];      // الأول راحته أربعاء/خميس، الثاني أحد/اثنين
        return off.includes(dow) ? 'O' : 'M';
    }
    const off = i === 0 ? [5, 6] : [0, 1];          // الأول جمعة/سبت، الثاني أحد/اثنين
    return off.includes(dow) ? 'O' : t;
}

function gapHours(prev, cur) {
    const p = SHIFT_TIME[prev], c = SHIFT_TIME[cur];
    if (!p || !c) return 99;
    return 24 + c[0] - p[1];
}

// تصحيح تلقائي: لا أكثر من 5 أيام ولا فاصل أقل من الحد (على الأيام المرنة فقط)
function legalize(codes, flex) {
    let run = 0, off = 0;
    for (let i = 0; i < codes.length; i++) {
        if (codes[i] === 'O') { off++; if (off >= 2) run = 0; continue; }
        let mustOff = false;
        if (flex[i]) {
            if (run >= MAX_RUN) mustOff = true;
            else if (i > 0 && codes[i - 1] !== 'O' && gapHours(codes[i - 1], codes[i]) < MIN_REST_HOURS) mustOff = true;
        }
        if (mustOff) { codes[i] = 'O'; off++; if (off >= 2) run = 0; continue; }
        run++; off = 0;
    }
}

function firstRunViolation(codes) {
    let run = 0, off = 0;
    for (let i = 0; i < codes.length; i++) {
        if (codes[i] === 'O') { off++; if (off >= 2) run = 0; continue; }
        if (run >= MAX_RUN) return i;
        run++; off = 0;
    }
    return -1;
}

// يتخفف من يوم مناوبة فقط إذا كان زميله يغطي نفس الشفت في اليوم نفسه
function legalizeRow(row, rows) {
    for (let g = 0; g < 40; g++) {
        legalize(row.codes, row.flex);
        const v = firstRunViolation(row.codes);
        if (v < 0) return;
        const c = row.codes[v];
        if (rows.filter(x => x.codes[v] === c).length >= 2) { row.codes[v] = 'O'; row.flex[v] = true; }
        else return;
    }
}

function ramadanWeekInfo(sunday, roster) {
    const en = new Set(roster ? [...(roster.E || []), ...(roster.N || [])] : []);
    const w = new Set(roster ? (roster.W || []) : []);
    const techs = employees.filter(e => e.role === 'tech');
    const r1 = new Set();
    employees.forEach(e => { if (e.role === 'excluded') r1.add(e.id); });
    w.forEach(id => r1.add(id));
    techs.forEach(e => { if (e.needsPartner && !en.has(e.id)) r1.add(e.id); });
    sections.forEach(sec => {
        const c = techs.filter(e => e.section === sec && !en.has(e.id) && (e.deputyRank || 0) > 0)
            .sort((a, b) => a.deputyRank - b.deputyRank);
        if (c.length) r1.add(c[0].id);
    });
    const pool = sortedEmployees().filter(e => e.role === 'tech' && !en.has(e.id) && !r1.has(e.id));
    const wk = Math.floor(Date.UTC(sunday.getFullYear(), sunday.getMonth(), sunday.getDate()) / 604800000);
    const worker = pool.length ? pool[wk % pool.length].id : null;
    return { r1, pool: new Set(pool.map(e => e.id)), worker };
}

// كل شهر مستقل: يبدأ يوم 1 وينتهي آخر يوم، بلا أثر من الشهر السابق
function buildMatrix(year, month) {
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let d = new Date(year, month, 1); d <= lastDay; d.setDate(d.getDate() + 1)) days.push(new Date(d));
    const startIdx = 0;
    const rows = sortedEmployees().map(emp => ({ emp, codes: [], flex: [] }));
    const tail = new Set();
    const weekCache = {};

    days.forEach((day, i) => {
        const dow = day.getDay();
        const rkey = rosterKeyForDate(day);
        const roster = rkey ? rotLog[rkey] : null;
        const special = isSpecialDay(day);
        let wi = null;
        if (special) {
            const sun = startOfWeekSunday(day);
            const ck = sun.getTime() + '|' + rkey;
            wi = weekCache[ck] || (weekCache[ck] = ramadanWeekInfo(sun, roster));
        }
        rows.forEach(r => {
            const emp = r.emp;
            const duty = roleOf(roster, emp.id);
            let code = baseCode(duty, dow);
            let flex = !(duty && code !== 'O');
            if (special && code !== 'O') {
                if (code === 'E') code = 'R3';
                else if (code === 'N') code = 'R4';
                else code = wi.r1.has(emp.id) ? 'R1' : 'R2';
            }
            if (special && !duty && wi.pool.has(emp.id)) {
                if (wi.worker === emp.id) {
                    if (dow === 3 || dow === 4) code = 'O';
                    else { code = 'R2'; flex = !(dow === 5 || dow === 6); }
                } else {
                    code = (dow === 5 || dow === 6) ? 'O' : 'R2';
                }
            }
            // أول يوم رمضان: ليلي الأمس ينتهي 7:30 فيتداخل مع R4 (4 فجراً)
            if (special && i > 0 && code === 'R4' && r.codes[i - 1] === 'N' && !isSpecialDay(days[i - 1])) {
                code = 'O';
                tail.add(i);
            }
            r.codes.push(code);
            r.flex.push(flex);
        });
    });

    // قسم بلا R1 في يوم عمل: أحد فريق R2 من نفس القسم يتحول إلى R1
    days.forEach((day, i) => {
        if (!isSpecialDay(day) || day.getDay() > 4) return;
        const wk = Math.floor(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) / 604800000);
        sections.forEach((sec, si) => {
            const mem = rows.filter(r => r.emp.section === sec);
            if (!mem.length || mem.some(r => r.codes[i] === 'R1')) return;
            const c = mem.filter(r => r.codes[i] === 'R2');
            if (c.length) c[(wk + si) % c.length].codes[i] = 'R1';
        });
    });

    rows.forEach(r => legalizeRow(r, rows));

    // جداول مثبّتة حرفياً من الملف الرسمي (فبراير ومارس 2027): تُعرض كما هي
    const fx = FIXED_GRIDS[monthKey(year, month)];
    let fixed = false;
    if (fx) {
        const map = {};
        Object.keys(fx).forEach(n => { map[n.trim().toLowerCase()] = fx[n].split(' '); });
        rows.forEach(r => {
            const a = map[String(r.emp.name).trim().toLowerCase()];
            if (a && a.length === days.length) { r.codes = a.slice(); fixed = true; }
        });
        if (fixed) tail.clear();
    }
    return { days, rows, startIdx, tail, fixed };
}

// ==========================================
// الفحص بعد التوليد
// ==========================================
function runValidation(M, year, month) {
    const box = document.getElementById('validationReport');
    if (!box) return;
    const idx = year * 12 + month;
    if (idx < FIRST_VALIDATED_IDX) {
        box.innerHTML = '';
        return;
    }
    const errs = [], warns = [], infos = [];
    const lab = k => `${M.days[k].getDate()}/${M.days[k].getMonth() + 1}`;
    const r = rotLog[monthKey(year, month)];
    if (!r) {
        const rp = rotationRoster(year, month);
        if (rp.missing.length) {
            errs.push('أسماء من الروتيشن غير موجودة في قائمة الموظفين: ' + [...new Set(rp.missing)].join('، ') +
                ' — أضف الموظف أو صحّح الاسم في ROTATION_TABLE أعلى script.js');
        } else {
            errs.push('لا يوجد روتيشن مسجّل لهذا الشهر');
        }
    } else if (!rosterIsValid(r)) {
        errs.push('تشكيلة الشهر فيها موظف محذوف أو ناقصة — اضغط «Re-pick Month»');
    }
    if (M.fixed) infos.push('هذا الشهر معروض حرفياً كما في ملف الروتيشن الرسمي (FIXED_GRIDS)، وأي ملاحظة أدناه تخص الملف نفسه');

    for (let k = M.startIdx; k < M.days.length; k++) {
        const day = M.days[k], dow = day.getDay(), ram = isSpecialDay(day);
        const cnt = {};
        M.rows.forEach(x => { cnt[x.codes[k]] = (cnt[x.codes[k]] || 0) + 1; });
        (ram ? ['R1', 'R2', 'R3', 'R4'] : ['M', 'E', 'N']).forEach(c => {
            if (!cnt[c] && !(c === 'R4' && M.tail.has(k))) errs.push(`يوم ${lab(k)}: لا يوجد أحد في ${c}`);
        });
        if (dow <= 4) sections.forEach(sec => {
            const mem = M.rows.filter(x => x.emp.section === sec);
            if (mem.length && !mem.some(x => ['M', 'R1', 'R2'].includes(x.codes[k])))
                warns.push(`يوم ${lab(k)}: القسم ${sec} بلا دوام نهاري`);
        });
    }

    M.rows.forEach(x => {
        let run = 0, off = 0, f1 = false, f2 = false;
        x.codes.forEach((c, k) => {
            if (c === 'O') { off++; if (off >= 2) run = 0; return; }
            const inM = k >= M.startIdx;
            if (inM && run >= MAX_RUN && !f1) { errs.push(`${x.emp.name}: أكثر من 5 أيام عمل بدون يومي راحة (يوم ${lab(k)})`); f1 = true; }
            if (inM && !f2 && k > 0 && x.codes[k - 1] !== 'O' && gapHours(x.codes[k - 1], c) < MIN_REST_HOURS) {
                errs.push(`${x.emp.name}: فاصل أقل من ${MIN_REST_HOURS} ساعات قبل يوم ${lab(k)}`); f2 = true;
            }
            run++; off = 0;
        });
    });

    if (M.tail.size) warns.push('أول يوم رمضان: شفت R4 يغطيه ليلي الأمس (يمتد حتى 10:00) لأن شفته ينتهي 7:30');

    // تبديل القروبات يوم 1: من يحتاج راحة شفهية بين آخر يوم في الشهر السابق وأول يوم هنا
    {
        const pm = month === 0 ? 11 : month - 1;
        const py = month === 0 ? year - 1 : year;
        if (rotLog[monthKey(py, pm)]) {
            const P = buildMatrix(py, pm);
            const lastIdx = P.days.length - 1;
            M.rows.forEach(x => {
                const pr = P.rows.find(q => q.emp.id === x.emp.id);
                if (!pr) return;
                const pc = pr.codes[lastIdx], cc = x.codes[M.startIdx];
                if (pc && cc && pc !== 'O' && cc !== 'O' && gapHours(pc, cc) < MIN_REST_HOURS)
                    infos.push(`${x.emp.name}: آخر يوم في الشهر السابق ${pc} ثم أول يوم ${cc}`);
            });
        }
    }

    const list = (arr, cls, title) => arr.length ? `<div class="${cls}"><b>${title} (${arr.length})</b><ul>${
        arr.slice(0, 25).map(e => `<li>${e}</li>`).join('')}</ul>${arr.length > 25 ? '<div>…</div>' : ''}</div>` : '';
    // لا يظهر شيء عند النجاح؛ تظهر الأخطاء والتنبيهات فقط (الملاحظات المعلوماتية مخفية)
    box.innerHTML = (!errs.length && !warns.length)
        ? ''
        : list(errs, 'vr-err', '❌ أخطاء') + list(warns, 'vr-warn', '⚠️ تنبيهات');
}

// ==========================================
// التوليد والعرض
// ==========================================
function applyRotationPlan() {
    const { year, month } = readYM();
    ensureHistory(year, month);
    const key = monthKey(year, month);
    if (!rotLog[key]) alert('هذا الشهر قبل بداية نظام الروتيشن (أكتوبر 2026): سيُولَّد جدول بلا مناوبات.');
    else fillSelectorsFromHistory(key);
    generateSchedule();
}

function repickMonth() {
    const { year, month } = readYM();
    const idx = year * 12 + month;
    const keys = Object.keys(rotLog).sort();
    if (!keys.length || idx <= keyToIdx(keys[0])) {
        alert('لا يمكن إعادة الاختيار لأول شهر مسجّل. غيّر الأسماء يدوياً من القوائم.');
        return;
    }
    if (!confirm('سيُحذف توزيع هذا الشهر وما بعده المحفوظ (المسائي والليلي والويكند) ويُعاد بناؤه من الروتيشن الرسمي. متابعة؟')) return;
    repickFrom(idx);
    ensureHistory(year, month);
    fillSelectorsFromHistory(monthKey(year, month));
    generateSchedule();
}

function generateSchedule() {
    const { year, month } = readYM();
    const idx = year * 12 + month;
    const key = monthKey(year, month);
    ensureHistory(year, month);

    const now = new Date();
    if (rotLog[key] && !rosterIsValid(rotLog[key]) && idx >= now.getFullYear() * 12 + now.getMonth()) {
        repickFrom(idx);
        ensureHistory(year, month);
        fillSelectorsFromHistory(key);
    }

    let sel = readSelectors();
    if (sel.some(v => v === null)) { fillSelectorsFromHistory(key); sel = readSelectors(); }
    if (!sel.some(v => v === null)) {
        if (new Set(sel).size < 6) { alert('يوجد اسم مكرر في اختيارات الشفتات'); return; }
        const r = { E: [sel[0], sel[1]], N: [sel[2], sel[3]], W: [sel[4], sel[5]] };
        if (JSON.stringify(rotLog[key]) !== JSON.stringify(r)) {
            rotLog[key] = r;
            purgeDraftsAfter(idx);
        }
    }
    commitThrough(idx);

    const M = buildMatrix(year, month);
    renderTable(M, year, month);
    updateLegend(year, month);
    runValidation(M, year, month);
}

function renderTable(M, year, month) {
    document.getElementById('printMonthYear').textContent = `${month + 1}-${year}`;
    const head = document.getElementById('daysHeaderRow');
    const body = document.getElementById('scheduleBody');
    head.innerHTML = '';
    body.innerHTML = '';
    for (let k = M.startIdx; k < M.days.length; k++) {
        const date = M.days[k];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        const th = document.createElement('th');
        th.innerHTML = `<div>${date.getDate()}</div><div style="font-size:9px; font-weight:normal;">${dayName}</div>`;
        head.appendChild(th);
    }
    M.rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:right; font-weight:bold;">${r.emp.name}</td>
            <td>${r.emp.job}</td>
            <td>${r.emp.section}</td>`;
        for (let k = M.startIdx; k < M.days.length; k++) {
            const td = document.createElement('td');
            const code = r.codes[k] || 'O';
            td.className = `shift-${code}`;
            td.textContent = code;
            tr.appendChild(td);
        }
        body.appendChild(tr);
    });
}

function updateLegend(year, month) {
    const dim = new Date(year, month + 1, 0).getDate();
    let ram = false, normal = false;
    for (let d = 1; d <= dim; d++) {
        if (isSpecialDay(new Date(year, month, d))) ram = true; else normal = true;
    }
    document.getElementById('ramadanBadge').style.display = ram ? 'block' : 'none';
    document.getElementById('normalCodes').style.display = normal ? 'block' : 'none';
    document.getElementById('ramadanCodes').style.display = ram ? 'block' : 'none';
    document.getElementById('ramOffLine').style.display = normal ? 'none' : 'block';
}

// ==========================================
// تقرير عدد المناوبات (للاطلاع فقط)
// ==========================================
function renderFairness() {
    const box = document.getElementById('fairnessBox');
    if (box.style.display === 'block') { box.style.display = 'none'; return; }
    const st = computeStats(1e9);
    const all = computeStats(1e9, 0);
    const techs = sortedEmployees().filter(e => e.role === 'tech');
    const rows = techs.map(e => {
        const s = st[e.id];
        return `<tr><td>${e.name}</td><td>${s.E}</td><td>${s.N}</td><td><b>${s.W}</b></td><td>${all[e.id].W}</td></tr>`;
    }).join('');
    box.innerHTML = `<h4>عدد المناوبات المسجّلة</h4>
        <table class="fair-table"><thead><tr><th>Name</th><th>Evening</th><th>Night</th><th>Weekend (counted)</th><th>Weekend (all-time)</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <p style="margin:8px 0 0;">للاطلاع فقط: التوزيع يتبع الروتيشن الرسمي الثابت.</p>`;
    box.style.display = 'block';
}

// ==========================================
// تصدير/استيراد الإعدادات
// ==========================================
function exportSettings() {
    const hist = {};
    Object.keys(rotLog).forEach(k => { if (!draftKeys.has(k)) hist[k] = rotLog[k]; });
    const data = { version: 6, sections, employees, employeeOrder, ramadanDates, officialHolidays, history: hist };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lab-schedule-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

function importSettings(ev) {
    const f = ev.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const d = JSON.parse(reader.result);
            if (d.sections) localStorage.setItem('labSections', JSON.stringify(d.sections));
            if (d.employees) localStorage.setItem('labEmployees', JSON.stringify(d.employees));
            if (d.employeeOrder) localStorage.setItem('employeeOrder', JSON.stringify(d.employeeOrder));
            if (d.ramadanDates) localStorage.setItem('ramadanDates', JSON.stringify(d.ramadanDates));
            if (d.officialHolidays) localStorage.setItem('officialHolidays', JSON.stringify(d.officialHolidays));
            if (d.history) localStorage.setItem('labHistory', JSON.stringify(d.history));
            // ملف أقدم من الإصدار 6: يُعاد بناء الأشهر من الجدول الرسمي عند إعادة التحميل
            if ((d.version || 0) >= 6) localStorage.setItem('labMigV6', '1');
            else localStorage.removeItem('labMigV6');
            location.reload();
        } catch (e) {
            alert('ملف غير صالح');
        }
    };
    reader.readAsText(f);
}

// ==========================================
// تصدير Excel
// ==========================================
function exportToExcel() {
    const table = document.getElementById('scheduleTable');
    if (!table || table.rows.length === 0) {
        alert('Please generate the schedule first!');
        return;
    }
    const wb = XLSX.utils.table_to_book(table, { sheet: "Schedule" });
    const legendData = [
        ["Shift Codes:"],
        ["M (Morning):", "07:30 - 16:00"],
        ["E (Evening):", "15:30 - 23:30"],
        ["N (Night):", "23:30 - 07:30"],
        ["O (Off):", "Rest Day"],
        [],
        ["Ramadan Codes:"],
        ["R1 (Ramadan Morning):", "10:00 - 16:00"],
        ["R2 (After Asr):", "16:00 - 22:00"],
        ["R3 (Ramadan Night):", "22:00 - 04:00"],
        ["R4 (Dawn):", "04:00 - 10:00"],
        [],
        ["Head of Department:", "", "Head of Technicians:"],
        ["SAAD ALI ALQARNI", "", "BADER MOHAMMED ALQARNI"]
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(legendData);
    XLSX.utils.book_append_sheet(wb, ws2, "Legend");
    XLSX.writeFile(wb, `Laboratory_Schedule_${document.getElementById('printMonthYear').textContent}.xlsx`);
}

// ==========================================
// مشاركة CSV
// ==========================================
function shareCSV() {
    const table = document.getElementById('scheduleTable');
    if (!table || table.rows.length === 0) {
        alert('Please generate the schedule first!');
        return;
    }
    const headerCells = ["الاسم", "رقم الموظف", "القسم"];
    const daysHeaderRow = table.tHead.rows[1];
    const daysInMonth = daysHeaderRow.cells.length;
    for (let d = 1; d <= daysInMonth; d++) headerCells.push(String(d));
    const rows = [headerCells.join(',')];
    const bodyRows = table.tBodies[0].rows;
    for (let r = 0; r < bodyRows.length; r++) {
        const cells = bodyRows[r].cells;
        const clean = c => c.innerText.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
        const rowCells = [clean(cells[0]), clean(cells[1]), clean(cells[2])];
        for (let d = 0; d < daysInMonth; d++) {
            const cell = cells[3 + d];
            let val = 'O';
            if (cell) {
                const raw = cell.innerText.trim().toUpperCase();
                if (['M', 'E', 'N', 'O', 'R1', 'R2', 'R3', 'R4'].includes(raw)) val = raw;
            }
            rowCells.push(val);
        }
        rows.push(rowCells.join(','));
    }
    const csvContent = rows.join('\n') + '\n';
    const monthYear = document.getElementById('printMonthYear').textContent || 'Schedule';
    const filename = `Laboratory_Schedule_${monthYear}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('تم حفظ الملف باسم:\n' + filename);
}
