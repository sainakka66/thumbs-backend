/**
 * Verify razorpay_review can log in without MFA challenge on production API.
 */
const API = process.env.API_BASE || 'https://thumbs-backend.onrender.com';
const USERNAME = process.env.RAZORPAY_REVIEW_USERNAME || 'razorpay_review';
const PASSWORD = process.env.RAZORPAY_REVIEW_PASSWORD || 'ThumbsUp@RzpReview2026';

async function main() {
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    console.error('LOGIN FAILED', res.status, data);
    process.exit(1);
  }
  if (data.challengeRequired) {
    console.error('LOGIN BLOCKED BY MFA/DEVICE — review bypass not active on server');
    process.exit(1);
  }
  console.log('OK login', { role: data.role, perms: data.permissions?.length, hasPaymentsCreate: data.permissions?.includes('payments.create') });
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
