import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GameBoard from "@/components/GameBoard";
import { authRequest } from "@/lib/apiClient";

vi.mock("@/lib/apiClient", () => ({
  apiRequest: vi.fn(),
  authRequest: vi.fn(),
  authHeader: vi.fn(() => ({})),
}));
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: 7, username: "Tester" }, isAuthenticated: true }),
}));

function session(overrides = {}) {
  const now = Date.now();
  return {
    id: "game-1", mode: "add", level: "easy", status: "ACTIVE",
    score: 0, answeredQuestions: 0, totalQuestions: 10,
    serverTime: new Date(now).toISOString(),
    question: {
      id: "question-1", a: 3, b: 4, operatorSymbol: "+",
      questionColumns: 1,
      timeLimitSeconds: 30, expiresAt: new Date(now + 30000).toISOString(),
    },
    ...overrides,
  };
}

function showGame(mode = "add", level = "easy") {
  return render(<MemoryRouter initialEntries={[`/game/play/${mode}/${level}`]}>
    <Routes><Route path="/game/play/:mode/:level" element={<GameBoard />} /></Routes>
  </MemoryRouter>);
}

function answered(overrides = {}) {
  return {
    data: {
      session: session({ score: 10, answeredQuestions: 1,
        question: { ...session().question, id: "question-2", a: 2, b: 2 }, ...overrides }),
      result: { answerCorrect: true, carryCorrect: true, earnedPoints: 10, timedOut: false },
    },
  };
}

