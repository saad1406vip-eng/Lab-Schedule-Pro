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
// اختيار صباح الويكند التلقائي يبدأ من نوفمبر 2026
const WEEKEND_AUTO_FROM_IDX = 2026 * 12 + 10;
// عدّاد الويكند يبدأ من أكتوبر 2026 (صادر فعلاً). لتجاهل أكتوبر ضع: 2026 * 12 + 10
// ولاحتساب كل التاريخ ضع: 0
const WEEKEND_COUNT_FROM_IDX = 2026 * 12 + 9;
const SHIFT_TIME = {            // [بداية, نهاية] بالساعات (النهاية بعد 24 = اليوم التالي)
    M: [7.5, 16], E: [15.5, 23.5], N: [23.5, 31.5],
    R1: [10, 16], R2: [16, 22], R3: [22, 28], R4: [4, 10]
};
const SEL_IDS = ['lightTech1Select', 'lightTech2Select', 'nightTech1Select', 'nightTech2Select', 'weekendMorning1Select', 'weekendMorning2Select'];

// ==========================================
// سجل الروتيشن (المرجع الدائم للأشهر)
// ==========================================
function monthKey(y, m) { return y + '-' + String(m + 1).padStart(2, '0'); }
function keyToIdx(k) { const [y, m] = k.split('-').map(Number); return y * 12 + (m - 1); }
function idxToKey(i) { return monthKey(Math.floor(i / 12), i % 12); }

let rotLog = JSON.parse(localStorage.getItem('labHistory'));
let draftKeys = new Set();      // أشهر مقترحة لم تُعتمد بعد (لا تُحفظ)
if (!rotLog) seedHistory();

function seedHistory() {
    const id = n => { const e = employees.find(x => x.name === n); return e ? e.id : null; };
    const mk = (E, N, W) => ({ E: E.map(id), N: N.map(id), W: W.map(id) });
    const noW = o => ({ E: [...o.E], N: [...o.N], W: [] });
    // أكتوبر صادر كما هو. من نوفمبر: المسائي والليلي من القروبات، والويكند يُختار تلقائياً
    const oct = mk(["MISFER AYED", "SULTAN MOHD"], ["MOHD NASSER", "NAIF ABDULLAH"], ["MOHD SALEH", "NAIF MOHD"]);
    const nov = mk(["MANSOUR MOHD", "FAHAD ABDULLAH"], ["HOSSAM SAEED", "MOHD SAHLAN"], []);
    const dec = mk(["MOHD SALEH", "SAAD EID"], ["MOHD SAAD", "NAIF MOHD"], []);
    const jan = mk(["MOHD NASSER", "NAIF ABDULLAH"], ["MISFER AYED", "SULTAN MOHD"], []);
    const feb = mk(["HOSSAM SAEED", "MOHD SAHLAN"], ["MANSOUR MOHD", "FAHAD ABDULLAH"], []);
    const mar = mk(["MOHD SAAD", "NAIF MOHD"], ["MOHD SALEH", "SAAD EID"], []);
    rotLog = {
        "2026-10": oct, "2026-11": nov, "2026-12": dec,
        "2027-01": jan, "2027-02": feb, "2027-03": mar,
        "2027-04": noW(oct), "2027-05": noW(nov), "2027-06": noW(dec)
    };
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

// تحديث لمرة واحدة: يُعاد اختيار صباح الويكند من نوفمبر 2026 بالنظام الجديد
function migrateV3() {
    if (localStorage.getItem('labMigV3')) return;
    employees.forEach(e => {
        if (e.name === 'MOHD KHALAF' || e.name === 'MOHD DHAKIL') {
            if (!e.pairKey) e.pairKey = 'khalaf-dhakil';
            e.weekendLast = true;
        }
    });
    localStorage.setItem('labEmployees', JSON.stringify(employees));
    Object.keys(rotLog).forEach(k => {
        if (keyToIdx(k) >= WEEKEND_AUTO_FROM_IDX) rotLog[k].W = [];
    });
    saveHistory();
    localStorage.setItem('labMigV3', '1');
}
migrateV3();

function sortedEmployees() {
    return [...employees].sort((a, b) => (employeeOrder[a.id] || 999) - (employeeOrder[b.id] || 999));
}

// ==========================================
// عدّادات العدالة
// E/N يُحسبان من أول سجل، والويكند من WEEKEND_COUNT_FROM_IDX (أو wFrom)
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

function cmpBy(fn) {
    return (a, b) => {
        const x = fn(a), y = fn(b);
        for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i];
        return 0;
    };
}

