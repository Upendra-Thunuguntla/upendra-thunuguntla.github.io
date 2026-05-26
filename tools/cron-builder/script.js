/**
 * Cron Expression Builder for Mule Pollers
 * All parsing and scheduling calculation is 100% client-side.
 */

// ── Quartz Cron Field Definitions ──────────────────────────────────────────
const FIELDS = ['f-second', 'f-minute', 'f-hour', 'f-dom', 'f-month', 'f-dow', 'f-year'];

const DAY_NAMES = { SUN: 1, MON: 2, TUE: 3, WED: 4, THU: 5, FRI: 6, SAT: 7 };
const MONTH_NAMES = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };

// ── Human readable helpers ──────────────────────────────────────────────────
function humanReadable(expr) {
    const parts = expr.trim().split(/\s+/);
    if (parts.length < 6) return 'Invalid cron expression';

    const [sec, min, hr, dom, mon, dow, yr] = parts;

    let desc = [];

    // Hour/Min/Sec
    if (hr === '*' && min === '*') {
        desc.push('Every minute');
    } else if (min.startsWith('0/') && hr === '*') {
        const step = min.split('/')[1];
        desc.push(`Every ${step} minutes`);
    } else if (hr === '*') {
        desc.push(`At minute ${min} of every hour`);
    } else if (hr.includes(',')) {
        const hrs = hr.split(',').map(h => formatHour(h)).join(', ');
        desc.push(`At ${hrs}`);
    } else if (hr.includes('/')) {
        const [start, step] = hr.split('/');
        desc.push(`Every ${step} hours starting at ${formatHour(start)}`);
    } else {
        desc.push(`At ${formatHour(hr)}:${min.padStart(2, '0')}`);
    }

    // Day
    if (dom !== '*' && dom !== '?') {
        if (dom === 'L') desc.push('on the last day of the month');
        else desc.push(`on day ${dom} of the month`);
    } else if (dow !== '*' && dow !== '?') {
        if (dow === 'MON-FRI' || dow === '2-6') desc.push('on weekdays (Mon–Fri)');
        else if (dow === 'SAT,SUN' || dow === '1,7') desc.push('on weekends');
        else desc.push(`on ${dow}`);
    }

    // Month
    if (mon !== '*' && mon !== '?') {
        const monthMap = { 1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec' };
        desc.push(`in ${mon.split(',').map(m => monthMap[m] || m).join(', ')}`);
    }

    return desc.join(', ') || 'Custom schedule';
}

function formatHour(h) {
    const num = parseInt(h);
    if (isNaN(num)) return h;
    const suffix = num >= 12 ? 'PM' : 'AM';
    const displayHr = num % 12 === 0 ? 12 : num % 12;
    return `${displayHr}:00 ${suffix}`;
}

// ── Next Execution Time Calculator ─────────────────────────────────────────
/**
 * Simple next-run calculator for common Quartz patterns.
 * Covers: *, fixed values, ranges (a-b), lists (a,b,c), steps (a/n), ? 
 */
function parseField(val, min, max, nameMap) {
    val = val.trim().toUpperCase();

    // Replace named values
    if (nameMap) {
        for (const [name, num] of Object.entries(nameMap)) {
            val = val.replace(new RegExp(name, 'g'), num);
        }
    }

    if (val === '*' || val === '?') {
        const arr = [];
        for (let i = min; i <= max; i++) arr.push(i);
        return arr;
    }

    // Handle 'L' (last) — treat as max for calculation purposes
    if (val === 'L') return [max];

    // Step: */n or a/n
    if (val.includes('/')) {
        const [startStr, stepStr] = val.split('/');
        const start = startStr === '*' ? min : parseInt(startStr);
        const step = parseInt(stepStr);
        const arr = [];
        for (let i = start; i <= max; i += step) arr.push(i);
        return arr;
    }

    // Range: a-b
    if (val.includes('-')) {
        const [a, b] = val.split('-').map(Number);
        const arr = [];
        for (let i = a; i <= b; i++) arr.push(i);
        return arr;
    }

    // List: a,b,c
    if (val.includes(',')) {
        return val.split(',').map(Number).filter(n => n >= min && n <= max);
    }

    // Single value
    const n = parseInt(val);
    if (!isNaN(n)) return [n];

    return [];
}

function getNextRuns(expression, count = 5) {
    const parts = expression.trim().split(/\s+/);
    if (parts.length < 6) return [];

    const [secStr, minStr, hrStr, domStr, monStr, dowStr] = parts;

    try {
        const seconds = parseField(secStr, 0, 59);
        const minutes = parseField(minStr, 0, 59);
        const hours = parseField(hrStr, 0, 23);
        const months = parseField(monStr, 1, 12, MONTH_NAMES);

        const useDow = dowStr !== '?' && dowStr !== '*';
        const useDom = domStr !== '?' && domStr !== '*';

        const results = [];
        let d = new Date();
        d.setMilliseconds(0);
        d.setSeconds(d.getSeconds() + 1); // start from next second

        const maxIterations = 100000;
        let iter = 0;

        while (results.length < count && iter < maxIterations) {
            iter++;

            // Advance month if needed
            if (!months.includes(d.getMonth() + 1)) {
                d.setMonth(d.getMonth() + 1);
                d.setDate(1);
                d.setHours(0, 0, 0);
                continue;
            }

            // Day of week check (0=Sun in JS, but Quartz: 1=Sun)
            if (useDow) {
                const dows = parseField(dowStr, 1, 7, DAY_NAMES);
                const jsDow = d.getDay(); // 0=Sun
                const quartzDow = jsDow + 1; // 1=Sun
                if (!dows.includes(quartzDow)) {
                    d.setDate(d.getDate() + 1);
                    d.setHours(0, 0, 0);
                    continue;
                }
            }

            // Day of month check
            if (useDom) {
                const doms = parseField(domStr, 1, 31);
                if (!doms.includes(d.getDate())) {
                    d.setDate(d.getDate() + 1);
                    d.setHours(0, 0, 0);
                    continue;
                }
            }

            // Hour check
            if (!hours.includes(d.getHours())) {
                const nextHour = hours.find(h => h > d.getHours());
                if (nextHour !== undefined) {
                    d.setHours(nextHour, 0, 0);
                } else {
                    d.setDate(d.getDate() + 1);
                    d.setHours(hours[0], 0, 0);
                }
                continue;
            }

            // Minute check
            if (!minutes.includes(d.getMinutes())) {
                const nextMin = minutes.find(m => m > d.getMinutes());
                if (nextMin !== undefined) {
                    d.setMinutes(nextMin, 0);
                } else {
                    const nextHourIdx = hours.indexOf(d.getHours()) + 1;
                    if (nextHourIdx < hours.length) {
                        d.setHours(hours[nextHourIdx], minutes[0], 0);
                    } else {
                        d.setDate(d.getDate() + 1);
                        d.setHours(hours[0], minutes[0], 0);
                    }
                }
                continue;
            }

            // Second check
            if (!seconds.includes(d.getSeconds())) {
                const nextSec = seconds.find(s => s > d.getSeconds());
                if (nextSec !== undefined) {
                    d.setSeconds(nextSec);
                } else {
                    const nextMinIdx = minutes.indexOf(d.getMinutes()) + 1;
                    if (nextMinIdx < minutes.length) {
                        d.setMinutes(minutes[nextMinIdx], seconds[0]);
                    } else {
                        // advance to next hour
                        const nextHrIdx = hours.indexOf(d.getHours()) + 1;
                        if (nextHrIdx < hours.length) {
                            d.setHours(hours[nextHrIdx], minutes[0], seconds[0]);
                        } else {
                            d.setDate(d.getDate() + 1);
                            d.setHours(hours[0], minutes[0], seconds[0]);
                        }
                    }
                }
                continue;
            }

            // All fields match — add result
            results.push(new Date(d));
            d.setSeconds(d.getSeconds() + 1);
        }

        return results;
    } catch (e) {
        return [];
    }
}

function formatRelative(date) {
    const now = new Date();
    const diff = date - now;
    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);

    if (days > 0) return `in ${days}d ${hrs % 24}h`;
    if (hrs > 0) return `in ${hrs}h ${mins % 60}m`;
    if (mins > 0) return `in ${mins}m`;
    return `in ${secs}s`;
}

