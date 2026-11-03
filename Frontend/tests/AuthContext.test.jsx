import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { authRequest } from "@/lib/apiClient";

vi.mock("@/lib/apiClient", () => ({ authRequest: vi.fn() }));

function AccountState() {
  const { user, isAuthenticated } = useAuth();
  return <p>{isAuthenticated ? `Signed in as ${user.username}` : "Signed out"}</p>;
}

describe("session verification", () => {
  beforeEach(() => authRequest.mockReset());

  it("does not trust a saved user until the backend verifies the token", async () => {
    let resolveProfile;
    localStorage.setItem("token", "signed-token");
    localStorage.setItem("user", JSON.stringify({ username: "Unverified" }));
    authRequest.mockImplementationOnce(() => new Promise((resolve) => { resolveProfile = resolve; }));
    render(<AuthProvider><AccountState /></AuthProvider>);
    expect(screen.getByText(/checking your session/i)).toBeInTheDocument();
    expect(screen.queryByText(/unverified/i)).not.toBeInTheDocument();
    await act(async () => { resolveProfile({ data: { id: 1, username: "Verified", email: "verified@example.com" } }); });
    expect(await screen.findByText("Signed in as Verified")).toBeInTheDocument();
    expect(authRequest.mock.calls[0][0]).toBe("/api/auth/me");
  });

  it("clears an invalid session", async () => {
    localStorage.setItem("token", "invalid-token");
    authRequest.mockRejectedValueOnce({ name: "HttpError", message: "Invalid token", status: 401 });
    render(<AuthProvider><AccountState /></AuthProvider>);
    expect(await screen.findByText("Signed out")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("offers retry without deleting credentials for temporary backend failure", async () => {
    localStorage.setItem("token", "signed-token");
    authRequest.mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce({ data: { id: 1, username: "Recovered" } });
    const user = userEvent.setup();
    render(<AuthProvider><AccountState /></AuthProvider>);
    await user.click(await screen.findByRole("button", { name: /retry connection/i }));
    expect(await screen.findByText("Signed in as Recovered")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBe("signed-token");
  });

  it("responds to centralized authentication expiry", async () => {
    localStorage.setItem("token", "signed-token");
    authRequest.mockResolvedValue({ data: { id: 1, username: "Player" } });
    render(<AuthProvider><AccountState /></AuthProvider>);
    expect(await screen.findByText("Signed in as Player")).toBeInTheDocument();
    act(() => { window.dispatchEvent(new Event("auth:expired")); });
    expect(screen.getByText("Signed out")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
  });
});
