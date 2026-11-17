// Gets you a LinkedIn token for scripts/posse.mjs. LinkedIn tokens last 60 days, then you run this again.
//
//   LINKEDIN_CLIENT_ID=... LINKEDIN_CLIENT_SECRET=... node scripts/posse-linkedin-auth.mjs
//
// It prints a web address to open, waits for LinkedIn to send you back to http://localhost:8765/callback, swaps the
// code for a token, and prints the three values to save as GitHub secrets. Nothing is saved to disk.
// Before you start, see docs/posse.md ("LinkedIn"): create the app, add the two products, add the redirect address.
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

export const REDIRECT = "http://localhost:8765/callback";
export const SCOPES = "openid profile w_member_social";

export const authorizeUrl = (clientId, state) =>
  `https://www.linkedin.com/oauth/v2/authorization?${new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: REDIRECT, state, scope: SCOPES })}`;

export const expiryDate = (expiresInSeconds, now = new Date()) => new Date(now.getTime() + expiresInSeconds * 1000).toISOString().slice(0, 10);

async function exchange(clientId, clientSecret, code) {
  const reply = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: clientId, client_secret: clientSecret, redirect_uri: REDIRECT }),
  });
  const body = await reply.json().catch(() => ({}));
  if (!reply.ok || !body.access_token) throw new Error(`LinkedIn said ${reply.status}: ${body.error_description ?? body.error ?? "no token"}`);
  return body;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { LINKEDIN_CLIENT_ID: clientId, LINKEDIN_CLIENT_SECRET: clientSecret } = process.env;
  if (!clientId || !clientSecret) { console.error("Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET (from your app's Auth tab) first."); process.exit(1); }
  const state = randomBytes(16).toString("hex");
  const server = createServer(async (request, response) => {
    const address = new URL(request.url, "http://localhost:8765");
    if (address.pathname !== "/callback") { response.writeHead(404).end(); return; }
    const finish = (message, code = 200) => { response.writeHead(code, { "Content-Type": "text/plain; charset=utf-8" }).end(message); server.close(); };
    try {
      if (address.searchParams.get("state") !== state) throw new Error("The state didn't match, so I ignored it. Run the script again.");
      if (address.searchParams.get("error")) throw new Error(address.searchParams.get("error_description") ?? address.searchParams.get("error"));
      const token = await exchange(clientId, clientSecret, address.searchParams.get("code"));
      const who = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` } });
      const profile = await who.json().catch(() => ({}));
      if (!who.ok || !profile.sub) throw new Error(`Got a token but couldn't read your member id (${who.status}). Check the "Sign In with LinkedIn using OpenID Connect" product is added to the app.`);
      finish("Done. You can close this tab and go back to the terminal.");
      console.log("\nSave these as GitHub secrets (repository Settings > Secrets and variables > Actions):\n");
      console.log(`  LINKEDIN_TOKEN=${token.access_token}`);
      console.log(`  LINKEDIN_AUTHOR=urn:li:person:${profile.sub}`);
      console.log(`  LINKEDIN_TOKEN_EXPIRES=${expiryDate(token.expires_in)}\n`);
      console.log("Treat the token like a password. Run this script again before that date.");
    } catch (error) {
      finish(`Something went wrong: ${error.message}`, 400);
      console.error(`\n${error.message}`);
      process.exitCode = 1;
    }
  });
  server.listen(8765, "127.0.0.1", () => console.log(`Open this address in your browser and approve:\n\n  ${authorizeUrl(clientId, state)}\n\nWaiting for LinkedIn to send you back...`));
}