// ── DOM Update ──────────────────────────────────────────────────────────────
function buildExpression() {
    const vals = FIELDS.map(id => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
    });

    const [sec, min, hr, dom, mon, dow, yr] = vals;
    const parts = [sec || '0', min || '0', hr || '*', dom || '*', mon || '*', dow || '?'];
    if (yr) parts.push(yr);

    return parts.join(' ');
}

function update() {
    // Clear errors
    FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('field-error');
    });

    const expr = buildExpression();
    document.getElementById('cron-expression').textContent = expr;
    document.getElementById('cron-human').textContent = humanReadable(expr);
    document.getElementById('cron-error').style.display = 'none';

    // Next runs
    const runs = getNextRuns(expr, 5);
    const runsEl = document.getElementById('next-runs');

    if (runs.length === 0) {
        runsEl.innerHTML = '<div class="next-run-placeholder">Could not calculate next runs — check your expression.</div>';
    } else {
        runsEl.innerHTML = runs.map((d, i) => `
            <div class="next-run-item">
                <div class="next-run-index">${i + 1}</div>
                <div class="next-run-datetime">${d.toLocaleString()}</div>
                <div class="next-run-relative">${formatRelative(d)}</div>
            </div>
        `).join('');
    }

    // Mule XML
    const xml = generateMuleXml(expr);
    document.getElementById('mule-xml-output').value = xml;
}

