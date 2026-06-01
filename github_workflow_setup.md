# CounselWise - Enterprise Git Workflow & CI/CD Pipeline Guide

This document establishes the official branch strategy, Pull Request review protocols, branch protection regulations, and CI/CD automation flows for the CounselWise repository.

---

## 1. Branch Strategy

To maintain a clean, stable repository history and guarantee smooth builds on `main`, developers must adhere strictly to the following branch strategy:

### Naming Conventions
All branch creation must use one of the following prefix namespaces based on the type of work:
* `feature/<name>`: For implementing new options, UI page configurations, or core features.
  * *Example*: `feature/mobile-drawer`, `feature/rank-card`
* `fix/<name>`: For resolving issues, UI styling errors, or authentication regressions.
  * *Example*: `fix/auth-roles`, `fix/predictor-filtering`
* `hotfix/<name>`: For high-priority production patches that need immediate deployment.
  * *Example*: `hotfix/session-leak`

### Workflow Process
1. **Never commit or push directly to `main`**.
2. Create your branch locally:
   ```bash
   git checkout -b feature/my-new-feature
   ```
3. Commit and push your local branch changes to remote origin:
   ```bash
   git add .
   git commit -m "feat: implement my new option"
   git push -u origin feature/my-new-feature
   ```

---

## 2. GitHub Branch Protection Policy (Admin Actions Required)

To guarantee that code meets high-quality requirements and goes through checks before entering production, configure the following Branch Protection Rules on your GitHub repository page:

### Step-by-Step GitHub Setup
1. Go to your repository page on GitHub.
2. Select **Settings** (gear icon in the top bar).
3. Select **Branches** in the left sidebar menu.
4. Click **Add branch protection rule** next to *Branch protection rules*.
5. Set **Branch name pattern** to: `main`
6. Check the following settings boxes:
   * **[✓] Require a pull request before merging**
     * **[✓] Require approvals** (Set *Required number of approvals before merging* to `1` or more)
     * **[✓] Dismiss stale pull request approvals when new commits are pushed** (Invalidates stale reviews if code changes)
   * **[✓] Require status checks to pass before merging**
     * **[✓] Require branches to be up to date before merging** (Enforces branches to merge latest `main` changes before merging)
     * Add `Build & Validate Codebase` as a required status check in the search input once your GitHub Action runs for the first time.
   * **[✓] Block force pushes** (Prevents histories from getting overwritten)
     * *Disable "Allow force pushes" for all users including admins.*
   * **[✓] Block deletions** (Prevents `main` branch from getting deleted)

---

## 3. Merge Policy & Conflict Resolution

If a Pull Request has conflicts with the `main` branch:
* **The PR cannot be merged directly.**
* You must update your branch locally, resolve the conflicts, and re-run all validation checks.

### Conflict Resolution Guide
Follow these standard terminal operations to resolve conflicts safely:
1. Fetch all latest repository branches:
   ```bash
   git fetch origin
   ```
2. Switch to the branch you are working on:
   ```bash
   git checkout feature/my-new-feature
   ```
3. Merge the latest changes from `main` into your feature branch:
   ```bash
   git merge origin/main
   ```
4. Git will mark conflict sections inside files with:
   ```text
   <<<<<<< HEAD
   [Your local changes]
   =======
   [Changes from main]
   >>>>>>> origin/main
   ```
5. Open the conflicting files in your editor, choose the correct lines to retain, delete the conflict indicators, and save.
6. Stage and commit your resolved files:
   ```bash
   git add .
   git commit -m "chore: resolve merge conflicts with main"
   ```
7. Push the resolved commits to remote origin to automatically re-trigger all Pull Request Checks:
   ```bash
   git push origin feature/my-new-feature
   ```

---

## 4. Automated CI/CD Pipeline (GitHub Actions)

We have pre-configured two workflows inside the `.github/workflows/` directory:

### PR Check Workflow (`pr-check.yml`)
* **Trigger**: Automatically runs on every `pull_request` targeting `main`.
* **Actions**: Installs dependencies on root, server, and client directories, executes client eslint checks, and runs client production builds.
* **Fail Policy**: If any lint error or build failure occurs, the PR status check fails, and merging is blocked.

### Deploy Workflow (`deploy.yml`)
* **Trigger**: Automatically runs on a `push` to `main` (which includes successfully merged pull requests).
* **Actions**: Builds the live web production bundle and deploys the assets to your host server.
* **Hosting Integration**: 
  * If using **Vercel**, add a `VERCEL_TOKEN` secret to your repository settings and add `npx vercel --token ${{ secrets.VERCEL_TOKEN }} --prod` to the Deploy step.
  * If using **Render**, configure a Deploy Hook and trigger it in the Deploy step using `curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}`.
