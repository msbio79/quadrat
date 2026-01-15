
// DOM Elements
const ecosystem = document.getElementById('ecosystem');
const quadrat = document.getElementById('quadrat');
const btnGenerate = document.getElementById('btn-generate');
const btnResetData = document.getElementById('btn-reset-data');
const dataBody = document.getElementById('data-body');

// Stats Elements (Updated for Advanced Analysis)
const els = {
    // Density
    den: { dan: document.getElementById('den-dan'), clo: document.getElementById('den-clo'), fox: document.getElementById('den-fox') },
    rd: { dan: document.getElementById('rd-dan'), clo: document.getElementById('rd-clo'), fox: document.getElementById('rd-fox') },
    // Frequency
    freq: { dan: document.getElementById('freq-dan'), clo: document.getElementById('freq-clo'), fox: document.getElementById('freq-fox') },
    rf: { dan: document.getElementById('rf-dan'), clo: document.getElementById('rf-clo'), fox: document.getElementById('rf-fox') },
    // Coverage
    cov: { dan: document.getElementById('cov-dan'), clo: document.getElementById('cov-clo'), fox: document.getElementById('cov-fox') },
    rc: { dan: document.getElementById('rc-dan'), clo: document.getElementById('rc-clo'), fox: document.getElementById('rc-fox') },
    // Importance Value
    iv: { dan: document.getElementById('iv-dan'), clo: document.getElementById('iv-clo'), fox: document.getElementById('iv-fox') }
};

const avgEls = {
    dandelion: document.getElementById('avg-dandelion'),
    clover: document.getElementById('avg-clover'),
    foxtail: document.getElementById('avg-foxtail')
};

// Config
// Coverage Area Constants (Arbitrary relative units for simulation)
const PLANT_SPECIES = {
    dandelion: { label: '민들레', prob: 0.3, coverageArea: 4 }, // Broad leaves
    clover: { label: '클로버', prob: 0.5, coverageArea: 2 }, // Small
    foxtail: { label: '강아지풀', prob: 0.2, coverageArea: 1 } // Thin
};

const QUADRAT_SIZE_M2 = 1.0; // 1m x 1m
const PLANT_DENSITY_PER_100PX = 0.5; // Plants per 100x100px area approximate

// State
let measurements = [];
let plantsData = []; // Store plant info {type, x (%), y (%)} for responsiveness

// Drag State
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let initialLeft = 0;
let initialTop = 0;
let animationFrameId = null;

// --- Initialization ---

function init() {
    generateEcosystem();
    setupDragAndDrop();
    setupControls();

    // Window Resize Handler for Responsiveness
    // Since we store positions in %, we just need to ensure the field updates if needed.
    // CSS handles the rendering, but if we have cached rects, update them?
    // Current logic uses rects only on drag/interaction.
}

// --- Ecosystem Generation (Responsive) ---

function generateEcosystem() {
    // Clear DOM
    const plants = ecosystem.querySelectorAll('.plant');
    plants.forEach(p => p.remove());
    plantsData = [];

    const rect = ecosystem.getBoundingClientRect();
    // Calculate number of plants based on area to maintain visual density
    const area = rect.width * rect.height;
    const plantCount = Math.floor(area * 0.0008);

    for (let i = 0; i < plantCount; i++) {
        createRandomPlant();
    }
}

function createRandomPlant() {
    // Select type
    const rand = Math.random();
    let cumulative = 0;
    let type = 'foxtail'; // default

    for (const [key, val] of Object.entries(PLANT_SPECIES)) {
        cumulative += val.prob;
        if (rand < cumulative) {
            type = key;
            break;
        }
    }

    // Position in Percent (0-100) to be responsive
    const xPct = Math.random() * 96 + 2; // Keep away from extreme edges (2% - 98%)
    const yPct = Math.random() * 96 + 2;
    const rotation = Math.random() * 360;

    // Save Data
    plantsData.push({ type, xPct, yPct, rotation });

    // Render
    renderPlant(type, xPct, yPct, rotation);
}

function renderPlant(type, x, y, rot) {
    const plant = document.createElement('div');
    plant.classList.add('plant', type);
    plant.style.left = `${x}%`;
    plant.style.top = `${y}%`;
    plant.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;
    ecosystem.appendChild(plant);
}

// --- Optimized Drag and Drop Logic ---

