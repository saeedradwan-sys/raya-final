import { signJwt, verifyJwt } from './jwt.mjs';
import {
  newJti,
  newFamilyId,
  saveRefresh,
  consumeRefresh,
  revokeFamily,
} from './refreshStore.mjs';

const secret = 'test-secret';
const token = signJwt({ sub: 'x', role: 'staff', typ: 'access' }, secret, 60);
const ok = verifyJwt(token, secret);
if (!ok.ok) {
  console.error('FAIL', ok);
  process.exit(1);
}

const jti = newJti();
const familyId = newFamilyId();
const now = Math.floor(Date.now() / 1000);
await saveRefresh(jti, { sub: 'x', realm: 'staff', familyId, expiresAtSec: now + 3600 });
const c1 = await consumeRefresh(jti);
if (!c1.ok) {
  console.error('FAIL consume', c1);
  process.exit(1);
}
const c2 = await consumeRefresh(jti);
if (c2.ok || c2.error !== 'revoked_reuse') {
  console.error('FAIL reuse', c2);
  process.exit(1);
}
await revokeFamily(familyId);
console.log('jwt + refresh store tests passed');
