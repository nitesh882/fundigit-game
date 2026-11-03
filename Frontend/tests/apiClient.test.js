import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, authRequest } from "@/lib/apiClient";

afterEach(() => vi.unstubAllGlobals());

describe("API requests", () => {
  it("parses JSON and includes authenticated headers", async () => {
    localStorage.setItem("token", "signed-token");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 7 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await authRequest("/api/auth/me");
    expect(result.data).toEqual({ id: 7 });
    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get("Authorization")).toBe("Bearer signed-token");
  });

  it("preserves HTTP status and useful server errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Invalid answer" }), { status: 400 })));
    await expect(apiRequest("/api/game/sessions")).rejects.toMatchObject({ message: "Invalid answer", status: 400 });
  });

  it("invalidates local credentials when a protected request is unauthorized", async () => {
    localStorage.setItem("token", "expired-token");
    localStorage.setItem("user", JSON.stringify({ id: 1 }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Session expired" }), { status: 401 })));
    await expect(authRequest("/api/auth/me")).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });

  it("handles an empty successful response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(apiRequest("/api/health")).resolves.toMatchObject({ data: null });
  });

  it("does not clear a newer login when an old token's request returns 401", async () => {
    let resolveResponse;
    localStorage.setItem("token", "old-token");
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => { resolveResponse = resolve; })));
    const expired = vi.fn();
    window.addEventListener("auth:expired", expired);
    const request = authRequest("/api/auth/me");
    localStorage.setItem("token", "new-token");
    localStorage.setItem("user", JSON.stringify({ id: 2 }));
    resolveResponse(new Response(JSON.stringify({ message: "Old token expired" }), { status: 401 }));
    await expect(request).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem("token")).toBe("new-token");
    expect(JSON.parse(localStorage.getItem("user"))).toEqual({ id: 2 });
    expect(expired).not.toHaveBeenCalled();
    window.removeEventListener("auth:expired", expired);
  });
});