function setupDragAndDrop() {
    quadrat.addEventListener('mousedown', onMouseDown);

    // Initialize Position: Convert CSS centered position to absolute pixels to avoid jumps
    // The CSS is top: 50%, left: 50% with transform: translate(-50%, -50%)
    // We want to switch to pure left/top px positioning.
    const fieldRect = ecosystem.getBoundingClientRect();
    const qRect = quadrat.getBoundingClientRect();

    // Current visual position relative to field
    const currentLeft = qRect.left - fieldRect.left;
    const currentTop = qRect.top - fieldRect.top;

    // Apply absolute positions and remove transform
    quadrat.style.transform = 'none';
    quadrat.style.left = `${currentLeft}px`;
    quadrat.style.top = `${currentTop}px`;

    // Setup Record Button
    const btnRecord = document.getElementById('btn-record');
    if (btnRecord) {
        btnRecord.addEventListener('click', () => {
            const counts = analyzeQuadrat();
            addMeasurement(counts);
        });
    }

    // Touch Events Support
    quadrat.addEventListener('touchstart', onTouchStart, { passive: false });

    // Handle Window Resize - Keep quadrat centered to avoid losing it
    window.addEventListener('resize', centerQuadrat);
}

function centerQuadrat() {
    const fieldRect = ecosystem.getBoundingClientRect();
    const qRect = quadrat.getBoundingClientRect();

    // Calculate center position relative to field
    // Note: qRect.width might change due to responsive CSS (25%)
    // But offsetWidth is reliable.
    const centerX = (fieldRect.width - quadrat.offsetWidth) / 2;
    const centerY = (fieldRect.height - quadrat.offsetHeight) / 2;

    quadrat.style.left = `${centerX}px`;
    quadrat.style.top = `${centerY}px`;
}

let dragOffsetX = 0;
let dragOffsetY = 0;

