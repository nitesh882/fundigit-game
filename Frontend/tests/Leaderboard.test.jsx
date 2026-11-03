import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Leaderboard from "@/components/Leaderboard";
import { apiRequest, authRequest } from "@/lib/apiClient";

vi.mock("@/lib/apiClient", () => ({ apiRequest: vi.fn(), authRequest: vi.fn(), authHeader: vi.fn(() => ({})) }));

function score(name, mode = "add") {
  return { id: name, name, mode, difficulty: "medium", score: 80, status: "COMPLETED", answeredQuestions: 10, playedAt: "2026-11-02T10:00:00Z" };
}

describe("leaderboard and personal history", () => {
  beforeEach(() => {
    apiRequest.mockReset(); authRequest.mockReset();
    apiRequest.mockResolvedValue({ data: [] });
    authRequest.mockResolvedValue({ data: [] });
  });

  it("shows empty results and lets players change difficulty", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Leaderboard /></MemoryRouter>);
    expect(await screen.findByText(/no scores yet/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /easy/i }));
    await waitFor(() => expect(apiRequest.mock.calls.at(-1)[0]).toContain("difficulty=easy"));
  });

  it("ignores a late result from a previously selected mode", async () => {
    let resolveOld;
    apiRequest.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValue({ data: [score("Current subtraction player", "sub")] });
    const user = userEvent.setup();
    render(<MemoryRouter><Leaderboard /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: /subtraction/i }));
    expect(await screen.findByText("Current subtraction player")).toBeInTheDocument();
    await act(async () => { resolveOld({ data: [score("Outdated addition player")] }); });
    expect(screen.queryByText("Outdated addition player")).not.toBeInTheDocument();
    expect(screen.getByText("Current subtraction player")).toBeInTheDocument();
  });

  it("loads history through the authenticated API and labels unfinished games", async () => {
    authRequest.mockResolvedValue({ data: [{ ...score("Me"), status: "ABANDONED", answeredQuestions: 3 }] });
    const user = userEvent.setup();
    render(<MemoryRouter><Leaderboard /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: /my history/i }));
    await waitFor(() => expect(authRequest).toHaveBeenCalled());
    expect(authRequest.mock.calls[0][0]).toContain("/api/history");
    const entry = await screen.findByRole("article");
    expect(within(entry).getByText(/unfinished|abandoned/i)).toBeInTheDocument();
  });

  it("retries failed leaderboard requests", async () => {
    apiRequest.mockRejectedValueOnce(new Error("Unable to reach server")).mockResolvedValue({ data: [score("Recovered player")] });
    const user = userEvent.setup();
    render(<MemoryRouter><Leaderboard /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: /^retry$/i }));
    expect(await screen.findByText("Recovered player")).toBeInTheDocument();
  });
});