function generateMuleXml(expr) {
    return `<flow name="scheduledFlow" doc:name="scheduledFlow">
    <scheduler doc:name="Scheduler">
        <scheduling-strategy>
            <cron expression="${expr}" timeZone="UTC"/>
        </scheduling-strategy>
    </scheduler>
    <!-- Your flow logic here -->
</flow>`;
}

// ── Actions ─────────────────────────────────────────────────────────────────
function copyCron() {
    const expr = document.getElementById('cron-expression').textContent;
    navigator.clipboard.writeText(expr).then(() => {
        const btn = document.getElementById('copy-cron-btn');
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        btn.style.background = 'var(--success)';
        setTimeout(() => {
            btn.innerHTML = original;
            btn.style.background = '';
        }, 2000);
    });
}

function copyMuleXml() {
    const xml = document.getElementById('mule-xml-output').value;
    navigator.clipboard.writeText(xml).then(() => {
        showToast('Mule XML copied!');
    });
}

function downloadXml() {
    const xml = document.getElementById('mule-xml-output').value;
    const blob = new Blob([xml], { type: 'text/xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'scheduler-flow.xml';
    a.click();
}

function resetFields() {
    document.getElementById('f-second').value = '0';
    document.getElementById('f-minute').value = '0';
    document.getElementById('f-hour').value = '8';
    document.getElementById('f-dom').value = '*';
    document.getElementById('f-month').value = '*';
    document.getElementById('f-dow').value = 'MON-FRI';
    document.getElementById('f-year').value = '';
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    update();
}

function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `
        position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
        background:var(--surface-2); border:1px solid var(--border);
        border-radius:var(--radius-full); padding:10px 20px;
        font-size:0.85rem; font-weight:600; color:var(--text);
        box-shadow:var(--shadow-lg); z-index:9999;
        animation: fadeIn 0.2s ease;
    `;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

// ── Presets ──────────────────────────────────────────────────────────────────
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const cron = btn.dataset.cron;
        const parts = cron.split(' ');

        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.getElementById('f-second').value = parts[0] || '0';
        document.getElementById('f-minute').value = parts[1] || '0';
        document.getElementById('f-hour').value = parts[2] || '*';
        document.getElementById('f-dom').value = parts[3] || '*';
        document.getElementById('f-month').value = parts[4] || '*';
        document.getElementById('f-dow').value = parts[5] || '?';
        document.getElementById('f-year').value = parts[6] || '';

        update();
    });
});

// ── Live Input Listeners ─────────────────────────────────────────────────────
FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        update();
    });
});

// ── Init ─────────────────────────────────────────────────────────────────────
update();

// Show timezone
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const tzEl = document.getElementById('tz-label');
if (tzEl) tzEl.textContent = tz;

// ── Cron Checker ─────────────────────────────────────────────────────────────
const FIELD_META = [
    { name: 'Second',       range: '0–59' },
    { name: 'Minute',       range: '0–59' },
    { name: 'Hour',         range: '0–23' },
    { name: 'Day of Month', range: '1–31' },
    { name: 'Month',        range: '1–12' },
    { name: 'Day of Week',  range: '1–7 / SUN–SAT' },
    { name: 'Year',         range: 'optional' },
];

