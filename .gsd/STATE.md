## Current Position
- **Milestone**: v3.0 (Firebase Auth Stream)
- **Phase**: 3.1 (Not Started)
- **Status**: Planning

## Last Session Summary
Phase 2 (SSL/Nginx) complete. New milestone v3.0 created to remove custom JWT auth and replace with direct Firebase idToken passed in stream URL. Phase plans written for 3.1 (backend) and 3.2 (frontend).

## Next Steps
1. `/execute 3.1` — Strip JWT from backend, update /stream-auth to use Firebase Admin verifyIdToken
2. `/execute 3.2` — Remove getStreamToken from frontend, use buildStreamUrl
3. Deploy backend changes to VPS and push frontend to Vercel
