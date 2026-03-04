# Phase 5 Plan 1: CI/CD Pipeline

## Objective
Establish an automated path to production, ensuring that backend code changes are continuously integrated and deployed to the VPS without manual SSH intervention (per REQ-07).

## Tasks

### 1. Preparation
- Generate a new standard SSH ED25519 keypair specifically for GitHub Actions deployment (do not reuse the root key).
- Provide the public key to the user to place in the VPS `~/.ssh/authorized_keys`.
- Instruct the user to save the private key as a GitHub Repository Secret named `VPS_SSH_KEY`.
- Instruct the user to save the VPS IP address as a GitHub Repository Secret named `VPS_IP`.

### 2. GitHub Actions Workflow Generation
- Create `.github/workflows/deploy-backend.yml`.
- **Trigger**: The workflow should trigger on `push` to the `main` branch, but *only* if files within the `backend/` directory or `docker-compose.yml` are altered.
- **Jobs**:
  - `deploy`:
    - Check out the repository.
    - Setup SSH using the `appleboy/ssh-action` or a native script utilizing the repository secrets.
    - Execute a remote script over SSH on the VPS:
      1. Navigate to `/opt/campus-compass-docker` (or wherever the project lives on the VPS).
      2. Pull the latest `main` branch.
      3. Run `docker compose build backend`.
      4. Run `docker compose up -d backend`.

### 3. Verification
- We cannot fully test the Github Action from our local environment easily, so we will create a dummy commit to the backend, push it, and observe the GitHub action output together with the user.