function fieldMeaning(value, fieldIndex) {
    const v = value.toUpperCase();
    if (v === '*') return 'every';
    if (v === '?') return 'any';
    if (v === 'L' && fieldIndex === 3) return 'last day';
    if (v.includes('/')) {
        const [start, step] = v.split('/');
        const s = start === '*' || start === '0' ? 'start' : start;
        return `every ${step}${fieldIndex === 2 ? 'h' : fieldIndex === 1 ? 'm' : fieldIndex === 0 ? 's' : ''} from ${s}`;
    }
    if (v.includes('-')) return `${v} (range)`;
    if (v.includes(',')) return `${v} (list)`;
    // Named days/months
    const DAY_LABEL = { '1':'Sun','2':'Mon','3':'Tue','4':'Wed','5':'Thu','6':'Fri','7':'Sat',
        'SUN':'Sun','MON':'Mon','TUE':'Tue','WED':'Wed','THU':'Thu','FRI':'Fri','SAT':'Sat' };
    const MON_LABEL = { '1':'Jan','2':'Feb','3':'Mar','4':'Apr','5':'May','6':'Jun',
        '7':'Jul','8':'Aug','9':'Sep','10':'Oct','11':'Nov','12':'Dec',
        'JAN':'Jan','FEB':'Feb','MAR':'Mar','APR':'Apr','MAY':'May','JUN':'Jun',
        'JUL':'Jul','AUG':'Aug','SEP':'Sep','OCT':'Oct','NOV':'Nov','DEC':'Dec' };
    if (fieldIndex === 5 && DAY_LABEL[v]) return DAY_LABEL[v];
    if (fieldIndex === 4 && MON_LABEL[v]) return MON_LABEL[v];
    if (fieldIndex === 2) {
        const n = parseInt(v);
        if (!isNaN(n)) {
            const suffix = n >= 12 ? 'PM' : 'AM';
            const h = n % 12 === 0 ? 12 : n % 12;
            return `${h}:00 ${suffix}`;
        }
    }
    return value;
}

