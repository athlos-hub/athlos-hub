export function isTokenExpiringSoon(token: string, minutesBeforeExpiry: number = 5): boolean {
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const exp = payload.exp * 1000;
        const expiryThreshold = Date.now() + (minutesBeforeExpiry * 60 * 1000);
        
        return expiryThreshold >= exp;
    } catch {
        return true;
    }
}

export function getTokenExpiryTime(token: string): number {
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const exp = payload.exp * 1000;
        const timeRemaining = Math.floor((exp - Date.now()) / 1000);
        return Math.max(0, timeRemaining);
    } catch {
        return 0;
    }
}

export async function refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
} | null> {
    try {
        let baseUrl: string;
        
        if (typeof window !== 'undefined') {
            if (window.location.origin.includes('athloshub.com.br')) {
                baseUrl = 'http://athloshub.com.br/api/v1';
            } else {
                baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
            }
        } else {
            baseUrl = process.env.AUTH_SERVICE_URL || process.env.API_BASE_URL || 'http://kong:8000/api/v1';
        }

        console.debug('[TOKEN-UTILS] refreshAccessToken using baseUrl:', baseUrl);

        const response = await fetch(`${baseUrl.replace(/\/$/, '')}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                refresh_token: refreshToken,
            }),
        });

        if (!response.ok) {
            console.error('❌ [TOKEN-UTILS] Erro ao renovar token:', response.statusText);
            return null;
        }

        const data = await response.json();
        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
        };
    } catch (error) {
        console.error('❌ [TOKEN-UTILS] Erro ao renovar token:', error);
        return null;
    }
}
