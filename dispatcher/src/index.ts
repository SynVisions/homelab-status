import { SignJWT, importPKCS8 } from "jose";

interface Env {
  GITHUB_APP_ID: string;
  GITHUB_APP_INSTALLATION_ID: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_APP_PRIVATE_KEY: string; // PKCS#8 PEM
}

const UA = "homelab-status-dispatcher";

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const key = await importPKCS8(env.GITHUB_APP_PRIVATE_KEY, "RS256");

    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 60)
      .setIssuer(env.GITHUB_APP_ID)
      .setExpirationTime("9m")
      .sign(key);

    const tokenRes = await fetch(
      `https://api.github.com/app/installations/${env.GITHUB_APP_INSTALLATION_ID}/access_tokens`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": UA,
        },
      },
    );
    if (!tokenRes.ok) {
      throw new Error(`token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`);
    }
    const { token } = (await tokenRes.json()) as { token: string };

    const dispatchRes = await fetch(
      `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": UA,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ event_type: "uptime" }),
      },
    );
    if (!dispatchRes.ok) {
      throw new Error(`dispatch failed: ${dispatchRes.status} ${await dispatchRes.text()}`);
    }
  },
};
