/**
 * Authorization regression checks for session bookings and profiles.
 *
 * Almost every assertion here is about what a signed-in user must NOT be able
 * to do — read someone else's session, force a status transition that is not
 * theirs to make, or promote themselves to mentor. Strapi's role permissions
 * cannot express any of that; it lives in the controllers, so it needs a test.
 *
 * Requires a running local RS CMS with the dedicated test accounts.
 * This suite creates bookings and must never target the original client's CMS.
 *
 *   npm run verify:auth
 */
const target = new URL(process.env.RS_AUTH_TEST_API || 'http://127.0.0.1:1340/api');
if (process.env.NODE_ENV === 'production' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) ||
    !['http:', 'https:'].includes(target.protocol) || target.port === '1337' ||
    target.username || target.password || target.search || target.hash ||
    target.pathname.replace(/\/$/, '') !== '/api') {
  throw new Error('Auth checks require a local Agrico /api URL; production and source CMS port 1337 are refused.');
}
const API = target.href.replace(/\/$/, '');
const PASSWORD = process.env.RS_AUTH_TEST_PASSWORD || 'DevPassword123!';

let pass = 0;
let fail = 0;

function check(label, actual, expected) {
  const ok = actual === expected;
  if (ok) pass += 1;
  else fail += 1;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}  (got ${actual}, want ${expected})`);
}

async function login(identifier) {
  const res = await fetch(`${API}/auth/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: PASSWORD }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`login failed for ${identifier}: ${JSON.stringify(body)}`);
  return body.jwt;
}

const call = (path, jwt, init = {}) =>
  fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      ...init.headers,
    },
  });

/** Next occurrence of `weekday` at `hour`:00 India time, as a UTC ISO string. */
function nextSlot(weekday, hour) {
  const IST_OFFSET_MIN = 5 * 60 + 30;
  const now = new Date();
  for (let days = 1; days <= 14; days += 1) {
    const candidate = new Date(now.getTime() + days * 86_400_000);
    // Shift into IST to read the weekday the mentor published availability for.
    const ist = new Date(candidate.getTime() + IST_OFFSET_MIN * 60_000);
    if (ist.getUTCDay() !== weekday) continue;
    const utcMillis = Date.UTC(
      ist.getUTCFullYear(),
      ist.getUTCMonth(),
      ist.getUTCDate(),
      hour,
      0,
      0
    ) - IST_OFFSET_MIN * 60_000;
    return new Date(utcMillis).toISOString();
  }
  throw new Error('no slot found');
}

async function main() {
  const [one, two, asha] = await Promise.all([
    login('student.one@example.com'),
    login('student.two@example.com'),
    login('mentor.asha@example.com'),
  ]);
  console.log('logged in: student one, student two, mentor Asha\n');

  // Asha is available Monday / Wednesday / Friday, 10:00–17:00 IST.
  const monday11 = nextSlot(1, 11);
  const sunday11 = nextSlot(0, 11);
  const monday22 = nextSlot(1, 22);

  console.log('--- booking creation ---');
  const created = await call('/session-bookings', one, {
    method: 'POST',
    body: JSON.stringify({
      data: { mentor: 'asha-verma', scheduled_at: monday11, topic: 'B.Tech options' },
    }),
  });
  const createdBody = await created.json();
  check('student one books a valid slot', created.status, 201);
  const bookingId = createdBody?.data?.documentId;
  check('new booking starts as "requested"', createdBody?.data?.status, 'requested');

  console.log('\n--- slot validation ---');
  const offDay = await call('/session-bookings', one, {
    method: 'POST',
    body: JSON.stringify({ data: { mentor: 'asha-verma', scheduled_at: sunday11 } }),
  });
  check('rejects a day the mentor is not available', offDay.status, 400);

  const offHours = await call('/session-bookings', one, {
    method: 'POST',
    body: JSON.stringify({ data: { mentor: 'asha-verma', scheduled_at: monday22 } }),
  });
  check('rejects a time outside published hours', offHours.status, 400);

  const past = await call('/session-bookings', one, {
    method: 'POST',
    body: JSON.stringify({ data: { mentor: 'asha-verma', scheduled_at: '2020-01-06T05:30:00Z' } }),
  });
  check('rejects a time in the past', past.status, 400);

  const clash = await call('/session-bookings', two, {
    method: 'POST',
    body: JSON.stringify({ data: { mentor: 'asha-verma', scheduled_at: monday11 } }),
  });
  check('rejects a double booking of the same slot', clash.status, 400);

  console.log('\n--- ownership: student two must not reach student one\'s booking ---');
  const twoList = await call('/session-bookings', two).then((r) => r.json());
  check('student two\'s list is empty', twoList?.data?.length ?? -1, 0);

  const twoRead = await call(`/session-bookings/${bookingId}`, two);
  check('student two cannot read it by id', twoRead.status, 404);

  const twoUpdate = await call(`/session-bookings/${bookingId}`, two, {
    method: 'PUT',
    body: JSON.stringify({ data: { status: 'cancelled' } }),
  });
  check('student two cannot change its status', twoUpdate.status, 404);

  const anonList = await call('/session-bookings', null);
  check('anonymous cannot list bookings', anonList.status, 403);

  console.log('\n--- status transitions ---');
  const studentConfirm = await call(`/session-bookings/${bookingId}`, one, {
    method: 'PUT',
    body: JSON.stringify({ data: { status: 'confirmed' } }),
  });
  check('student cannot confirm their own booking', studentConfirm.status, 400);

  const mentorConfirm = await call(`/session-bookings/${bookingId}`, asha, {
    method: 'PUT',
    body: JSON.stringify({ data: { status: 'confirmed' } }),
  });
  check('mentor can confirm it', mentorConfirm.status, 200);

  const mentorList = await call('/session-bookings', asha).then((r) => r.json());
  // The database is not reset between runs, so this asserts the booking is
  // present rather than that it is the only one.
  const seen = (mentorList?.data ?? []).some(
    (booking) => booking.documentId === bookingId
  );
  check('mentor sees this booking in their list', seen, true);
  check(
    'mentor sees a student name, not an email',
    typeof mentorList?.data?.[0]?.student?.name === 'string' &&
      !JSON.stringify(mentorList.data).includes('@'),
    true
  );

  const studentCancel = await call(`/session-bookings/${bookingId}`, one, {
    method: 'PUT',
    body: JSON.stringify({ data: { status: 'cancelled' } }),
  });
  check('student can cancel a confirmed booking', studentCancel.status, 200);

  console.log('\n--- profiles ---');
  const otherProfile = await call('/student-profiles', one);
  check('the collection route is closed off', otherProfile.status, 403);

  const mine = await call('/student-profiles/me', one);
  check('own profile is reachable', mine.status, 200);

  const mentorMeAsStudent = await call('/mentor-profiles/me', one).then((r) => r.json());
  check('a student has no mentor profile', mentorMeAsStudent?.data, null);

  const selfPromote = await call('/mentor-profiles/me', one, {
    method: 'PUT',
    body: JSON.stringify({ data: { headline: 'I am now an advisor' } }),
  });
  check('a student cannot make themselves a mentor', selfPromote.status, 403);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
