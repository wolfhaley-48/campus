export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request(path, options = {}) {
  const url = path.startsWith("/api/") ? path : `/api${path}`;
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // пустой ответ — не ошибка сама по себе
  }

  if (response.status === 401) {
    window.dispatchEvent(new Event("campus:unauthorized"));
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.message || "Не удалось выполнить запрос. Попробуйте ещё раз.",
      data?.error,
    );
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
};
