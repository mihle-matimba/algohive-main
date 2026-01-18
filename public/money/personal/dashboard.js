import { supabase } from "/js/supabase.js";

let currentCard = 1;
const loans = [
  {
    id: 'LOAN-2024-001',
    amount: 'R 45,000.00',
    monthly: 'R 3,750.00',
    rate: '8.5%',
    term: '12 months',
    next: 'Dec 15, 2024',
    progress: 50
  },
  {
    id: 'LOAN-2024-002',
    amount: 'R 85,500.00',
    monthly: 'R 5,125.00',
    rate: '7.2%',
    term: '24 months',
    next: 'Dec 20, 2024',
    progress: 68
  },
  {
    id: 'LOAN-2024-003',
    amount: 'R 125,000.00',
    monthly: 'R 8,950.00',
    rate: '6.8%',
    term: '18 months',
    next: 'Dec 25, 2024',
    progress: 42
  }
];
let isAnimating = false;

function switchCard() {
  if (isAnimating) return;
  isAnimating = true;

  const mainCard = document.getElementById('mainCard');

  mainCard.classList.add('swapping');

  setTimeout(() => {
    currentCard = (currentCard % 3) + 1;
    const loan = loans[currentCard - 1];
    document.getElementById('loanId').textContent = loan.id;
    document.getElementById('loanAmount').textContent = loan.amount;
    document.getElementById('monthlyPayment').textContent = loan.monthly;
    document.getElementById('interestRate').textContent = loan.rate;
    document.getElementById('term').textContent = loan.term;
    document.getElementById('nextPayment').textContent = loan.next;

    const nextBehindIndex = currentCard % loans.length;
    const nextLoan = loans[nextBehindIndex];
    document.getElementById('behindId').textContent = nextLoan.id;
    document.getElementById('behindAmount').textContent = nextLoan.amount;
    document.getElementById('behindMonthly').textContent = nextLoan.monthly;
    document.getElementById('behindRate').textContent = nextLoan.rate;
    document.getElementById('behindTerm').textContent = nextLoan.term;
    document.getElementById('behindNext').textContent = nextLoan.next;

    const progressFill = document.getElementById('loanProgress');
    const progressLabel = document.getElementById('loanProgressLabel');
    if (progressFill && progressLabel) {
      const pct = Math.max(0, Math.min(100, loan.progress));
      progressFill.style.width = `${pct}%`;
      progressLabel.textContent = `${pct}%`;
    }

    document.getElementById('dot1').classList.toggle('active', currentCard === 1);
    document.getElementById('dot2').classList.toggle('active', currentCard === 2);
    document.getElementById('dot3').classList.toggle('active', currentCard === 3);

    mainCard.style.transition = 'none';
    mainCard.style.transform = 'translateY(50%) scale(0.98)';
    mainCard.style.opacity = '0';

    setTimeout(() => {
      mainCard.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
      mainCard.classList.remove('swapping');
      mainCard.style.transform = '';
      mainCard.style.opacity = '';

      setTimeout(() => {
        isAnimating = false;
      }, 400);
    }, 50);
  }, 400);
}

const loanFilters = document.querySelectorAll('[data-filter]');
const borrowedDue = document.getElementById('borrowedDue');
const repaidNext = document.getElementById('repaidNext');
const outstandingNext = document.getElementById('outstandingNext');

function updateLoanFilter(value) {
  loanFilters.forEach((wrapper) => {
    const trigger = wrapper.querySelector('[data-filter-trigger]');
    const options = wrapper.querySelectorAll('[data-value]');
    if (trigger) {
      trigger.textContent = value === 'current' ? 'Current active loan' : 'Overall';
    }
    options.forEach((option) => {
      option.classList.toggle('is-selected', option.dataset.value === value);
    });
  });
  if (borrowedDue) {
    borrowedDue.classList.toggle('hidden', value !== 'current');
  }
  if (repaidNext) {
    repaidNext.classList.toggle('hidden', value !== 'current');
  }
  if (outstandingNext) {
    outstandingNext.classList.toggle('hidden', value !== 'current');
  }
}

function closeAllFilters() {
  loanFilters.forEach((wrapper) => wrapper.classList.remove('open'));
}

loanFilters.forEach((wrapper) => {
  const trigger = wrapper.querySelector('[data-filter-trigger]');
  const options = wrapper.querySelectorAll('[data-value]');

  trigger?.addEventListener('click', (event) => {
    event.stopPropagation();
    const isOpen = wrapper.classList.contains('open');
    closeAllFilters();
    wrapper.classList.toggle('open', !isOpen);
  });

  options.forEach((option) => {
    option.addEventListener('click', (event) => {
      event.stopPropagation();
      updateLoanFilter(option.dataset.value || 'overall');
      closeAllFilters();
    });
  });
});

