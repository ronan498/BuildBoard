const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

const headers = (token?: string) => ({
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {})
});

export async function deleteAccount(token?: string) {
  if (API_BASE && token) {
    try {
      const r = await fetch(`${API_BASE}/users/me`, {
        method: "DELETE",
        headers: headers(token),
      });
      if (!r.ok) {
        throw new Error(`Failed to delete account (${r.status})`);
      }
    } catch (e) {
      console.warn("Delete account request failed", e);
    }
  }
  // In mock mode nothing to clean up
  return Promise.resolve();
}
