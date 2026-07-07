# Security Specification - CollabDocs

## Data Invariants
1. A workspace member can only be added by the workspace owner.
2. A document must belong to a valid workspace.
3. Access to a document is restricted to workspace members.
4. Users can only modify their own profiles.
5. Invoices and payments are only accessible by the owner or an admin.
6. Activities are immutable once created.
7. Comments must belong to a valid document.

## The "Dirty Dozen" Payloads (Deny cases)
1. **Identity Spoofing**: Attempt to create a user profile with a different UID than `request.auth.uid`.
2. **Privilege Escalation**: Attempt to update `plan` to 'premium' via client SDK.
3. **Workspace Hijack**: Attempt to update `ownerId` of a workspace by a non-owner.
4. **Member Injection**: Attempt to add a member to a workspace by a non-owner.
5. **Orphaned Document**: Attempt to create a document without a valid `workspaceId`.
6. **Cross-Workspace Access**: Attempt to read a document in a workspace the user is not a member of.
7. **Comment Forgery**: Attempt to create a comment with an `author` field that doesn't match the user's display name.
8. **Resource Poisoning**: Attempt to set a 1MB string as a document ID.
9. **State Shortcutting**: Attempt to set `isResolved` on a comment the user didn't author.
10. **Admin Claim Spoofing**: Attempt to perform admin actions without being in the `admins` collection.
11. **Immutable Violation**: Attempt to change `createdAt` on any document.
12. **Shadow Update**: Attempt to add a hidden `isVerified: true` field to a user profile.

## Test Runner Plan
The tests will verify that all above payloads result in `PERMISSION_DENIED`.
