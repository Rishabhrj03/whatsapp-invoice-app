/**
 * GET /api/v1/health
 * ──────────────────
 * Public health-check endpoint returning app version, uptime, and environment.
 * Used by load balancers, monitoring tools (UptimeRobot, Datadog), and CI/CD pipelines.
 *
 * @version 1.0.0
 */
import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { resolve } from "path";

export const dynamic = "force-dynamic";

const API_VERSION = "1.0.0";
const startTime = Date.now();

export async function GET() {
    // Safely read current package version at runtime
    let appVersion = API_VERSION;
    try {
        const pkg = JSON.parse(
            readFileSync(resolve(process.cwd(), "package.json"), "utf8")
        );
        appVersion = pkg.version;
    } catch (_) {}

    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    const response = NextResponse.json({
        status: "ok",
        version: appVersion,
        apiVersion: "v1",
        environment: process.env.NODE_ENV || "development",
        uptimeSeconds,
        timestamp: new Date().toISOString(),
    });

    response.headers.set("X-API-Version", `v${API_VERSION}`);
    response.headers.set("Cache-Control", "no-store");

    return response;
}