// --- Mouse Events ---
function onMouseDown(e) {
    e.preventDefault(); // Prevent default to stop text selection or browser drag behavior
    if (e.target.closest('.quadrat-label')) {
        // Optional: Handle label specific clicks
    }
    startDrag(e.clientX, e.clientY);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(e) {
    moveDrag(e.clientX, e.clientY);
}

function onMouseUp() {
    endDrag();
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
}

// --- Touch Events ---
function onTouchStart(e) {
    if (e.touches.length > 1) return; // Ignore multi-touch
    e.preventDefault(); // Prevent scrolling

    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
}

function onTouchMove(e) {
    e.preventDefault(); // Stop scrolling
    const touch = e.touches[0];
    moveDrag(touch.clientX, touch.clientY);
}

function onTouchEnd() {
    endDrag();
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
}

// --- Common Drag Logic ---

function startDrag(clientX, clientY) {
    isDragging = true;

    // Calculate offset from the element's top-left
    const rect = quadrat.getBoundingClientRect();
    dragOffsetX = clientX - rect.left;
    dragOffsetY = clientY - rect.top;

    quadrat.style.cursor = 'grabbing';
}

function moveDrag(clientX, clientY) {
    if (!isDragging) return;

    if (animationFrameId) return;

    animationFrameId = requestAnimationFrame(() => {
        const fieldRect = ecosystem.getBoundingClientRect();

        // Desired Left/Top relative to field
        let newX = clientX - dragOffsetX - fieldRect.left;
        let newY = clientY - dragOffsetY - fieldRect.top;

        // Boundary Check (Clamping)
        const qW = quadrat.offsetWidth;
        const qH = quadrat.offsetHeight;

        newX = Math.max(0, Math.min(newX, fieldRect.width - qW));
        newY = Math.max(0, Math.min(newY, fieldRect.height - qH));

        quadrat.style.left = `${newX}px`;
        quadrat.style.top = `${newY}px`;

        animationFrameId = null;
    });
}

function endDrag() {
    isDragging = false;
    quadrat.style.cursor = 'grab';
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

// --- Advanced Data Logic ---

function analyzeQuadrat() {
    // We need to check which plants are inside the quadrat.
    // Instead of getBoundingClientRect for every plant (slow), 
    // we calculate based on Relative Positions (%) if possible?
    // No, checking absolute pixels is safer because quadrat is px based.

    const qRect = quadrat.getBoundingClientRect();
    const plants = ecosystem.querySelectorAll('.plant');

    let counts = { dandelion: 0, clover: 0, foxtail: 0 };

    // Reduce reflows: batch read?
    // Actually, simple bounding client check is fine for < 100 items.

    plants.forEach(plant => {
        const pRect = plant.getBoundingClientRect();
        const pCx = pRect.left + pRect.width / 2;
        const pCy = pRect.top + pRect.height / 2;

        if (pCx >= qRect.left && pCx <= qRect.right &&
            pCy >= qRect.top && pCy <= qRect.bottom) {

            if (plant.classList.contains('dandelion')) counts.dandelion++;
            else if (plant.classList.contains('clover')) counts.clover++;
            else if (plant.classList.contains('foxtail')) counts.foxtail++;
        }
    });

    return counts;
}

function setupControls() {
    btnGenerate.addEventListener('click', generateEcosystem);

    btnResetData.addEventListener('click', () => {
        measurements = [];
        updateTable();
    });
}

function addMeasurement(counts) {
    measurements.push(counts);
    updateTable();
}

function updateTable() {
    // 1. Update List
    dataBody.innerHTML = '';
    let sums = { dandelion: 0, clover: 0, foxtail: 0 };

    measurements.forEach((m, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}회</td>
            <td>${m.dandelion}</td>
            <td>${m.clover}</td>
            <td>${m.foxtail}</td>
        `;
        dataBody.appendChild(row);

        sums.dandelion += m.dandelion;
        sums.clover += m.clover;
        sums.foxtail += m.foxtail;
    });

    // 2. Calculate Stats
    const n = measurements.length;
    if (n === 0) {
        resetStats();
        return;
    }

    // Averages
    avgEls.dandelion.textContent = (sums.dandelion / n).toFixed(1);
    avgEls.clover.textContent = (sums.clover / n).toFixed(1);
    avgEls.foxtail.textContent = (sums.foxtail / n).toFixed(1);

    // --- Complex Calculations ---

    const speciesKeys = ['dandelion', 'clover', 'foxtail'];
    const results = {};

    // A. Density (D) = Total Count / Total Area
    // Total Area = n * 1m^2
    const totalArea = n * QUADRAT_SIZE_M2;
    let totalDensity = 0;

    // B. Frequency (F) = Number of quadrats in which species occurred / Total number of quadrats
    let freqCounts = { dandelion: 0, clover: 0, foxtail: 0 };
    measurements.forEach(m => {
        if (m.dandelion > 0) freqCounts.dandelion++;
        if (m.clover > 0) freqCounts.clover++;
        if (m.foxtail > 0) freqCounts.foxtail++;
    });
    let totalFreq = 0;

    // C. Coverage (C) = (Total Count * Area per individual) / Total Area
    // Simplified model: We sum arbitrary area units.
    let totalCoverage = 0;

    speciesKeys.forEach(key => {
        // Density
        const density = sums[key] / totalArea;

        // Frequency
        const frequency = freqCounts[key] / n;

        // Coverage (Avg coverage per m2)
        // Total Area Covered = Count * UnitArea
        // Coverage = Total Area Covered / Total Analyzed Area (n)
        const unitArea = PLANT_SPECIES[key].coverageArea; // arbitrary units
        // To make it look like a real coverage (0-1), let's scale it down.
        // Say max coverage is if 50 dandelions fit in 1m2 -> 50 * 4 = 200 units = 100%
        // Let's just output raw "Coverage Index" or normalize?
        // Let's use the raw SUM of coverage units / Total Quadrats Area.
        const coverage = (sums[key] * unitArea) / n; // Average coverage units per quadrat

        results[key] = {
            density: density,
            frequency: frequency,
            coverage: coverage
        };

        totalDensity += density;
        totalFreq += frequency;
        totalCoverage += coverage;
    });

    // Calculate Relative Values & Importance Value
    speciesKeys.forEach(key => {
        const r = results[key];

        // Relative Density (RD)
        const rd = totalDensity > 0 ? (r.density / totalDensity) * 100 : 0;

        // Relative Frequency (RF)
        const rf = totalFreq > 0 ? (r.frequency / totalFreq) * 100 : 0;

        // Relative Coverage (RC)
        const rc = totalCoverage > 0 ? (r.coverage / totalCoverage) * 100 : 0;

        // Importance Value (IV) = RD + RF + RC
        const iv = rd + rf + rc;

        // Update DOM
        // Shorten keys for DOM map: dandelion -> dan
        const shortKey = key.substr(0, 3);

        els.den[shortKey].textContent = r.density.toFixed(2);
        els.rd[shortKey].textContent = rd.toFixed(1) + '%';

        els.freq[shortKey].textContent = r.frequency.toFixed(2);
        els.rf[shortKey].textContent = rf.toFixed(1) + '%';

        els.cov[shortKey].textContent = r.coverage.toFixed(2);
        els.rc[shortKey].textContent = rc.toFixed(1) + '%';

        els.iv[shortKey].textContent = iv.toFixed(1);
    });
}

function resetStats() {
    ['dandelion', 'clover', 'foxtail'].forEach(key => {
        const k = key.substr(0, 3);
        els.den[k].textContent = '0';
        els.rd[k].textContent = '0%';
        els.freq[k].textContent = '0';
        els.rf[k].textContent = '0%';
        els.cov[k].textContent = '0';
        els.rc[k].textContent = '0%';
        els.iv[k].textContent = '0';

        avgEls[key].textContent = '-';
    });
}

// Start
init();