document.addEventListener('click', closeAllFilters);

updateLoanFilter('overall');

const profileTrigger = document.getElementById('profile-trigger');
const profileMenu = document.getElementById('profile-menu');
const geopayToggle = document.getElementById('geopay-toggle');
const toggleTrack = document.getElementById('toggle-track');
const menuBtn = document.getElementById('menu-btn');
let geopayEnabled = false;

profileTrigger?.addEventListener('click', (event) => {
  event.stopPropagation();
  profileMenu?.classList.toggle('open');
});

document.addEventListener('click', (event) => {
  if (profileMenu && profileTrigger) {
    if (!profileMenu.contains(event.target) && !profileTrigger.contains(event.target)) {
      profileMenu.classList.remove('open');
    }
  }
});

geopayToggle?.addEventListener('click', (event) => {
  event.stopPropagation();
  geopayEnabled = !geopayEnabled;
  toggleTrack?.classList.toggle('active', geopayEnabled);
});

menuBtn?.addEventListener('click', () => {
  menuBtn.classList.toggle('active');
});

function getScoreColour(value) {
  const colours = {
    20:'#4b22d6', 19:'#5530e0', 18:'#5f3dea', 17:'#6a4af2',
    16:'#7457f7', 15:'#7f63fb', 14:'#8a70ff', 13:'#947bff',
    12:'#9f87ff', 11:'#aa93ff', 10:'#b49eff', 9:'#bea9ff',
    8:'#c9b4ff', 7:'#d3bfff', 6:'#ddc9ff', 5:'#e6d3ff',
    4:'#eddcff', 3:'#f2e6ff', 2:'#f6efff', 1:'#faf7ff',
    0:'#ffffff'
  };
  const length = Object.keys(colours).length;
  const max = 100;
  const index = Math.floor(value / (max / length));
  return colours[index] !== undefined ? colours[index] : colours[20];
}

function drawScoreGauge(value) {
  if (!window.d3) return;
  const tau = 2 * Math.PI;
  const radius = 100;
  const perc = value / 100;

  const arc = d3.arc()
    .innerRadius(radius - 10)
    .outerRadius(radius)
    .startAngle(0);

  const ring1 = d3.arc()
    .innerRadius(radius + 18)
    .outerRadius(radius + 20)
    .startAngle(0);

  const ring2 = d3.arc()
    .innerRadius(radius - 1)
    .outerRadius(radius + 11)
    .startAngle(0);

  const width = 46 + radius * 2;
  const height = 46 + radius * 2;

  const svg = d3.select('#score-svg-chart')
    .attr('width', width)
    .attr('height', height);

  const g = svg.append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  const circle = svg.append('circle')
    .style('fill', getScoreColour(value))
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', 8);

  g.append('path')
    .datum({ endAngle: tau })
    .style('fill', '#f9f9f9')
    .attr('d', arc);

  g.append('path')
    .datum({ endAngle: tau })
    .style('stroke-opacity', 0.1)
    .style('opacity', 0.1)
    .style('fill', '#ffffff')
    .attr('d', ring2);

  g.append('path')
    .datum({ endAngle: tau })
    .style('stroke-opacity', 0.3)
    .style('opacity', 0.3)
    .style('fill', '#ffffff')
    .attr('d', ring1);

  const foreground = g.append('path')
    .datum({ endAngle: 0.1 * tau })
    .style('fill', getScoreColour(value))
    .attr('d', arc);

  const scoreDiv = d3.select('#score-middle');

  foreground.transition()
    .duration(2000)
    .attrTween('d', function(d) {
      const interpolate = d3.interpolate(d.endAngle, perc * tau);
      return function(t) {
        d.endAngle = interpolate(t);
        const path = arc(d);
        const curScore = perc * t;
        const score = curScore * 100;
        scoreDiv.html(parseInt(score));
        scoreDiv.style('color', getScoreColour(parseInt(score)));

        const cx = radius + Math.sin(d.endAngle) * 0.97 * radius;
        const cy = radius - Math.cos(d.endAngle) * 0.97 * radius;
        circle.attr('cx', cx + 23).attr('cy', cy + 23);

        return path;
      };
    });
}

