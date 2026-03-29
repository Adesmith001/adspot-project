const KORAPAY_INITIALIZE_URL =
  "https://api.korapay.com/merchant/api/v1/charges/initialize";

const getSecretKey = () =>
  process.env.KORAPAY_SECRET_KEY || process.env.VITE_KORAPAY_SECRET_KEY;

const parseBody = (body: unknown) => {
  if (!body) {
    return {};
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }

  return body as Record<string, unknown>;
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const secretKey = getSecretKey();
  if (!secretKey) {
    res.status(500).json({ message: "Korapay secret key is not configured." });
    return;
  }

  const body = parseBody(req.body);
  const {
    amount,
    currency,
    reference,
    redirectUrl,
    customerName,
    customerEmail,
    bookingId,
    description,
  } = body as {
    amount?: number;
    currency?: string;
    reference?: string;
    redirectUrl?: string;
    customerName?: string;
    customerEmail?: string;
    bookingId?: string;
    description?: string;
  };

  if (!amount || !currency || !reference || !redirectUrl || !customerEmail) {
    res.status(400).json({ message: "Missing required payment fields." });
    return;
  }

  try {
    const response = await fetch(KORAPAY_INITIALIZE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency,
        reference,
        redirect_url: redirectUrl,
        customer: {
          name: customerName || "Advertiser",
          email: customerEmail,
        },
        notification_url: redirectUrl,
        metadata: {
          bookingId,
          description,
        },
      }),
    });

    const payload = await response.json();

    if (!response.ok || !payload?.status || !payload?.data?.checkout_url) {
      res.status(response.status || 500).json({
        message:
          payload?.message || "Failed to initialize Korapay checkout.",
      });
      return;
    }

    res.status(200).json({
      checkoutUrl: payload.data.checkout_url,
      reference: payload.data.reference || reference,
    });
  } catch (error) {
    console.error("Korapay initialize error:", error);
    res.status(500).json({ message: "Unable to initialize payment." });
  }
}
