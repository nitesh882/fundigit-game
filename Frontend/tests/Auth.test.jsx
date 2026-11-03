import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "@/components/Login";
import Signup from "@/components/Signup";
import PrivateRoute from "@/components/PrivateRoute";
import { apiRequest } from "@/lib/apiClient";

const auth = vi.hoisted(() => ({ login: vi.fn(), logout: vi.fn(), isAuthenticated: false, loading: false, user: null }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/lib/apiClient", () => ({ apiRequest: vi.fn(), authRequest: vi.fn(), authHeader: vi.fn() }));

function renderForm(Component) {
  return render(<MemoryRouter><Routes>
    <Route path="/" element={<Component />} />
    <Route path="/game" element={<p>Game modes loaded</p>} />
  </Routes></MemoryRouter>);
}

describe("account forms and protected routes", () => {
  beforeEach(() => {
    auth.isAuthenticated = false;
    auth.loading = false;
    auth.user = null;
    apiRequest.mockReset();
  });

  it("signs in with credentials and updates the shared auth state", async () => {
    const user = userEvent.setup();
    const profile = { id: 1, username: "Player", email: "player@example.com" };
    apiRequest.mockResolvedValue({ data: { user: profile, token: "signed-token" } });
    renderForm(Login);
    await user.type(screen.getByLabelText(/email/i), profile.email);
    await user.type(screen.getByLabelText(/password/i), "StrongPass42!");
    await user.click(screen.getByRole("button", { name: /start game|log ?in|sign in/i }));
    expect(auth.login).toHaveBeenCalledWith(profile, "signed-token");
    expect(await screen.findByText("Game modes loaded")).toBeInTheDocument();
    expect(JSON.parse(apiRequest.mock.calls[0][1].body)).toMatchObject({ email: profile.email, password: "StrongPass42!" });
  });

  it("keeps invalid credentials on the login screen with a useful error", async () => {
    const user = userEvent.setup();
    apiRequest.mockRejectedValue(new Error("Invalid email or password"));
    renderForm(Login);
    await user.type(screen.getByLabelText(/email/i), "player@example.com");
    await user.type(screen.getByLabelText(/password/i), "Incorrect42!");
    await user.click(screen.getByRole("button", { name: /start game|log ?in|sign in/i }));
    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it("registers with username, email, and password", async () => {
    const user = userEvent.setup();
    const profile = { id: 3, username: "NewPlayer", email: "new@example.com" };
    apiRequest.mockResolvedValue({ data: { token: "new-token", user: profile } });
    renderForm(Signup);
    await user.type(screen.getByLabelText(/username/i), profile.username);
    await user.type(screen.getByLabelText(/email/i), profile.email);
    await user.type(screen.getByLabelText(/password/i), "StrongPass42!");
    await user.click(screen.getByRole("button", { name: /create account|sign up|join/i }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
    expect(apiRequest.mock.calls[0][0]).toBe("/api/auth/signup");
    expect(auth.login).toHaveBeenCalledWith(profile, "new-token");
  });

  it("redirects anonymous visitors instead of trusting a token string", async () => {
    localStorage.setItem("token", "not-a-real-token");
    render(<MemoryRouter initialEntries={["/private"]}><Routes>
      <Route element={<PrivateRoute />}><Route path="/private" element={<p>Private content</p>} /></Route>
      <Route path="/login" element={<p>Login required</p>} />
    </Routes></MemoryRouter>);
    expect(await screen.findByText("Login required")).toBeInTheDocument();
    expect(screen.queryByText("Private content")).not.toBeInTheDocument();
  });

  it("renders authenticated protected routes", () => {
    auth.isAuthenticated = true;
    render(<MemoryRouter initialEntries={["/private"]}><Routes>
      <Route element={<PrivateRoute />}><Route path="/private" element={<p>Private content</p>} /></Route>
    </Routes></MemoryRouter>);
    expect(screen.getByText("Private content")).toBeInTheDocument();
  });
});