function drawRepaidChart() {
  const canvas = document.getElementById('repaid-canvas');
  const label = document.getElementById('repaid-label');
  const prevBtn = document.getElementById('repaid-prev');
  const nextBtn = document.getElementById('repaid-next');
  if (!canvas || !label || !prevBtn || !nextBtn) return;

  const ctx = canvas.getContext('2d');
  const parent = canvas.parentElement;
  const cw = canvas.width = parent.clientWidth;
  const ch = canvas.height = parent.clientHeight;

  const data = {
    Jan: 10,
    Feb: 39.9,
    Mar: 17,
    Apr: 30,
    May: 5.3,
    Jun: 38.4,
    Jul: 15.7,
    Aug: 9.0,
    Sep: 25.5,
    Oct: 42.1,
    Nov: 18.3,
    Dec: 33.7
  };

  const allLabels = Object.keys(data);
  const allValues = Object.values(data);
  const windowSize = 6;
  let windowStart = 0;
  let isAnimating = false;

  const gradient = ctx.createLinearGradient(0, 0, 0, ch);
  gradient.addColorStop(0, 'hsla(263,85%,60%,0.5)');
  gradient.addColorStop(1, 'hsla(263,85%,60%,0)');

  function render(direction = 'right') {
    if (isAnimating) return;
    isAnimating = true;

    canvas.classList.remove('repaid-slide-in-right', 'repaid-slide-in-left');
    canvas.offsetHeight;
    canvas.classList.add(direction === 'right' ? 'repaid-slide-in-right' : 'repaid-slide-in-left');

    const labels = allLabels.slice(windowStart, windowStart + windowSize);
    const values = allValues.slice(windowStart, windowStart + windowSize);
    const vData = 3;
    const padding = 22;
    const chartHeight = ch - 2 * padding;
    const chartWidth = cw - 2 * padding;
    const max = Math.ceil(Math.max(...values) * 1.15 / 10) * 10;
    const min = Math.floor(Math.min(...values) / 10) * 10;
    const aStepValue = (max - min) / vData || 1;
    const verticalUnit = (chartHeight - 20) / aStepValue;
    const bStep = chartWidth / (labels.length + 1);
    const t = 1 / 7;
    const speed = 3;

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#666';
    ctx.fillStyle = '#333';
    ctx.font = '11px "Segoe UI", sans-serif';

    const A = { x: padding, y: padding };
    const B = { x: padding, y: padding + chartHeight };
    const C = { x: padding + chartWidth, y: padding + chartHeight };

    const a = [];
    for (let i = 0; i <= vData; i++) {
      a[i] = {
        x: A.x,
        y: A.y + 10 + i * ((chartHeight - 20) / vData),
        val: max - i * aStepValue
      };
    }

    const b = [];
    for (let i = 0; i < labels.length; i++) {
      b[i] = {
        x: B.x + bStep * (i + 1),
        y: B.y,
        val: labels[i]
      };
    }

    const dots = b.map((point, i) => ({
      x: point.x,
      y: Math.max(A.y + 12, point.y - (values[i] - min) * verticalUnit - 10),
      val: values[i],
      label: labels[i]
    }));

    const flat = dots.map((point) => ({ x: point.x, y: B.y - 10 }));

    function controlPoints(p) {
      const pc = [];
      for (let i = 1; i < p.length - 1; i++) {
        const dx = p[i - 1].x - p[i + 1].x;
        const dy = p[i - 1].y - p[i + 1].y;
        pc[i] = [
          { x: p[i].x - dx * t, y: p[i].y - dy * t },
          { x: p[i].x + dx * t, y: p[i].y + dy * t }
        ];
      }
      return pc;
    }

    function drawCurve(p) {
      const pc = controlPoints(p);
      ctx.beginPath();
      ctx.moveTo(p[0].x, p[0].y);
      if (p.length > 1) {
        ctx.quadraticCurveTo(pc[1][1].x, pc[1][1].y, p[1].x, p[1].y);
      }

      if (p.length > 2) {
        for (let i = 1; i < p.length - 2; i++) {
          ctx.bezierCurveTo(pc[i][0].x, pc[i][0].y, pc[i + 1][1].x, pc[i + 1][1].y, p[i + 1].x, p[i + 1].y);
        }
        const n = p.length - 1;
        ctx.quadraticCurveTo(pc[n - 1][0].x, pc[n - 1][0].y, p[n].x, p[n].y);
      }

      ctx.stroke();
      ctx.save();
      ctx.lineTo(p[p.length - 1].x, B.y - 10);
      ctx.lineTo(p[0].x, B.y - 10);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();
    }

    let frames = 0;
    function animate() {
      frames += speed;
      ctx.clearRect(0, 0, cw, ch);

      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.lineTo(C.x, C.y);
      ctx.strokeStyle = '#e5e7eb';
      ctx.stroke();

      ctx.fillStyle = '#6b7280';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      a.forEach((tick) => {
        ctx.beginPath();
        ctx.moveTo(tick.x - 3, tick.y);
        ctx.lineTo(tick.x + 3, tick.y);
        ctx.stroke();
        ctx.fillText(Math.round(tick.val), tick.x - 6, tick.y);
      });

      ctx.textAlign = 'center';
      ctx.textBaseline = 'hanging';
      b.forEach((tick) => {
        ctx.beginPath();
        ctx.moveTo(tick.x, tick.y - 3);
        ctx.lineTo(tick.x, tick.y + 3);
        ctx.stroke();
        ctx.fillText(tick.val, tick.x, tick.y + 6);
      });

      for (let i = 0; i < flat.length; i++) {
        if (flat[i].y > dots[i].y) flat[i].y -= speed;
      }

      ctx.strokeStyle = '#7c3aed';
      drawCurve(flat);

      ctx.fillStyle = '#7c3aed';
      flat.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      if (frames < (max - min) * verticalUnit) {
        requestAnimationFrame(animate);
      } else {
        isAnimating = false;
      }
    }

    animate();

    canvas.onmousemove = (e) => {
      label.style.display = 'none';
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      for (let i = 0; i < dots.length; i++) {
        const dx = mx - dots[i].x;
        const dy = my - dots[i].y;
        if (Math.sqrt(dx * dx + dy * dy) < 10) {
          label.style.display = 'block';
          label.style.left = `${mx + 8}px`;
          label.style.top = `${my + 8}px`;
          label.innerHTML = `<strong>${dots[i].label}</strong>: R${dots[i].val.toFixed(1)}K`;
          break;
        }
      }
    };

    prevBtn.disabled = windowStart === 0;
    nextBtn.disabled = windowStart + windowSize >= allLabels.length;
  }

  prevBtn.addEventListener('click', () => {
    if (windowStart === 0) return;
    windowStart = Math.max(0, windowStart - windowSize);
    render('left');
  });

  nextBtn.addEventListener('click', () => {
    if (windowStart + windowSize >= allLabels.length) return;
    windowStart = Math.min(allLabels.length - windowSize, windowStart + windowSize);
    render('right');
  });

  render('right');
}

