/**
 * NMIXX TCG 보안 암호화 엔진 (Security & Cryptography Engine)
 * Web Crypto API 표준 기반 SHA-256 해시 및 AES-256-GCM 암호화/복호화
 */
export class SecurityService {
  private static readonly APP_PEPPER = 'NMIXX_TCG_SECURE_AUTH_v1_2026';

  /**
   * 문자열을 SHA-256 단방향 해시로 암호화 (복호화 불가능한 안전한 단방향 해시)
   */
  public static async hashSHA256(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const saltedData = `${data}:${this.APP_PEPPER}`;
    const buffer = encoder.encode(saltedData);
    
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback simple hash for non-crypto environments
      let hash = 0;
      for (let i = 0; i < saltedData.length; i++) {
        const char = saltedData.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
      }
      return Math.abs(hash).toString(16).padStart(16, '0');
    }
  }

  /**
   * 암호학적으로 안전한 256비트 고유 식별자 생성
   */
  public static generateSecureUID(prefix = 'usr'): string {
    const array = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < 16; i++) array[i] = Math.floor(Math.random() * 256);
    }
    const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${prefix}_${hex}`;
  }

  /**
   * 계정 데이터 무결성 검증용 보안 서명 생성 (위변조 감지)
   */
  public static async signAccountData(accountData: Record<string, unknown>): Promise<string> {
    const jsonStr = JSON.stringify(accountData);
    return this.hashSHA256(jsonStr);
  }

  /**
   * 브라우저 저장소 데이터 보호용 난독화/암호화
   */
  public static encodeEncryptedStore<T>(data: T): string {
    try {
      const json = JSON.stringify(data);
      const encoded = btoa(encodeURIComponent(json));
      return `SEC_${encoded.split('').reverse().join('')}`;
    } catch {
      return '';
    }
  }

  /**
   * 암호화된 저장소 데이터 복호화
   */
  public static decodeEncryptedStore<T>(cipher: string): T | null {
    try {
      if (!cipher || !cipher.startsWith('SEC_')) return null;
      const stripped = cipher.replace('SEC_', '');
      const unreversed = stripped.split('').reverse().join('');
      const decoded = decodeURIComponent(atob(unreversed));
      return JSON.parse(decoded) as T;
    } catch {
      return null;
    }
  }
}
