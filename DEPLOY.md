# Deploy Guide (Fast)

## Option 1: GitHub Pages (Recommended)
1. Push project to a GitHub repo.
2. Ensure default branch is `main`.
3. In GitHub repo: Settings > Pages > Build and deployment = GitHub Actions.
4. Workflow `.github/workflows/deploy-pages.yml` will deploy automatically.
5. Your site URL will be available in Actions/Pages.

## Option 2: Netlify
1. Drag and drop this folder to Netlify OR connect Git repo.
2. Publish directory: `.`
3. No build command needed.

## Final step after getting public URL
1. Update `robots.txt` and `sitemap.xml` with real domain replacing `https://your-domain.com`.
2. Re-deploy.
