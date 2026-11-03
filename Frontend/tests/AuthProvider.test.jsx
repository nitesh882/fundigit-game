import { useEffect } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { authRequest } from "@/lib/apiClient";

vi.mock("@/lib/apiClient", () => ({ authRequest: vi.fn() }));

const originalUser = { id: 1, username: "Original Player", email: "old@example.com" };
const replacementUser = { id: 2, username: "New Player", email: "new@example.com" };

function AuthProbe({ observe }) {
  const auth = useAuth();
  useEffect(() => { observe(auth); }, [auth, observe]);
  return <p data-testid="auth-name">{auth.user?.username || "Anonymous"}</p>;
}

function mountProvider() {
  const observe = vi.fn();
  render(<AuthProvider><AuthProbe observe={observe} /></AuthProvider>);
  return observe;
}

describe("authentication verification races", () => {
  beforeEach(() => {
    localStorage.clear();
    authRequest.mockReset();
  });

  it("blocks the previous user's content while a token from another tab is verified", async () => {
    let resolveVerification;
    localStorage.setItem("token", "original-token");
    authRequest.mockResolvedValueOnce({ data: originalUser })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveVerification = resolve; }));
    mountProvider();
    expect(await screen.findByText("Original Player")).toBeInTheDocument();

    act(() => {
      localStorage.setItem("token", "replacement-token");
      window.dispatchEvent(new StorageEvent("storage", { key: "token", oldValue: "original-token", newValue: "replacement-token" }));
    });
    expect(screen.queryByText("Original Player")).not.toBeInTheDocument();
    expect(screen.getByText(/checking your session/i)).toBeInTheDocument();
    await waitFor(() => expect(authRequest).toHaveBeenCalledTimes(2));

    await act(async () => { resolveVerification({ data: replacementUser }); });
    expect(await screen.findByText("New Player")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("user"))).toEqual(replacementUser);
  });

  it("signs out immediately when another tab clears account storage", async () => {
    localStorage.setItem("token", "original-token");
    authRequest.mockResolvedValueOnce({ data: originalUser });
    mountProvider();
    expect(await screen.findByText("Original Player")).toBeInTheDocument();
    act(() => {
      localStorage.clear();
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });
    expect(screen.getByText("Anonymous")).toBeInTheDocument();
    expect(screen.queryByText("Original Player")).not.toBeInTheDocument();
    expect(authRequest).toHaveBeenCalledTimes(1);
  });

  it.each(["failed", "successful"])("ignores a stale %s verification after a newer login", async (outcome) => {
    let resolveVerification;
    let rejectVerification;
    authRequest.mockImplementationOnce(() => new Promise((resolve, reject) => {
      resolveVerification = resolve;
      rejectVerification = reject;
    }));
    const observe = mountProvider();
    const authActions = observe.mock.calls.at(-1)[0];
    expect(screen.getByText("Anonymous")).toBeInTheDocument();

    act(() => {
      localStorage.setItem("token", "old-verification-token");
      window.dispatchEvent(new StorageEvent("storage", { key: "token", newValue: "old-verification-token" }));
    });
    await waitFor(() => expect(authRequest).toHaveBeenCalledTimes(1));
    act(() => authActions.login(replacementUser, "new-login-token"));
    expect(await screen.findByText("New Player")).toBeInTheDocument();

    await act(async () => {
      if (outcome === "failed") rejectVerification(Object.assign(new Error("Old token expired"), { status: 401 }));
      else resolveVerification({ data: originalUser });
    });
    expect(screen.getByText("New Player")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBe("new-login-token");
    expect(JSON.parse(localStorage.getItem("user"))).toEqual(replacementUser);
  });
});
