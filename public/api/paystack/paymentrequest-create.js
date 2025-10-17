const { send, readJson, pstack } = require("./_util");

// optional: create/find a customer by email if you pass email instead of customer code
async function ensureCustomerByEmail(email) {
  if (!email) return null;
  // Try to find by email (Paystack search is limited; simplest is to just create—Paystack dedupes)
  const create = await pstack("/customer", { method: "POST", body: JSON.stringify({ email }) });
  if (create.ok && create.data?.data?.customer_code) return create.data.data.customer_code;

  // If already exists, Paystack returns an error message, try to fetch list & match (best effort)
  const list = await pstack(`/customer?perPage=50`, { method: "GET" });
  if (list.ok && Array.isArray(list.data?.data)) {
    const hit = list.data.data.find(c => (c.email || "").toLowerCase() === email.toLowerCase());
    if (hit?.customer_code) return hit.customer_code;
  }
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  try {
    const {
      description = "AlgoHive invoice",
      amountZar, // optional if using line_items
      email,     // optional if you already have customer_code
      customer_code,
      line_items = [], // [{name, amount, quantity}]
      tax = [],        // [{name, amount}]
      send_notification = false,
      draft = false,
      currency = "ZAR",
      due_date,        // ISO8601 string optional
    } = await readJson(req);

    let customer = customer_code || null;
    if (!customer && email) {
      customer = await ensureCustomerByEmail(email);
    }
    if (!customer) return send(res, 400, { error: "customer_code or email required" });

    // If not using line_items/tax then you must set a total 'amount' (minor units)
    const body = {
      customer,
      description,
      currency,
      send_notification,
      draft,
      ...(due_date ? { due_date } : {}),
      ...(Array.isArray(line_items) && line_items.length ? { line_items } : {}),
      ...(Array.isArray(tax) && tax.length ? { tax } : {}),
      ...(amountZar ? { amount: Math.round(Number(amountZar) * 100) } : {}),
    };

    const r = await pstack("/paymentrequest", { method: "POST", body: JSON.stringify(body) });

    if (!r.ok || !r?.data?.status) {
      return send(res, r.status || 400, { error: r.data?.message || "Create PRQ failed", detail: r.data });
    }

    // Paystack returns request_code; you can display their hosted invoice page via Dashboard link,
    // or email notification if send_notification=true. (They don't always return a direct URL.)
    return send(res, 200, r.data.data);
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: e.message || "Server error" });
  }
};