window.addEventListener('DOMContentLoaded', () => {
  if (window.lucide && window.lucide.createIcons) {
    window.lucide.createIcons();
  }

  drawScoreGauge(82);
  drawRepaidChart();

  loadRecentApplications();
});

const pendingCount = document.getElementById('pending-applications-count');
const recentApplicationsList = document.getElementById('recent-applications-list');
const recentApplicationsEmpty = document.getElementById('recent-applications-empty');

function setRecentApplicationsEmpty(message) {
  if (!recentApplicationsEmpty) return;
  recentApplicationsEmpty.textContent = message;
  recentApplicationsEmpty.classList.remove('hidden');
}

function formatAmount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'R 0';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0
  }).format(numeric);
}

function formatApplicationId(value, fallback) {
  if (value) return String(value);
  if (!fallback) return 'Application';
  const id = String(fallback);
  return id.length > 8 ? `Application ${id.slice(-6)}` : `Application ${id}`;
}

function formatStatus(value) {
  if (!value) return 'In progress';
  return value.replace(/_/g, ' ');
}

function renderRecentApplications(applications = []) {
  if (!recentApplicationsList) return;
  recentApplicationsList.innerHTML = '';

  if (!applications.length) {
    setRecentApplicationsEmpty('No active applications yet.');
    return;
  }

  if (recentApplicationsEmpty) {
    recentApplicationsEmpty.classList.add('hidden');
  }

  applications.forEach((app) => {
    const amountValue = app.principal_amount ?? app.amount ?? 0;
    const amountLabel = formatAmount(amountValue);
    const statusLabel = formatStatus(app.status);

    const row = document.createElement('div');
    row.className = 'flex items-center gap-3 p-3 bg-gray-50 rounded-2xl';
    row.innerHTML = `
      <span class="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-500">●</span>
      <div class="min-w-0">
        <div class="text-sm font-medium truncate">${formatApplicationId(app.application_id, app.id)}</div>
        <div class="text-xs text-gray-400">${statusLabel}</div>
      </div>
      <div class="ml-auto text-xs text-gray-500">${amountLabel}</div>
    `;
    recentApplicationsList.appendChild(row);
  });
}

async function loadRecentApplications() {
  if (!recentApplicationsList) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setRecentApplicationsEmpty('Sign in to see your active applications.');
      return;
    }

    let query = supabase
      .from('loan_application')
      .select('id,application_id,status,principal_amount,amount,created_at,step_number')
      .order('created_at', { ascending: false })
      .limit(3);

    // No user_id column in schema; returning latest applications.

    const { data, error } = await query;
    if (error) {
      console.error('Recent applications fetch error:', error.message || error);
      renderRecentApplications([]);
      return;
    }

    const active = (data || []).filter((app) => !['completed', 'rejected', 'cancelled'].includes(app.status));
    renderRecentApplications(active);

    if (pendingCount) {
      pendingCount.textContent = String(active.length);
    }
  } catch (err) {
    console.error('Recent applications fetch error:', err);
    renderRecentApplications([]);
  }
}