describe("server-controlled gameplay", () => {
  beforeEach(() => {
    authRequest.mockReset();
    authRequest.mockResolvedValue({ data: session() });
  });

  it("submits an answer using the question ID and displays the server score", async () => {
    authRequest.mockResolvedValueOnce({ data: session() }).mockResolvedValueOnce(answered());
    const user = userEvent.setup();
    showGame();
    await user.type(await screen.findByLabelText(/your answer/i), "7");
    await user.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => expect(authRequest).toHaveBeenCalledTimes(2));
    const [path, options] = authRequest.mock.calls[1];
    expect(path).toBe("/api/game/sessions/game-1/answers");
    expect(JSON.parse(options.body)).toMatchObject({ questionId: "question-1", answerText: "7", action: "answer" });
    expect(JSON.parse(options.body)).not.toHaveProperty("score");
    await waitFor(() => expect(screen.getByText(/score:\s*10/i)).toBeInTheDocument());
  });

  it("lets the player choose carry marks without receiving the required positions", async () => {
    authRequest.mockResolvedValueOnce({ data: session() }).mockResolvedValueOnce(answered());
    const user = userEvent.setup();
    showGame();
    const mark = await screen.findByRole("button", { name: /carry for column 1/i });
    expect(mark).toHaveAttribute("aria-pressed", "false");
    await user.click(mark);
    expect(mark).toHaveAttribute("aria-pressed", "true");
    await user.type(screen.getByLabelText(/your answer/i), "7");
    await user.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => expect(authRequest).toHaveBeenCalledTimes(2));
    expect(JSON.parse(authRequest.mock.calls[1][1].body).carryMap).toEqual(["1"]);
  });

  it("does not submit twice while an answer is pending", async () => {
    let resolveAnswer;
    authRequest.mockResolvedValueOnce({ data: session() }).mockImplementationOnce(() => new Promise((resolve) => { resolveAnswer = resolve; }));
    const user = userEvent.setup();
    showGame();
    await user.type(await screen.findByLabelText(/your answer/i), "7");
    const button = screen.getByRole("button", { name: /submit answer/i });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(authRequest).toHaveBeenCalledTimes(2));
    expect(button).toBeDisabled();
    await act(async () => { resolveAnswer(answered()); });
  });

  it("retries the identical submission after a lost response", async () => {
    authRequest.mockResolvedValueOnce({ data: session() })
      .mockRejectedValueOnce(new Error("Connection interrupted"))
      .mockResolvedValueOnce(answered());
    const user = userEvent.setup();
    showGame();
    await user.type(await screen.findByLabelText(/your answer/i), "7");
    await user.click(screen.getByRole("button", { name: /submit answer/i }));
    await user.click(await screen.findByRole("button", { name: /retry request/i }));
    await waitFor(() => expect(authRequest).toHaveBeenCalledTimes(3));
    expect(authRequest.mock.calls[2][0]).toBe(authRequest.mock.calls[1][0]);
    expect(authRequest.mock.calls[2][1].body).toBe(authRequest.mock.calls[1][1].body);
    await waitFor(() => expect(screen.getByText(/score:\s*10/i)).toBeInTheDocument());
  });

  it("skips through the API and records explicit early endings", async () => {
    authRequest.mockResolvedValueOnce({ data: session() })
      .mockResolvedValueOnce(answered({ score: 0 }))
      .mockResolvedValueOnce({ data: session({ status: "ABANDONED", answeredQuestions: 1, question: null }) });
    const user = userEvent.setup();
    showGame();
    await user.click(await screen.findByRole("button", { name: /skip question/i }));
    await waitFor(() => expect(authRequest).toHaveBeenCalledTimes(2));
    expect(JSON.parse(authRequest.mock.calls[1][1].body)).toMatchObject({ action: "skip" });
    await user.click(screen.getByRole("button", { name: /end game/i }));
    await waitFor(() => expect(authRequest).toHaveBeenCalledWith("/api/game/sessions/game-1/end", expect.any(Object)));
    expect(await screen.findByRole("button", { name: /play again/i })).toBeInTheDocument();
  });

  it("shows completion from the server without posting a browser score", async () => {
    authRequest.mockResolvedValueOnce({ data: session({ answeredQuestions: 9, score: 90 }) })
      .mockResolvedValueOnce(answered({ status: "COMPLETED", score: 100, answeredQuestions: 10, question: null }));
    const user = userEvent.setup();
    showGame();
    await user.type(await screen.findByLabelText(/your answer/i), "7");
    await user.click(screen.getByRole("button", { name: /submit answer/i }));
    expect(await screen.findByRole("button", { name: /view leaderboard/i })).toBeInTheDocument();
    expect(authRequest.mock.calls.some(([path]) => path === "/api/score")).toBe(false);
  });

  it("rejects an invalid fraction denominator without consuming a question", async () => {
    authRequest.mockResolvedValue({ data: session({ mode: "fraction", question: {
      ...session().question, a: 1, b: 1, denominatorA: 2, denominatorB: 4,
    } }) });
    const user = userEvent.setup();
    showGame("fraction");
    await user.type(await screen.findByLabelText(/^numerator$/i), "3");
    await user.type(screen.getByLabelText(/^denominator$/i), "0");
    await user.click(screen.getByRole("button", { name: /submit answer/i }));
    expect(authRequest).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/denominator.*(positive|zero|greater)|fraction.*valid/i)).toBeInTheDocument();
  });

  it("sends equivalent fraction answers to the server for validation", async () => {
    authRequest.mockResolvedValueOnce({ data: session({ mode: "fraction", question: {
      ...session().question, a: 1, b: 1, denominatorA: 2, denominatorB: 4,
    } }) }).mockResolvedValueOnce(answered({ mode: "fraction" }));
    const user = userEvent.setup();
    showGame("fraction");
    await user.type(await screen.findByLabelText(/^numerator$/i), "6");
    await user.type(screen.getByLabelText(/^denominator$/i), "8");
    await user.click(screen.getByRole("button", { name: /submit answer/i }));
    await waitFor(() => expect(authRequest).toHaveBeenCalledTimes(2));
    expect(JSON.parse(authRequest.mock.calls[1][1].body).answerText).toBe("6/8");
  });

  it("automatically reports expiry once and accepts the server timeout result", async () => {
    const current = session();
    current.question.expiresAt = new Date(Date.now() + 100).toISOString();
    authRequest.mockResolvedValueOnce({ data: current }).mockResolvedValueOnce({ data: {
      ...answered().data, result: { answerCorrect: false, carryCorrect: false, earnedPoints: 0, timedOut: true },
    } });
    showGame();
    await waitFor(() => expect(authRequest).toHaveBeenCalledTimes(2), { timeout: 2500 });
    expect(JSON.parse(authRequest.mock.calls[1][1].body).action).toBe("timeout");
  });
});