// كل قسم يبقى فيه فني واحد على الأقل (غير محتاج لشريك) في الصباح
function coverageOK(duty) {
    const ids = new Set(duty.map(x => x.id));
    return sections.every(sec => {
        const all = employees.filter(e => e.section === sec && e.role === 'tech');
        if (!all.length) return true;
        return all.some(e => !e.needsPartner && !ids.has(e.id));
    });
}

// ==========================================
// اختيار صباح الويكند
//  - الأقل ويكنداً أولاً (عدّاد الويكند وحده)
//  - عند التعادل: من عليه "Weekend turn last" يأتي بعد الجميع
//  - مفتاح الازدواج صارم دائماً (دخيل وخلف لا يجتمعان)
// ==========================================
function pickWeekendPair(st, chosen, prevAll, techs, ord) {
    const cids = new Set(chosen.map(x => x.id));
    const cand = techs.filter(e => !cids.has(e.id)).sort(cmpBy(e => [
        st[e.id].W, e.weekendLast ? 1 : 0, st[e.id].last, ord.get(e.id)
    ]));
    for (let wl = 0; wl <= 2; wl++) {
        // wl 0: كل الشروط | 1: يسمح بمن عمل الشهر السابق | 2: بلا شرط تغطية القسم
        const picked = [...chosen], W = [];
        for (const c of cand) {
            if (W.length === 2) break;
            if (c.needsPartner && W.some(x => x.needsPartner)) continue;
            if (c.pairKey && picked.some(x => x.pairKey === c.pairKey)) continue;
            if (wl < 1 && prevAll.has(c.id)) continue;
            if (wl < 2 && !coverageOK([...picked, c])) continue;
            W.push(c); picked.push(c);
        }
        if (W.length < 2 || W.every(x => x.needsPartner)) continue;
        // المحتاج لشريك ثانياً، ومن أخذ الموضع الأول أقل يأخذه الآن
        W.sort((a, b) =>
            ((a.needsPartner ? 1 : 0) - (b.needsPartner ? 1 : 0)) ||
            (st[a.id].w0 - st[b.id].w0) || (ord.get(a.id) - ord.get(b.id)));
        return W;
    }
    return null;
}

