function isLivePayPalMode() {
  const mode = (process.env.PAYPAL_MODE || process.env.NEXT_PUBLIC_PAYPAL_MODE)?.trim().toLowerCase();
  return mode === "live" || mode === "production" || mode === "prod";
}

function getPayPalCredentials() {
  if (isLivePayPalMode()) {
    return {
      clientId: process.env.PAYPAL_CLIENT_ID?.trim(),
      clientSecret: process.env.PAYPAL_CLIENT_SECRET?.trim(),
    };
  }

  return {
    clientId: process.env.PAYPAL_SANDBOX_CLIENT_ID?.trim() || process.env.PAYPAL_CLIENT_ID?.trim(),
    clientSecret: process.env.PAYPAL_SANDBOX_CLIENT_SECRET?.trim() || process.env.PAYPAL_CLIENT_SECRET?.trim(),
  };
}

export function getPayPalApiBaseUrl() {
  return isLivePayPalMode() ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export async function getPayPalAccessToken() {
  const { clientId, clientSecret } = getPayPalCredentials();
  if (!clientId || !clientSecret || clientId.toLowerCase().startsWith("your-")) {
    throw new Error("PayPal credentials are not configured.");
  }

  const response = await fetch(`${getPayPalApiBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = (await response.json()) as { access_token?: string; error_description?: string };
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || "Could not authenticate with PayPal.");
  }

  return data.access_token;
}
