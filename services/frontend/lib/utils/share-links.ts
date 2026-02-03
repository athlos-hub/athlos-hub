export function generateProfileLink(keycloakId: string): string {
  const baseUrl = typeof window !== "undefined" 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || "https://athloshub.com.br";
  return `${baseUrl}/profile/${keycloakId}`;
}

export function generatePostLink(postId: string): string {
  const baseUrl = typeof window !== "undefined" 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || "https://athloshub.com.br";
  return `${baseUrl}/social/post/${postId}`;
}

export function generateOrganizationLink(slug: string): string {
  const baseUrl = typeof window !== "undefined" 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || "https://athloshub.com.br";
  return `${baseUrl}/organizations/${slug}`;
}