// ==========================================
// الاختيار التلقائي العادل لشهر جديد
//  - المسائي والليلي: بعدّادهما فقط (E+N) فتبقى دورة القروبات
// ==========================================
function autoPickRoster(y, m) {
    const idx = y * 12 + m;
    const st = computeStats(idx);
    const prev = rotLog[idxToKey(idx - 1)] || {};
    const prevEN = new Set([...(prev.E || []), ...(prev.N || [])]);
    const prevAll = new Set([...prevEN, ...(prev.W || [])]);
    const ord = new Map(sortedEmployees().map((e, i) => [e.id, i]));
    const techs = employees.filter(e => e.role === 'tech' && e.dutyMode !== 'none');

    // lvl 0: كل الشروط | 1: يسمح بشهرين متتاليين | 2: بلا شرط تغطية القسم | 3: بلا شرط الازدواج
    const ok = (c, chosen, lvl, blocked) => {
        if (lvl < 1 && blocked.has(c.id)) return false;
        if (lvl < 3 && c.pairKey && chosen.some(x => x.pairKey === c.pairKey)) return false;
        if (lvl < 2 && !coverageOK([...chosen, c])) return false;
        return true;
    };

    for (let level = 0; level <= 3; level++) {
        const enCand = techs.filter(e => e.dutyMode === 'all').sort(cmpBy(e => [
            st[e.id].E + st[e.id].N, st[e.id].lastEN, ord.get(e.id)
        ]));
        const chosen = [];
        for (const c of enCand) {
            if (chosen.length === 4) break;
            if (ok(c, chosen, level, prevEN)) chosen.push(c);
        }
        if (chosen.length < 4) continue;

        const bal = [...chosen].sort((a, b) =>
            ((st[a.id].E - st[a.id].N) - (st[b.id].E - st[b.id].N)) || (ord.get(a.id) - ord.get(b.id)));
        const E = bal.slice(0, 2), N = bal.slice(2, 4);

        const W = pickWeekendPair(st, chosen, prevAll, techs, ord);
        if (!W) continue;
        return { E: E.map(x => x.id), N: N.map(x => x.id), W: W.map(x => x.id) };
    }
    return null;
}

// يملأ صباح الويكند للأشهر المسجّلة (من نوفمبر 2026) التي ويكندها فارغ، بالترتيب
function fillMissingWeekends() {
    const ord = new Map(sortedEmployees().map((e, i) => [e.id, i]));
    const techs = employees.filter(e => e.role === 'tech' && e.dutyMode !== 'none');
    let changed = false;
    Object.keys(rotLog).sort().forEach(k => {
        const idx = keyToIdx(k);
        if (idx < WEEKEND_AUTO_FROM_IDX) return;
        const r = rotLog[k];
        if (r.W && r.W.length === 2) return;
        const chosen = [...(r.E || []), ...(r.N || [])].map(id => employees.find(e => e.id === id)).filter(Boolean);
        if (chosen.length < 4) return;
        const st = computeStats(idx);
        const prev = rotLog[idxToKey(idx - 1)] || {};
        const prevAll = new Set([...(prev.E || []), ...(prev.N || []), ...(prev.W || [])]);
        const W = pickWeekendPair(st, chosen, prevAll, techs, ord);
        if (W) { r.W = W.map(x => x.id); changed = true; }
    });
    if (changed) saveHistory();
}

