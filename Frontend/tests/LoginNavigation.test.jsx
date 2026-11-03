import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, it, vi } from "vitest";
import Login from "@/components/Login";
import { apiRequest } from "@/lib/apiClient";

vi.mock("@/lib/apiClient", () => ({ apiRequest: vi.fn() }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ login: vi.fn(), isAuthenticated: false }) }));

it("returns a signed-in player to the leaderboard they originally requested", async () => {
  apiRequest.mockResolvedValueOnce({ data: { token: "signed-token", user: { id: 1, username: "Player" } } });
  render(<MemoryRouter initialEntries={[{ pathname: "/login", state: { from: "/leaderboard" } }]}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/leaderboard" element={<p>Requested leaderboard</p>} />
      <Route path="/game" element={<p>Game modes</p>} />
    </Routes>
  </MemoryRouter>);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/email/i), "player@example.com");
  await user.type(screen.getByLabelText(/password/i), "StrongPass42!");
  await user.click(screen.getByRole("button", { name: "Start Game" }));
  expect(await screen.findByText("Requested leaderboard")).toBeInTheDocument();
});
