const ledgerData = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    currency: "USD",
    totalQuantity: 4500,
    markPrice: 172.45,
    logo: "/media/logos/apple.svg",
    clients: [
      {
        name: "Client Alpha",
        accountNumber: "AC-482910",
        quantity: 1500,
        avgPrice: 170.1
      },
      {
        name: "Client Beta",
        accountNumber: "AC-385204",
        quantity: 1200,
        avgPrice: 168.4
      },
      {
        name: "Client Gamma",
        accountNumber: "AC-574839",
        quantity: 900,
        avgPrice: 175.9
      },
      {
        name: "Client Delta",
        accountNumber: "AC-900421",
        quantity: 900,
        avgPrice: 174.3
      }
    ]
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    currency: "USD",
    totalQuantity: 2800,
    markPrice: 238.17,
    logo: "/media/logos/tesla.svg",
    clients: [
      {
        name: "Client Alpha",
        accountNumber: "AC-482910",
        quantity: 500,
        avgPrice: 220.25
      },
      {
        name: "Client Epsilon",
        accountNumber: "AC-118745",
        quantity: 1350,
        avgPrice: 242.1
      },
      {
        name: "Client Zeta",
        accountNumber: "AC-775201",
        quantity: 950,
        avgPrice: 240.6
      }
    ]
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    currency: "USD",
    totalQuantity: 5200,
    markPrice: 328.34,
    logo: "/media/logos/microsoft.svg",
    clients: [
      {
        name: "Client Beta",
        accountNumber: "AC-385204",
        quantity: 1800,
        avgPrice: 315.7
      },
      {
        name: "Client Theta",
        accountNumber: "AC-663412",
        quantity: 2200,
        avgPrice: 330.9
      },
      {
        name: "Client Omega",
        accountNumber: "AC-994002",
        quantity: 1200,
        avgPrice: 325.1
      }
    ]
  },
  {
    symbol: "XAU",
    name: "Gold Bullion Trust",
    currency: "USD",
    totalQuantity: 965,
    markPrice: 1985.65,
    logo: "/media/logos/gold.svg",
    clients: [
      {
        name: "Client Gamma",
        accountNumber: "AC-574839",
        quantity: 300,
        avgPrice: 1950.5
      },
      {
        name: "Client Lambda",
        accountNumber: "AC-222410",
        quantity: 415,
        avgPrice: 1989.7
      },
      {
        name: "Client Sigma",
        accountNumber: "AC-471120",
        quantity: 250,
        avgPrice: 2005.1
      }
    ]
  }
];

const palette = ["#7e8d52", "#2f4858", "#aa7d4f", "#5c6ac4", "#c94c4c", "#3a9679"]; 

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0
});

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short"
});

const currencyFormatters = new Map();

function formatCurrency(value, currency) {
  if (!currencyFormatters.has(currency)) {
    currencyFormatters.set(
      currency,
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 2
      })
    );
  }

  return currencyFormatters.get(currency).format(value);
}

