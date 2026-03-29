const getSecretKey = () =>
  process.env.KORAPAY_SECRET_KEY || process.env.VITE_KORAPAY_SECRET_KEY;

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const secretKey = getSecretKey();
  if (!secretKey) {
    res.status(500).json({ message: "Korapay secret key is not configured." });
    return;
  }

  const reference = req.query?.reference;
  if (!reference || typeof reference !== "string") {
    res.status(400).json({ message: "Payment reference is required." });
    return;
  }

  try {
    const response = await fetch(
      `https://api.korapay.com/merchant/api/v1/charges/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      },
    );

    const payload = await response.json();

    if (!response.ok || !payload?.status) {
      res.status(response.status || 500).json({
        message: payload?.message || "Failed to verify payment.",
      });
      return;
    }

    res.status(200).json({
      status: payload.data?.status || "unknown",
      reference: payload.data?.reference || reference,
      amount: payload.data?.amount_paid || payload.data?.amount || 0,
      currency: payload.data?.currency || "NGN",
      raw: payload.data || null,
    });
  } catch (error) {
    console.error("Korapay verify error:", error);
    res.status(500).json({ message: "Unable to verify payment." });
  }
}
