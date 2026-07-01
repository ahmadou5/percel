# Driver App Implementation Tracker

Created: 2026-07-01

## Selected Work

- [x] Finish driver KYC properly
- [x] Remove demo data leaks in real screens
- [ ] Clean up dispatch/order acceptance flow

## Full Audit List

1. [x] Finish Driver KYC properly
   - Current issue: NIN/BVN screens mark verification as done locally when the API fails.
   - Current issue: document upload uses pasted/sample URLs instead of real camera/gallery upload.
   - Needed: real image picker/camera, multipart upload to `/api/v1/driver/kyc/upload`, no preview-mode bypass, correct pending/approved/rejected status handling.

2. [x] Fix demo data leaks in real screens
   - Current issue: earnings/profile/home fall back to `demoWallet`, fake delivery counts, fake rating, and sample vehicle/license data.
   - Needed: loading, empty, and error states instead of fake production-looking values.

3. [ ] Clean up dispatch/order acceptance flow
   - Current issue: Home and `two.tsx` both present job surfaces, but `two.tsx` is not exposed in tabs.
   - Current issue: decline/timeout behavior emits a socket status update instead of using a backend decline endpoint.
   - Needed: one clear dispatch surface, exposed consistently, with proper accept/decline/timeout behavior.

4. [ ] Add real navigation to pickup/dropoff
5. [ ] Add delivery proof
6. [ ] Driver withdrawal flow
7. [ ] Better active order recovery
8. [ ] Improve error handling for network/API failures
9. [ ] Notifications polish
10. [ ] Code cleanup before bigger work

## Implementation Log

### 2026-07-01

- Created tracker.
- Completed KYC mobile wiring: removed preview-mode bypasses, added real NIN/BVN verification handling, added camera/gallery document upload to `/api/v1/driver/kyc/upload`, and submit-for-review flow.
- Removed demo-data fallbacks from driver Home, Earnings, Profile, and login location hydration. Missing wallet/profile/location data now renders as empty/loading values instead of fake production values.
