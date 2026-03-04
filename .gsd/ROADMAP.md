# ROADMAP.md

> **Current Phase**: Phase 1
> **Milestone**: v2.0 (Next.js Hosting on Vercel)

## Must-Haves (from SPEC)
- [ ] Next.js app deployed and accessible on Vercel
- [ ] Auto-deploy on push to `anuj` (or `main`) branch
- [ ] Environment variables configured for production Firebase
- [ ] Custom domain (if available) or Vercel URL working

## Phases

### Phase 1: Vercel Deployment & CI/CD
**Status**: 🔄 In Progress
**Objective**: Deploy the Campus Compass Next.js app to Vercel with auto-deploy from GitHub, configure production environment variables, and verify live deployment.

### Phase 2: VPS SSL & Domains
**Status**: ✅ Complete
**Objective**: Validate Cloudflare to Nginx reverse proxy routing and correctly bind the Nginx systemd service on ports 80 and 443. Adjust frontend environment variables to point to the `thanganat25.com` secure URLs, fixing Mixed Content errors.