function buildDetailedExplanation(parts) {
    const [sec, min, hr, dom, mon, dow, yr] = parts;
    const lines = [];

    // Time component
    let timeDesc = '';
    if (sec !== '0' && sec !== '*') {
        timeDesc += `at second <strong>${sec}</strong>, `;
    }
    if (min === '*') {
        timeDesc += 'every minute';
    } else if (min.includes('/')) {
        const [s, step] = min.split('/');
        timeDesc += `every <strong>${step} minutes</strong>${s !== '0' && s !== '*' ? ` from minute ${s}` : ''}`;
    } else if (min.includes(',')) {
        timeDesc += `at minutes <strong>${min}</strong>`;
    } else {
        timeDesc += `at minute <strong>${min}</strong>`;
    }

    if (hr === '*') {
        timeDesc += ' of every hour';
    } else if (hr.includes('/')) {
        const [s, step] = hr.split('/');
        const start = parseInt(s);
        const suffix = start >= 12 ? 'PM' : 'AM';
        const h = start % 12 === 0 ? 12 : start % 12;
        timeDesc += `, every <strong>${step} hours</strong> starting at <strong>${h}:00 ${suffix}</strong>`;
    } else if (hr.includes(',')) {
        const formatted = hr.split(',').map(h => {
            const n = parseInt(h); const suf = n>=12?'PM':'AM'; const d=n%12===0?12:n%12;
            return `<strong>${d}:00 ${suf}</strong>`;
        }).join(', ');
        timeDesc += ` at ${formatted}`;
    } else if (hr.includes('-')) {
        const [a,b] = hr.split('-').map(Number);
        const fmt = n => { const suf=n>=12?'PM':'AM'; const d=n%12===0?12:n%12; return `${d}:00 ${suf}`; };
        timeDesc += ` between <strong>${fmt(a)}</strong> and <strong>${fmt(b)}</strong>`;
    } else {
        const n = parseInt(hr);
        const suf = n>=12?'PM':'AM'; const d=n%12===0?12:n%12;
        timeDesc += ` at <strong>${d}:${String(parseInt(min)).padStart(2,'0')} ${suf}</strong>`;
    }

    lines.push(timeDesc.charAt(0).toUpperCase() + timeDesc.slice(1));

    // Day component
    const useDow = dow && dow !== '?' && dow !== '*';
    const useDom = dom && dom !== '?' && dom !== '*';

    if (useDow) {
        const v = dow.toUpperCase();
        if (v === 'MON-FRI' || v === '2-6') lines.push('on <strong>weekdays (Mon–Fri)</strong>');
        else if (v === 'SAT,SUN' || v === '1,7' || v === '7,1') lines.push('on <strong>weekends (Sat & Sun)</strong>');
        else if (v.includes('-')) {
            const days = ['','Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
            const [a,b] = v.split('-');
            const aName = days[parseInt(a)] || a;
            const bName = days[parseInt(b)] || b;
            lines.push(`on <strong>${aName} through ${bName}</strong>`);
        } else if (v.includes(',')) {
            lines.push(`on <strong>${v}</strong> (specific days)`);
        } else {
            const days = ['','Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
            const name = {SUN:'Sunday',MON:'Monday',TUE:'Tuesday',WED:'Wednesday',THU:'Thursday',FRI:'Friday',SAT:'Saturday'}[v] || (days[parseInt(v)] ? days[parseInt(v)] + 'day' : v);
            lines.push(`every <strong>${name}</strong>`);
        }
    } else if (useDom) {
        if (dom === 'L') lines.push('on the <strong>last day of the month</strong>');
        else if (dom.includes('W')) lines.push(`on the nearest <strong>weekday to day ${dom.replace('W','')}</strong>`);
        else lines.push(`on <strong>day ${dom}</strong> of the month`);
    } else {
        lines.push('every day');
    }

    // Month component
    if (mon && mon !== '*' && mon !== '?') {
        const mNames = {1:'January',2:'February',3:'March',4:'April',5:'May',6:'June',
            7:'July',8:'August',9:'September',10:'October',11:'November',12:'December',
            JAN:'January',FEB:'February',MAR:'March',APR:'April',MAY:'May',JUN:'June',
            JUL:'July',AUG:'August',SEP:'September',OCT:'October',NOV:'November',DEC:'December'};
        if (mon.includes(',')) {
            const named = mon.split(',').map(m => mNames[m.toUpperCase()] || mNames[parseInt(m)] || m);
            lines.push(`in <strong>${named.join(', ')}</strong>`);
        } else if (mon.includes('-')) {
            const [a,b] = mon.split('-');
            lines.push(`from <strong>${mNames[a.toUpperCase()] || mNames[parseInt(a)] || a}</strong> to <strong>${mNames[b.toUpperCase()] || mNames[parseInt(b)] || b}</strong>`);
        } else {
            lines.push(`in <strong>${mNames[mon.toUpperCase()] || mNames[parseInt(mon)] || mon}</strong>`);
        }
    } else {
        lines.push('of every month');
    }

    if (yr && yr !== '*') lines.push(`in year <strong>${yr}</strong>`);

    return lines.join(', ');
}

function explainCron() {
    const raw = document.getElementById('checker-input').value.trim();
    const resultEl = document.getElementById('checker-result');
    const errorEl = document.getElementById('checker-error');

    resultEl.style.display = 'none';
    errorEl.style.display = 'none';

    if (!raw) {
        errorEl.innerHTML = '<i class="fas fa-circle-exclamation"></i> Please paste a cron expression first.';
        errorEl.style.display = 'flex';
        return;
    }

    const parts = raw.split(/\s+/);
    if (parts.length < 6) {
        errorEl.innerHTML = '<i class="fas fa-circle-exclamation"></i> Invalid expression — Quartz cron requires at least 6 fields: <code>Seconds Minutes Hours Day-of-Month Month Day-of-Week</code>';
        errorEl.style.display = 'flex';
        return;
    }

    try {
        // Field breakdown
        const fieldsRow = document.getElementById('checker-fields-row');
        fieldsRow.innerHTML = parts.map((val, i) => {
            const meta = FIELD_META[i] || { name: `Field ${i+1}`, range: '' };
            const meaning = fieldMeaning(val, i);
            return `<div class="checker-field-chip">
                <div class="checker-field-value">${val}</div>
                <div class="checker-field-name">${meta.name}</div>
                <div class="checker-field-meaning">${meaning}</div>
            </div>`;
        }).join('');

        // Plain English
        document.getElementById('checker-plain').innerHTML = buildDetailedExplanation(parts);

        // Next 10 runs
        const runs = getNextRuns(raw, 10);
        const runsEl = document.getElementById('checker-runs');
        const DAY_NAMES_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

        if (runs.length === 0) {
            runsEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Could not calculate next runs for this expression.</p>';
        } else {
            runsEl.innerHTML = runs.map((d, i) => `
                <div class="checker-run-item">
                    <div class="checker-run-index">${i + 1}</div>
                    <div class="checker-run-info">
                        <div class="checker-run-datetime">${d.toLocaleString()}</div>
                        <div class="checker-run-day">${DAY_NAMES_FULL[d.getDay()]}</div>
                    </div>
                    <div class="checker-run-rel">${formatRelative(d)}</div>
                </div>
            `).join('');
        }

        // Timezone label
        document.getElementById('checker-tz').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;

        resultEl.style.display = 'flex';

        // Scroll into view
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch(e) {
        errorEl.innerHTML = `<i class="fas fa-circle-exclamation"></i> Error parsing expression: ${e.message}`;
        errorEl.style.display = 'flex';
    }
}

// Allow pressing Enter in checker input
document.getElementById('checker-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') explainCron();
});
