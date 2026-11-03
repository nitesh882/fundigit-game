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
  const { authenticated = false, ...requestOptions } = options;
  const headers = { ...(requestOptions.headers || {}) };
  const authorization = headers.Authorization || headers.authorization;
  const requestToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  const hasBody = Boolean(requestOptions.body);
  if (hasBody && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(buildUrl(path), {
    ...requestOptions,
    headers,
  });

  const { data, rawText } = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401 && (authenticated || authorization) && localStorage.getItem("token") === requestToken) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth:expired"));
    }
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

export const authRequest = (path, options = {}) =>
  apiRequest(path, {
    ...options,
    authenticated: true,
    headers: { ...authHeader(localStorage.getItem("token")), ...options.headers },
  });
