let getAccessToken: () => string | null = () => null;

export const setAccessTokenGetter = (getter: () => string | null) => {
  getAccessToken = getter;
};

export const apiFetch = async (
  url: string,
  options: RequestInit = {},
): Promise<Response> => {
  const token = getAccessToken();
  return fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
};
