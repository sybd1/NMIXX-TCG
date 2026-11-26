// 운영자 계정 (specs/025, DEC-032)
// firestore.rules의 isAdmin() 목록과 같은 값이어야 한다. 화면의 운영자 확인은 안내용이고, 실제 권한은 규칙이 정한다.
// 값은 Firebase Authentication의 사용자 UID(구글 로그인)다. 계정 ID(goog_…)가 아니다.
export const ADMIN_GOOGLE_UIDS: readonly string[] = ['jP0i8ASU98UI07d7plZLc4jorfN2'];
