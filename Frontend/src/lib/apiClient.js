import { API_BASE_URL } from "@/config/env";

const normalizeBaseUrl = (baseUrl) => {
  if (!baseUrl) return "";
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
};

const normalizePath = (path) => (path.startsWith("/") ? path : `/${path}`);

const buildUrl = (path) =>
  `${normalizeBaseUrl(API_BASE_URL)}${normalizePath(path)}`;

const parseResponse = async (response) => {
  const text = await response.text();
  if (!text) {
    return { data: null, rawText: "" };
  }

  try {
    return { data: JSON.parse(text), rawText: text };
  } catch {
    return { data: text, rawText: text };
  }
};

export const apiRequest = async (path, options = {}) => {
  const headers = { ...(options.headers || {}) };
  const hasBody = Boolean(options.body);
  if (hasBody && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
  });

  const { data, rawText } = await parseResponse(response);

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? data.message
        : typeof data === "string" && data.trim().length > 0
        ? data
        : `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    error.rawText = rawText;
    throw error;
  }

  return { data, response };
};

export const authHeader = (token) =>
  token ? { Authorization: `Bearer ${token}` } : {};
