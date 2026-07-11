function isLivePayPalMode() {
  const mode = (process.env.PAYPAL_MODE || process.env.NEXT_PUBLIC_PAYPAL_MODE)?.trim().toLowerCase();
  return mode === "live" || mode === "production" || mode === "prod";
}

function isPlaceholder(value: string | undefined) {
  if (!value) return true;
  const v = value.toLowerCase();
  return v.startsWith("your-") || v.includes("example") || v === "changeme";
}

function pickCredential(...values: Array<string | undefined>) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed && !isPlaceholder(trimmed)) return trimmed;
  }
  return undefined;
}

function getPayPalCredentials() {
  const liveId = pickCredential(process.env.PAYPAL_CLIENT_ID, process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID);
  const liveSecret = pickCredential(process.env.PAYPAL_CLIENT_SECRET);
  const sandboxId = pickCredential(
    process.env.PAYPAL_SANDBOX_CLIENT_ID,
    process.env.NEXT_PUBLIC_PAYPAL_SANDBOX_CLIENT_ID,
  );
  const sandboxSecret = pickCredential(process.env.PAYPAL_SANDBOX_CLIENT_SECRET);

  if (isLivePayPalMode()) {
    return {
      clientId: liveId || sandboxId,
      clientSecret: liveSecret || sandboxSecret,
    };
  }

  return {
    clientId: sandboxId || liveId,
    clientSecret: sandboxSecret || liveSecret,
  };
}

export function getPayPalApiBaseUrl() {
  return isLivePayPalMode() ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export async function getPayPalAccessToken() {
  const { clientId, clientSecret } = getPayPalCredentials();
  if (!clientId || !clientSecret) {
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