function ensureHistory(y, m) {
    const keys = Object.keys(rotLog).sort();
    if (!keys.length) return;
    fillMissingWeekends();
    const last = keyToIdx(keys[keys.length - 1]);
    const target = y * 12 + m;
    for (let i = last + 1; i <= target; i++) {
        const r = autoPickRoster(Math.floor(i / 12), i % 12);
        if (!r) break;
        const k = idxToKey(i);
        rotLog[k] = r;
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
        // يبدأ بأقل عبء بين الموجودين حتى لا يُظلم ولا يُفرط عليه
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

// تشكيلة أي يوم = تشكيلة شهر يوم الأحد الذي يبدأ أسبوعه
function rosterKeyForDate(d) {
    const s = startOfWeekSunday(d);
    const k = monthKey(s.getFullYear(), s.getMonth());
    if (rotLog[k]) return k;
    const k2 = monthKey(d.getFullYear(), d.getMonth());
    return rotLog[k2] ? k2 : null;
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

function buildMatrix(year, month) {
    const lastDay = new Date(year, month + 1, 0);
    const ws = startOfWeekSunday(new Date(year, month, 1 - 14));
    const days = [];
    for (let d = new Date(ws); d <= lastDay; d.setDate(d.getDate() + 1)) days.push(new Date(d));
    const startIdx = days.findIndex(d => d.getMonth() === month && d.getFullYear() === year);
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
    return { days, rows, startIdx, tail };
}

// ==========================================
// الفحص بعد التوليد
// ==========================================
function runValidation(M, year, month) {
    const box = document.getElementById('validationReport');
    if (!box) return;
    const idx = year * 12 + month;
    if (idx < FIRST_VALIDATED_IDX) {
        box.innerHTML = '<div class="vr-info">ℹ️ هذا الشهر سابق لنظام الفحص (سبتمبر وأكتوبر 2026 صادران ومعتمدان في موارد).</div>';
        return;
    }
    const errs = [], warns = [];
    const lab = k => `${M.days[k].getDate()}/${M.days[k].getMonth() + 1}`;
    const r = rotLog[monthKey(year, month)];
    if (!r) errs.push('لا يوجد روتيشن مسجّل لهذا الشهر');
    else if (!rosterIsValid(r)) errs.push('تشكيلة الشهر فيها موظف محذوف أو ناقصة — اضغط «Re-pick Month»');

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

    const list = (arr, cls, title) => arr.length ? `<div class="${cls}"><b>${title} (${arr.length})</b><ul>${
        arr.slice(0, 25).map(e => `<li>${e}</li>`).join('')}</ul>${arr.length > 25 ? '<div>…</div>' : ''}</div>` : '';
    box.innerHTML = (!errs.length && !warns.length)
        ? '<div class="vr-ok">✅ اجتاز الفحص: التغطية كاملة، 5 أيام عمل/يومان راحة، ولا انتقال مباشر من مسائي/ليلي إلى صباحي.</div>'
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
    if (!confirm('سيُحذف توزيع هذا الشهر وما بعده المحفوظ (المسائي والليلي والويكند) ويُعاد اختياره تلقائياً بالعدالة. متابعة؟')) return;
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
// تقرير العدالة
// ==========================================
function renderFairness() {
    const box = document.getElementById('fairnessBox');
    if (box.style.display === 'block') { box.style.display = 'none'; return; }
    const st = computeStats(1e9);
    const all = computeStats(1e9, 0);
    const techs = sortedEmployees().filter(e => e.role === 'tech');
    const wc = techs.filter(e => e.dutyMode !== 'none').map(e => st[e.id].W);
    const spread = wc.length ? Math.max(...wc) - Math.min(...wc) : 0;
    const wLabel = WEEKEND_COUNT_FROM_IDX > 0
        ? `من ${monthNames[WEEKEND_COUNT_FROM_IDX % 12]} ${Math.floor(WEEKEND_COUNT_FROM_IDX / 12)}`
        : 'الكل';
    const rows = techs.map(e => {
        const s = st[e.id];
        return `<tr><td>${e.name}${e.weekendLast ? ' ★' : ''}</td><td>${s.E}</td><td>${s.N}</td><td><b>${s.W}</b></td><td>${all[e.id].W}</td></tr>`;
    }).join('');
    box.innerHTML = `<h4>العدالة (المسائي والليلي من أكتوبر 2026، وصباح الويكند ${wLabel})</h4>
        <table class="fair-table"><thead><tr><th>Name</th><th>Evening</th><th>Night</th><th>Weekend (counted)</th><th>Weekend (all-time)</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <p style="margin:8px 0 0;">★ دوره في الويكند يأتي أخيراً. الفرق بين أعلى وأدنى ويكند محتسب: <b>${spread}</b> (المطلوب 1 أو أقل)</p>`;
    box.style.display = 'block';
}

// ==========================================
// تصدير/استيراد الإعدادات
// ==========================================
function exportSettings() {
    const hist = {};
    Object.keys(rotLog).forEach(k => { if (!draftKeys.has(k)) hist[k] = rotLog[k]; });
    const data = { version: 3, sections, employees, employeeOrder, ramadanDates, officialHolidays, history: hist };
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
            // ملف قديم: يُطبَّق عليه تحديث الويكند عند إعادة التحميل
            if (d.version === 3) localStorage.setItem('labMigV3', '1');
            else localStorage.removeItem('labMigV3');
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
