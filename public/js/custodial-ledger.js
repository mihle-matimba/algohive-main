const ledgerData = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    currency: "USD",
    totalQuantity: 4500,
    markPrice: 172.45,
    logo: "/media/logos/apple.svg",
    clients: [
      { name: "Client Alpha", quantity: 1500, avgPrice: 170.1 },
      { name: "Client Beta", quantity: 1200, avgPrice: 168.4 },
      { name: "Client Gamma", quantity: 900, avgPrice: 175.9 },
      { name: "Client Delta", quantity: 900, avgPrice: 174.3 }
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
      { name: "Client Alpha", quantity: 500, avgPrice: 220.25 },
      { name: "Client Epsilon", quantity: 1350, avgPrice: 242.1 },
      { name: "Client Zeta", quantity: 950, avgPrice: 240.6 }
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
      { name: "Client Beta", quantity: 1800, avgPrice: 315.7 },
      { name: "Client Theta", quantity: 2200, avgPrice: 330.9 },
      { name: "Client Omega", quantity: 1200, avgPrice: 325.1 }
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
      { name: "Client Gamma", quantity: 300, avgPrice: 1950.5 },
      { name: "Client Lambda", quantity: 415, avgPrice: 1989.7 },
      { name: "Client Sigma", quantity: 250, avgPrice: 2005.1 }
    ]
  }
];

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0
});

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1
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
  const portfolioValue = data.reduce(
    (acc, instrument) => acc + instrument.totalQuantity * instrument.markPrice,
    0
  );

  const allClients = new Set();
  data.forEach((instrument) => {
    instrument.clients.forEach((client) => allClients.add(client.name));
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

  const summaryCards = [
    {
      title: "Total Market Value",
      value: formatCurrency(portfolioValue, data[0]?.currency ?? "USD"),
      helper: "Across all custodial instruments"
    },
    {
      title: "Tracked Instruments",
      value: data.length,
      helper: "Live positions on AlgoHive"
    },
    {
      title: "Active Clients",
      value: allClients.size,
      helper: `${compactNumberFormatter.format(
        allClients.size
      )} counterparties allocated`
    },
    {
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
      title: "Top Client Exposure",
      value: topClient.clientName,
      helper: `${formatCurrency(topClient.total, data[0]?.currency ?? "USD")} total market value`
    });
  }

  summaryCards.forEach((card) => {
    const div = document.createElement("div");
    div.className =
      "glass border border-black/10 rounded-2xl p-5 text-left shadow-sm backdrop-blur bg-white/60";

    div.innerHTML = `
      <p class="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">${card.title}</p>
      <p class="mt-2 text-2xl font-semibold text-[var(--ink)]">${card.value}</p>
      <p class="mt-1 text-sm text-[var(--muted)]">${card.helper}</p>
    `;

    summaryContainer.appendChild(div);
  });
}

function renderLedger(data) {
  const container = document.getElementById("ledger-container");
  const template = document.getElementById("instrument-template");

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

renderSummary(ledgerData);
renderLedger(ledgerData);
