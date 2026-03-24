/* ══════════════════════════════════════════════
   Salary Calc — Salary Hike Calculator
   ══════════════════════════════════════════════ */

const currentEl = document.getElementById('current-salary');
const revisedEl = document.getElementById('revised-salary');
const pctEl = document.getElementById('hike-percentage');

const resultLabel = document.getElementById('result-label');
const resultEl = document.getElementById('hike-result');
const msgEl = document.getElementById('hike-message');

let lastEdited = 'revised';

function onRevisedInput() {
    if (revisedEl.value !== '') {
        pctEl.value = '';
        lastEdited = 'revised';
    }
    calc();
}

function onPctInput() {
    if (pctEl.value !== '') {
        revisedEl.value = '';
        lastEdited = 'pct';
    }
    calc();
}

function calc() {
    const cur = parseFloat(currentEl.value);
    const rev = parseFloat(revisedEl.value);
    const pctVal = parseFloat(pctEl.value);

    if (!currentEl.value || (!revisedEl.value && !pctEl.value)) {
        resultLabel.textContent = 'Result';
        resultEl.textContent = '—';
        msgEl.textContent = 'Enter current salary along with revised CTC OR hike %';
        resultEl.style.fontSize = '';
        resultEl.style.background = 'var(--text)';
        resultEl.style.webkitBackgroundClip = 'text';
        resultEl.style.backgroundClip = 'text';
        resultEl.style.webkitTextFillColor = 'transparent';
        return;
    }
    if (cur <= 0) {
        resultLabel.textContent = 'Result';
        resultEl.textContent = '😑';
        msgEl.textContent = "Current salary must be a positive number!";
        return;
    }

    let calculatedPct = 0;
    let calculatedRev = 0;

    if (lastEdited === 'revised' && !isNaN(rev)) {
        if (rev < 0) {
            resultLabel.textContent = 'Result';
            resultEl.textContent = '😑';
            msgEl.textContent = "Revised salary cannot be negative!";
            return;
        }
        calculatedPct = ((rev - cur) / cur) * 100;
        resultLabel.textContent = 'Your Hike Percentage';
        resultEl.textContent = calculatedPct.toFixed(2) + '%';
    } else if (lastEdited === 'pct' && !isNaN(pctVal)) {
        calculatedPct = pctVal;
        calculatedRev = cur * (1 + (pctVal / 100));
        resultLabel.textContent = 'Your Revised CTC';
        resultEl.textContent = calculatedRev.toFixed(2) + ' LPA';
    } else {
        return; // Ignore if fields are cleared but not completely empty yet
    }

    if (calculatedPct > 0) {
        msgEl.textContent = '🎉 Congratulations on your hike!';
        resultEl.style.background = 'linear-gradient(135deg, #22c55e, #00d4ff)';
    } else if (calculatedPct === 0) {
        msgEl.textContent = '😐 No change in salary.';
        resultEl.style.background = 'var(--grad-primary)';
    } else {
        msgEl.textContent = '😢 Salary decreased — negotiate hard!';
        resultEl.style.background = 'linear-gradient(135deg, #ef4444, #f59e0b)';
    }
    resultEl.style.webkitBackgroundClip = 'text';
    resultEl.style.backgroundClip = 'text';
    resultEl.style.webkitTextFillColor = 'transparent';

    track_event('calculate', {
        tool: 'salary_calc',
        hike_pct: calculatedPct.toFixed(2),
        direction: calculatedPct > 0 ? 'increase' : calculatedPct < 0 ? 'decrease' : 'flat',
        current_salary: cur,
        revised_salary: isNaN(rev) ? calculatedRev : rev,
    });
}

currentEl.addEventListener('input', calc);
revisedEl.addEventListener('input', onRevisedInput);
pctEl.addEventListener('input', onPctInput);
currentEl.focus();
