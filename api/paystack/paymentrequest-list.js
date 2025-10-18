const { send, pstack } = require("./_util");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });
  const qs = new URLSearchParams({
    perPage: req.query.perPage || "20",
    page: req.query.page || "1",
    ...(req.query.status ? { status: req.query.status } : {}),
    ...(req.query.customer ? { customer: req.query.customer } : {}),
    ...(req.query.currency ? { currency: req.query.currency } : {}),
  }).toString();

  const r = await pstack(`/paymentrequest?${qs}`, { method: "GET" });
  if (!r.ok || !r?.data?.status) return send(res, r.status || 400, { error: r.data?.message || "List failed", detail: r.data });
  return send(res, 200, r.data);
};
