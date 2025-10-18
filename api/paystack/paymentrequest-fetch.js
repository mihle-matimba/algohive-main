const { send, pstack } = require("./_util");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });
  const id_or_code = (req.query && req.query.id_or_code) || "";
  if (!id_or_code) return send(res, 400, { error: "id_or_code required" });

  const r = await pstack(`/paymentrequest/${encodeURIComponent(id_or_code)}`, { method: "GET" });
  if (!r.ok || !r?.data?.status) return send(res, r.status || 400, { error: r.data?.message || "Fetch failed", detail: r.data });
  return send(res, 200, r.data.data);
};
