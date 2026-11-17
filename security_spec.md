# Samajh Firestore Security Specification

## Data Invariants
1. User profile documents at `/users/{userId}` contain PII (`email`, `displayName`, `photoURL`) and are readable and writable exclusively by the verified owner (`request.auth.uid == userId && request.auth.token.email_verified == true`). Collection listing on `/users` is denied.
2. Saved analysis documents at `/users/{userId}/analyses/{analysisId}` cannot exist without a verified parent profile at `/users/{userId}` (Master Gate) and must bind `userId == request.auth.uid`.
3. `createdAt`, `uid`, `id`, and `userId` are immutable after creation; `createdAt` and `updatedAt` must equal `request.time`.
4. All strings and arrays enforce strict `.size()` bounds (`deadlines`, `money`, `risks`, `steps`, `completedSteps` <= 20) and `keys().hasOnly(...)` prevents shadow fields.

## Dirty Dozen Adversarial Payloads
1. Unauthenticated read/write to `/users/{userId}` -> `PERMISSION_DENIED`.
2. Unverified email token (`email_verified: false`) writing `/users/{uid}` -> `PERMISSION_DENIED`.
3. Authenticated user A reading `/users/{userB}` (PII leak) -> `PERMISSION_DENIED`.
4. Authenticated user listing `/users` collection -> `PERMISSION_DENIED`.
5. Shadow field (`role: "admin"` or `isAdmin: true`) on `/users/{uid}` create -> `PERMISSION_DENIED`.
6. Identity spoofing (`uid: "otherUser"` or `userId: "otherUser"`) -> `PERMISSION_DENIED`.
7. Creating `/users/{uid}/analyses/{id}` when parent `/users/{uid}` does not exist -> `PERMISSION_DENIED`.
8. Oversized document ID (`> 128` chars) or invalid characters (`../`) -> `PERMISSION_DENIED`.
9. Oversized `summary` (`> 1600` chars) or `steps` array (`> 20` items) -> `PERMISSION_DENIED`.
10. Client-forged timestamp (`createdAt != request.time` or `updatedAt != request.time`) -> `PERMISSION_DENIED`.
11. Mutating immutable `userId` or `createdAt` during `analyses` update -> `PERMISSION_DENIED`.
12. Ghost field injection during update (`affectedKeys().hasOnly(...)` violation) -> `PERMISSION_DENIED`.
