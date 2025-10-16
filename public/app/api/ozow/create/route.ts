import { NextRequest } from "next/server";
import { getOzowToken } from "../_lib/token";

export async function POST(req: NextRequest) {
  try {
    const { amount, reference, customerName } = await req.json();

    if (!amount || Number(amount) <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), { status: 400 });
    }
    if (!reference) {
      return new Response(JSON.stringify({ error: "Missing reference" }), { status: 400 });
    }

    const accessToken = await getOzowToken();

    const payload = {
      siteCode: process.env.OZOW_SITE_CODE!,
      amount: { currency: "ZAR", value: Number(amount) },
      merchantReference: reference, // your order ref
      // link lifespan (optional): 30 mins
      expireAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      returnUrl: process.env.OZOW_RETURN_URL!,
      // Optional: include cancel/error landing if your Ozow config supports them as params
      // Some integrations only use returnUrl; keep your notify/webhook too.
    };

    const res = await fetch(`${process.env.OZOW_API}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data?.message || "Create payment failed", detail: data }), { status: res.status });
    }

    // data.redirectUrl is what we need
    return new Response(JSON.stringify({ url: data.redirectUrl, id: data.id, status: data.status }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Server error" }), { status: 500 });
  }
}