function renderSummary(data) {
  const summaryContainer = document.getElementById("portfolio-summary");
  if (!summaryContainer) return;
  summaryContainer.innerHTML = "";
  const portfolioValue = data.reduce(
    (acc, instrument) => acc + instrument.totalQuantity * instrument.markPrice,
    0
  );

  const allClients = new Set();
  const accountNumbers = new Set();

  data.forEach((instrument) => {
    instrument.clients.forEach((client) => {
      allClients.add(client.name);
      accountNumbers.add(client.accountNumber);
    });
  });

  const largestHolding = data.reduce((prev, current) => {
    const prevValue = prev.totalQuantity * prev.markPrice;
    const currentValue = current.totalQuantity * current.markPrice;
    return currentValue > prevValue ? current : prev;
  }, data[0]);

  const topClientExposure = [...allClients].map((clientName) => {
    const total = data.reduce((acc, instrument) => {
      const client = instrument.clients.find((c) => c.name === clientName);
      if (!client) return acc;
      return acc + client.quantity * instrument.markPrice;
    }, 0);
    return { clientName, total };
  });

  topClientExposure.sort((a, b) => b.total - a.total);
  const topClient = topClientExposure[0];

  const defaultCurrency = data[0]?.currency ?? "USD";

  const policyTargets = {
    portfolio: 5000000,
    instruments: 10,
    clients: 12,
    accounts: 18
  };

  const iconMarkup = {
    portfolio: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 9.75h16.5m-16.5 6h16.5m-16.5-3h16.5M8.25 6.75V4.5A1.5 1.5 0 0 1 9.75 3h4.5a1.5 1.5 0 0 1 1.5 1.5v2.25" />
      </svg>
    `,
    instruments: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.5l6.75-6.75L12 9l5.25-5.25L21 7.5m-4.5 9l-3-3-4.5 4.5m6.75-1.5h2.25V21h-3.75v-3.75h1.5z" />
      </svg>
    `,
    clients: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 11.25a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6.75 7.5a6.75 6.75 0 1 0-13.5 0v.75h13.5v-.75Z" />
      </svg>
    `,
    accounts: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.375 19.5h17.25m-16.5-3.75v-11.25h15.75v11.25m-13.5-6h3m-3 3h3" />
      </svg>
    `,
    largest: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 3v18l7.5-4.5L18 21V3" />
      </svg>
    `,
    client: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a6.75 6.75 0 0 1 13.5 0V21H4.5v-.75Z" />
      </svg>
    `
  };

  const summaryCards = [
    {
      key: "portfolio",
      title: "Total Market Value",
      value: formatCurrency(portfolioValue, defaultCurrency),
      helper: "Across all custodial instruments",
      progress: Math.min((portfolioValue / policyTargets.portfolio) * 100, 100),
      progressColor: "var(--olive)",
      delta: "+2.4%",
      deltaLabel: "vs. prior close"
    },
    {
      key: "instruments",
      title: "Tracked Instruments",
      value: data.length,
      helper: "Live positions monitored",
      progress: Math.min((data.length / policyTargets.instruments) * 100, 100),
      progressColor: "var(--accent)",
      delta: `${compactNumberFormatter.format(data.length)} coverage`,
      deltaLabel: "target 10"
    },
    {
      key: "clients",
      title: "Active Clients",
      value: allClients.size,
      helper: `${compactNumberFormatter.format(
        allClients.size
      )} counterparties allocated`,
      progress: Math.min((allClients.size / policyTargets.clients) * 100, 100),
      progressColor: "#5c6ac4"
    },
    {
      key: "accounts",
      title: "Accounts Tracked",
      value: accountNumbers.size,
      helper: "Distinct custody accounts",
      progress: Math.min((accountNumbers.size / policyTargets.accounts) * 100, 100),
      progressColor: "#aa7d4f"
    },
    {
      key: "largest",
      title: "Largest Position",
      value: `${largestHolding.symbol}`,
      helper: `${formatCurrency(
        largestHolding.totalQuantity * largestHolding.markPrice,
        largestHolding.currency
      )} held total`
    }
  ];

  if (topClient) {
    summaryCards.push({
      key: "client",
      title: "Top Client Exposure",
      value: topClient.clientName,
      helper: `${formatCurrency(topClient.total, defaultCurrency)} total market value`
    });
  }

  summaryCards.forEach((card) => {
    const div = document.createElement("div");
    div.className = "summary-card";

    div.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">${card.title}</p>
          <p class="mt-2 text-2xl font-semibold text-[var(--ink)]">${card.value}</p>
        </div>
        <span class="summary-icon">${iconMarkup[card.key] ?? iconMarkup.portfolio}</span>
      </div>
      <p class="text-sm text-[var(--muted)]">${card.helper}</p>
      ${
        card.delta
          ? `<p class="text-xs font-medium text-[var(--muted)]"><span class="text-[var(--ink)]">${card.delta}</span> ${
              card.deltaLabel ?? ""
            }</p>`
          : ""
      }
      ${
        typeof card.progress === "number"
          ? `<div class="progress-track"><span class="progress-fill" style="background:${card.progressColor}; width:${card.progress}%"></span></div>`
          : ""
      }
    `;

    summaryContainer.appendChild(div);
  });
}

function renderLedger(data) {
  const container = document.getElementById("ledger-container");
  const template = document.getElementById("instrument-template");
  if (!container || !template) return;
  container.innerHTML = "";

  data.forEach((instrument) => {
    const clone = template.content.cloneNode(true);

    const instrumentName = `${instrument.symbol} · ${instrument.name}`;
    const totalValue = instrument.totalQuantity * instrument.markPrice;
    const weightedAveragePrice =
      instrument.clients.reduce(
        (acc, client) => acc + client.avgPrice * client.quantity,
        0
      ) / instrument.totalQuantity;

    clone.querySelector('[data-role="instrument-name"]').textContent = instrumentName;
    clone.querySelector('[data-role="total-quantity"]').textContent = `${numberFormatter.format(
      instrument.totalQuantity
    )} units`;
    clone.querySelector('[data-role="total-value"]').textContent = formatCurrency(
      totalValue,
      instrument.currency
    );
    clone.querySelector('[data-role="average-price"]').textContent = formatCurrency(
      weightedAveragePrice,
      instrument.currency
    );
    clone.querySelector('[data-role="currency"]').textContent = instrument.currency;

    const logoElement = clone.querySelector('[data-role="instrument-logo"]');
    if (logoElement) {
      logoElement.src = instrument.logo;
      logoElement.alt = `${instrument.name} logo`;
    }

    const tbody = clone.querySelector('[data-role="client-rows"]');

    instrument.clients.forEach((client) => {
      const shareOfInstrument = (client.quantity / instrument.totalQuantity) * 100;
      const clientValue = client.quantity * instrument.markPrice;

      const row = document.createElement("tr");
      row.className = "ledger-row transition-colors";
      row.innerHTML = `
        <td class="px-6 py-4 text-sm font-medium text-[var(--ink)]">${client.name}</td>
        <td class="px-6 py-4 text-sm text-[var(--muted)]">${client.accountNumber ?? "—"}</td>
        <td class="px-6 py-4 text-sm text-[var(--muted)]">${numberFormatter.format(client.quantity)}</td>
        <td class="px-6 py-4 text-sm text-[var(--muted)]">${shareOfInstrument.toFixed(1)}%</td>
        <td class="px-6 py-4 text-sm text-[var(--muted)]">${formatCurrency(client.avgPrice, instrument.currency)}</td>
        <td class="px-6 py-4 text-sm text-[var(--muted)]">${formatCurrency(clientValue, instrument.currency)}</td>
      `;
      tbody.appendChild(row);
    });

    container.appendChild(clone);
  });
}

function renderAnalytics(data) {
  const tableBody = document.querySelector('[data-role="composition-table-body"]');
  const donutContainer = document.querySelector('[data-role="donut-chart"]');
  const donutLegend = document.querySelector('[data-role="donut-legend"]');
  const policyChart = document.querySelector('[data-role="policy-chart"]');
  const benchmarkChart = document.querySelector('[data-role="benchmark-chart"]');

  if (!tableBody || !donutContainer || !donutLegend || !policyChart || !benchmarkChart) {
    return;
  }

  const composition = data.map((instrument, index) => {
    const totalValue = instrument.totalQuantity * instrument.markPrice;
    const bookValue = instrument.clients.reduce(
      (acc, client) => acc + client.avgPrice * client.quantity,
      0
    );

    return {
      label: `${instrument.symbol} · ${instrument.name}`,
      par: instrument.totalQuantity,
      marketValue: totalValue,
      bookValue,
      currency: instrument.currency,
      color: palette[index % palette.length]
    };
  });

  tableBody.innerHTML = "";
  composition.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="px-6 py-3 font-medium text-[var(--ink)]">${row.label}</td>
      <td class="px-6 py-3 text-[var(--muted)]">${numberFormatter.format(row.par)}</td>
      <td class="px-6 py-3 text-[var(--muted)]">${formatCurrency(row.marketValue, row.currency)}</td>
      <td class="px-6 py-3 text-[var(--muted)]">${formatCurrency(row.bookValue, row.currency)}</td>
    `;
    tableBody.appendChild(tr);
  });

  const totalMarketValue = composition.reduce((acc, row) => acc + row.marketValue, 0);
  let cumulativeDash = 0;

  donutContainer.innerHTML = "";
  donutLegend.innerHTML = "";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 42 42");
  svg.classList.add("h-full", "w-full", "max-h-full", "max-w-full");

  const backgroundCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  backgroundCircle.setAttribute("cx", "21");
  backgroundCircle.setAttribute("cy", "21");
  backgroundCircle.setAttribute("r", "15.915");
  backgroundCircle.setAttribute("fill", "transparent");
  backgroundCircle.setAttribute("stroke", "#e5e7eb");
  backgroundCircle.setAttribute("stroke-width", "6");
  svg.appendChild(backgroundCircle);

  composition.forEach((row) => {
    const percentage = totalMarketValue === 0 ? 0 : (row.marketValue / totalMarketValue) * 100;
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "21");
    circle.setAttribute("cy", "21");
    circle.setAttribute("r", "15.915");
    circle.setAttribute("fill", "transparent");
    circle.setAttribute("stroke", row.color);
    circle.setAttribute("stroke-width", "6");
    circle.setAttribute("stroke-dasharray", `${percentage} ${100 - percentage}`);
    circle.setAttribute("stroke-dashoffset", `${25 - cumulativeDash}`);
    circle.setAttribute("stroke-linecap", "round");
    svg.appendChild(circle);

    cumulativeDash += percentage;

    const legendItem = document.createElement("li");
    legendItem.className = "flex items-center justify-between gap-3";
    legendItem.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="inline-flex h-3 w-3 rounded-full" style="background:${row.color}"></span>
        <span class="font-medium text-[var(--ink)]">${row.label}</span>
      </div>
      <span class="text-[var(--muted)]">${percentage.toFixed(1)}%</span>
    `;
    donutLegend.appendChild(legendItem);
  });

  donutContainer.appendChild(svg);

  policyChart.innerHTML = "";
  composition.forEach((row, index) => {
    const policyLimit = Math.min(40, 20 + index * 5);
    const portfolioWeight = totalMarketValue === 0 ? 0 : (row.marketValue / totalMarketValue) * 100;

    const column = document.createElement("div");
    column.className = "flex flex-1 flex-col items-center gap-2";
    column.setAttribute(
      "aria-label",
      `${row.label} policy limit ${policyLimit}% vs portfolio weight ${portfolioWeight.toFixed(1)}%`
    );

    column.innerHTML = `
      <div class="flex h-32 w-8 flex-col justify-end rounded-lg bg-[#f0f2f5] p-1">
        <div class="w-full rounded-sm bg-[var(--olive)]" style="height:${Math.min(policyLimit, 100)}%"></div>
        <div class="mt-1 w-full rounded-sm" style="height:${Math.min(portfolioWeight, 100)}%; background:${row.color}"></div>
      </div>
      <div class="flex flex-col items-center text-[10px] text-[var(--muted)]">
        <span>Limit ${policyLimit}%</span>
        <span class="font-semibold text-[var(--ink)] text-xs">${portfolioWeight.toFixed(1)}%</span>
      </div>
      <span class="text-xs text-center text-[var(--muted)]">${row.label.split(" · ")[0]}</span>
    `;

    policyChart.appendChild(column);
  });

  const benchmarkSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  benchmarkSvg.setAttribute("viewBox", "0 0 400 160");
  benchmarkSvg.classList.add("h-40", "w-full");

  const gridLines = document.createElementNS("http://www.w3.org/2000/svg", "g");
  [20, 60, 100, 140].forEach((y) => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "0");
    line.setAttribute("x2", "400");
    line.setAttribute("y1", y);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "#e5e7eb");
    line.setAttribute("stroke-width", "1");
    gridLines.appendChild(line);
  });
  benchmarkSvg.appendChild(gridLines);

  const timelinePoints = [
    { month: "Jan", portfolio: 2.1, benchmark: 1.8 },
    { month: "Mar", portfolio: 2.6, benchmark: 2.1 },
    { month: "May", portfolio: 3.4, benchmark: 2.5 },
    { month: "Jul", portfolio: 3.9, benchmark: 2.9 },
    { month: "Sep", portfolio: 4.1, benchmark: 3.2 },
    { month: "Nov", portfolio: 4.5, benchmark: 3.5 }
  ];

  const maxValue = Math.max(...timelinePoints.map((point) => point.portfolio));
  const scaleY = (value) => 150 - (value / maxValue) * 120;

  const portfolioPath = timelinePoints
    .map((point, index) => {
      const x = (index / (timelinePoints.length - 1)) * 360 + 20;
      const y = scaleY(point.portfolio);
      return `${index === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");

  const benchmarkPath = timelinePoints
    .map((point, index) => {
      const x = (index / (timelinePoints.length - 1)) * 360 + 20;
      const y = scaleY(point.benchmark);
      return `${index === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");

  const portfolioLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
  portfolioLine.setAttribute("d", portfolioPath);
  portfolioLine.setAttribute("fill", "none");
  portfolioLine.setAttribute("stroke", palette[0]);
  portfolioLine.setAttribute("stroke-width", "3");
  portfolioLine.setAttribute("stroke-linecap", "round");

  const benchmarkLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
  benchmarkLine.setAttribute("d", benchmarkPath);
  benchmarkLine.setAttribute("fill", "none");
  benchmarkLine.setAttribute("stroke", palette[3]);
  benchmarkLine.setAttribute("stroke-width", "3");
  benchmarkLine.setAttribute("stroke-dasharray", "6 6");

  benchmarkSvg.appendChild(portfolioLine);
  benchmarkSvg.appendChild(benchmarkLine);

  timelinePoints.forEach((point, index) => {
    const x = (index / (timelinePoints.length - 1)) * 360 + 20;
    const portfolioY = scaleY(point.portfolio);
    const benchmarkY = scaleY(point.benchmark);

    const monthLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    monthLabel.setAttribute("x", `${x}");
    monthLabel.setAttribute("y", "155");
    monthLabel.setAttribute("text-anchor", "middle");
    monthLabel.setAttribute("fill", "#6b7280");
    monthLabel.setAttribute("font-size", "10");
    monthLabel.textContent = point.month;
    benchmarkSvg.appendChild(monthLabel);

    const portfolioDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    portfolioDot.setAttribute("cx", `${x}");
    portfolioDot.setAttribute("cy", `${portfolioY}");
    portfolioDot.setAttribute("r", "3");
    portfolioDot.setAttribute("fill", palette[0]);
    benchmarkSvg.appendChild(portfolioDot);

    const benchmarkDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    benchmarkDot.setAttribute("cx", `${x}");
    benchmarkDot.setAttribute("cy", `${benchmarkY}");
    benchmarkDot.setAttribute("r", "3");
    benchmarkDot.setAttribute("fill", palette[3]);
    benchmarkSvg.appendChild(benchmarkDot);
  });

  const legend = document.createElement("div");
  legend.className = "mt-4 flex items-center gap-6 text-xs text-[var(--muted)]";
  legend.innerHTML = `
    <span class="flex items-center gap-2">
      <span class="inline-flex h-2 w-6 rounded-full" style="background:${palette[0]}"></span>
      Portfolio</span>
    <span class="flex items-center gap-2">
      <span class="inline-flex h-2 w-6 rounded-full" style="background:${palette[3]}"></span>
      Benchmark</span>
  `;

  benchmarkChart.innerHTML = "";
  benchmarkChart.appendChild(benchmarkSvg);
  benchmarkChart.appendChild(legend);
}

function renderRiskSignals(data) {
  const container = document.getElementById("risk-indicators");
  if (!container) return;
  container.innerHTML = "";

  if (!data.length) {
    container.innerHTML = '<p class="text-sm text-[var(--muted)]">No policy signals available.</p>';
    return;
  }

  const totalMarketValue = data.reduce(
    (acc, instrument) => acc + instrument.totalQuantity * instrument.markPrice,
    0
  );

  const composition = data.map((instrument) => {
    const marketValue = instrument.totalQuantity * instrument.markPrice;
    const bookValue = instrument.clients.reduce(
      (acc, client) => acc + client.avgPrice * client.quantity,
      0
    );
    return {
      symbol: instrument.symbol,
      marketValue,
      bookValue,
      weight: totalMarketValue === 0 ? 0 : (marketValue / totalMarketValue) * 100
    };
  });

  const highestWeight = composition.reduce(
    (prev, current) => (prev && prev.weight > current.weight ? prev : current),
    composition[0]
  );

  const totalBookValue = composition.reduce((acc, item) => acc + item.bookValue, 0);
  const markToBookVariance =
    totalBookValue === 0 ? 0 : ((totalMarketValue - totalBookValue) / totalBookValue) * 100;

  const topClientExposure = data
    .flatMap((instrument) =>
      instrument.clients.map((client) => ({
        name: client.name,
        exposure: client.quantity * instrument.markPrice
      }))
    )
    .reduce((acc, entry) => {
      acc[entry.name] = (acc[entry.name] ?? 0) + entry.exposure;
      return acc;
    }, {});

  const topClient = Object.entries(topClientExposure)
    .map(([name, exposure]) => ({ name, exposure }))
    .sort((a, b) => b.exposure - a.exposure)[0];

  const signals = [
    {
      label: "Largest instrument weight",
      value: `${highestWeight.symbol}`,
      helper: `${highestWeight.weight.toFixed(1)}% of portfolio NAV`,
      progress: Math.min(highestWeight.weight, 100),
      status:
        highestWeight.weight > 50 ? "elevated" : highestWeight.weight > 35 ? "watch" : "stable",
      color: palette[0]
    },
    {
      label: "Mark-to-book variance",
      value: `${markToBookVariance >= 0 ? "+" : ""}${markToBookVariance.toFixed(1)}%`,
      helper: "Market vs. book valuation spread",
      progress: Math.min(Math.abs(markToBookVariance), 100),
      status: Math.abs(markToBookVariance) > 7 ? "watch" : "stable",
      color: palette[1]
    }
  ];

  if (topClient) {
    const topClientWeight = totalMarketValue === 0 ? 0 : (topClient.exposure / totalMarketValue) * 100;
    signals.push({
      label: "Top client exposure",
      value: topClient.name,
      helper: `${topClientWeight.toFixed(1)}% of portfolio value`,
      progress: Math.min(topClientWeight, 100),
      status: topClientWeight > 30 ? "watch" : "stable",
      color: palette[2]
    });
  }

  const severity = signals.some((signal) => signal.status === "elevated")
    ? "elevated"
    : signals.some((signal) => signal.status === "watch")
    ? "watch"
    : "stable";

  const statusPill = container.closest("article")?.querySelector(".status-pill");
  if (statusPill) {
    statusPill.dataset.status = severity;
    statusPill.textContent =
      severity === "elevated" ? "Alert" : severity === "watch" ? "Watch" : "In limits";
  }

  signals.forEach((signal) => {
    const wrapper = document.createElement("div");
    wrapper.className = "space-y-2 rounded-xl border border-black/5 bg-white/70 p-4";
    wrapper.innerHTML = `
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">${signal.label}</p>
          <p class="mt-1 text-lg font-semibold text-[var(--ink)]">${signal.value}</p>
          <p class="text-sm text-[var(--muted)]">${signal.helper}</p>
        </div>
        <span class="status-pill" data-status="${signal.status}">${
      signal.status === "watch" ? "Watch" : signal.status === "elevated" ? "Alert" : "Stable"
    }</span>
      </div>
      <div class="progress-track">
        <span class="progress-fill" style="background:${signal.color}; width:${signal.progress}%"></span>
      </div>
    `;

    container.appendChild(wrapper);
  });
}

function renderTopClients(data) {
  const container = document.getElementById("top-clients");
  if (!container) return;
  container.innerHTML = "";

  if (!data.length) {
    container.innerHTML = '<p class="text-sm text-[var(--muted)]">No client allocations captured.</p>';
    return;
  }

  const clientExposure = new Map();
  data.forEach((instrument) => {
    instrument.clients.forEach((client) => {
      const clientValue = client.quantity * instrument.markPrice;
      const existing = clientExposure.get(client.name) ?? { value: 0, accounts: new Set() };
      existing.value += clientValue;
      if (client.accountNumber) {
        existing.accounts.add(client.accountNumber);
      }
      clientExposure.set(client.name, existing);
    });
  });

  const totalMarketValue = data.reduce(
    (acc, instrument) => acc + instrument.totalQuantity * instrument.markPrice,
    0
  );

  const topClients = [...clientExposure.entries()]
    .map(([name, details]) => ({
      name,
      value: details.value,
      accounts: details.accounts,
      weight: totalMarketValue === 0 ? 0 : (details.value / totalMarketValue) * 100
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  const list = document.createElement("ol");
  list.className = "space-y-3";

  if (!topClients.length) {
    container.innerHTML = '<p class="text-sm text-[var(--muted)]">No client allocations captured.</p>';
    return;
  }

  topClients.forEach((client, index) => {
    const item = document.createElement("li");
    item.className = "flex items-center justify-between gap-3 rounded-xl border border-black/5 bg-white/60 px-4 py-3";
    item.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--olive)]/10 text-sm font-semibold text-[var(--olive-700)]">${
      index + 1
    }</span>
        <div>
          <p class="text-sm font-semibold text-[var(--ink)]">${client.name}</p>
          <p class="text-xs text-[var(--muted)]">${client.accounts.size} account${
      client.accounts.size === 1 ? "" : "s"
    } • ${client.weight.toFixed(1)}% weight</p>
        </div>
      </div>
      <div class="text-right">
        <p class="text-sm font-semibold text-[var(--ink)]">${formatCurrency(client.value, data[0]?.currency ?? "USD")}</p>
        <p class="text-xs text-[var(--muted)]">Across holdings</p>
      </div>
    `;

    list.appendChild(item);
  });

  container.appendChild(list);
}

function renderCurrencyExposure(data) {
  const container = document.getElementById("currency-exposure");
  if (!container) return;
  container.innerHTML = "";

  if (!data.length) {
    container.innerHTML = '<p class="text-sm text-[var(--muted)]">No exposures recorded.</p>';
    return;
  }

  const exposureByCurrency = new Map();
  data.forEach((instrument) => {
    const value = instrument.totalQuantity * instrument.markPrice;
    exposureByCurrency.set(
      instrument.currency,
      (exposureByCurrency.get(instrument.currency) ?? 0) + value
    );
  });

  const total = [...exposureByCurrency.values()].reduce((acc, value) => acc + value, 0);

  const entries = [...exposureByCurrency.entries()].sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    container.innerHTML = '<p class="text-sm text-[var(--muted)]">No exposures recorded.</p>';
    return;
  }

  entries.forEach(([currency, value], index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "space-y-2 rounded-xl border border-black/5 bg-white/60 p-4";

    const percentage = total === 0 ? 0 : (value / total) * 100;
    const color = palette[index % palette.length];

    wrapper.innerHTML = `
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-[var(--ink)]">${currency}</p>
          <p class="text-xs text-[var(--muted)]">${percentage.toFixed(1)}% of market value</p>
        </div>
        <p class="text-sm font-medium text-[var(--muted)]">${formatCurrency(value, currency)}</p>
      </div>
      <div class="progress-track">
        <span class="progress-fill" style="background:${color}; width:${Math.min(percentage, 100)}%"></span>
      </div>
    `;

    container.appendChild(wrapper);
  });
}

function renderMeta() {
  const lastSynced = document.getElementById("last-synced");
  if (!lastSynced) return;
  lastSynced.textContent = `As of ${timeFormatter.format(new Date())}`;
}

renderSummary(ledgerData);
renderLedger(ledgerData);
renderAnalytics(ledgerData);
renderRiskSignals(ledgerData);
renderTopClients(ledgerData);
renderCurrencyExposure(ledgerData);
renderMeta();
