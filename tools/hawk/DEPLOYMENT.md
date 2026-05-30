# Hawk - Deployment Guide

This guide provides instructions for deploying Hawk to various platforms.

## Prerequisites

- Node.js 12.0.0 or higher
- npm or yarn package manager
- Git for version control

## Local Development

### Setup

1. Clone the repository:
```bash
git clone https://github.com/Daemon22/hawk.git
cd hawk
```

2. Install dependencies (if using npm):
```bash
npm install
```

Or with yarn:
```bash
yarn install
```

### Running the Website Locally

1. Navigate to the website directory:
```bash
cd website
```

2. Start a local server (using Python):
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

3. Open your browser and navigate to `http://localhost:8000`

Alternatively, use Node.js http-server:
```bash
npm install -g http-server
http-server website -p 8000
```

## NPM Package Distribution

### Publishing to NPM

1. Update version in `package.json`:
```json
{
  "version": "1.0.0"
}
```

2. Create an NPM account at https://www.npmjs.com/

3. Login to NPM:
```bash
npm login
```

4. Publish the package:
```bash
npm publish
```

### Using Hawk from NPM

After publishing, users can install it with:
```bash
npm install hawk-device-detection
```

And use it in their projects:
```javascript
const DeviceMonitor = require('hawk-device-detection');

const monitor = new DeviceMonitor();
monitor.detect().then(profile => {
  console.log(profile);
});
```

## GitHub Pages Deployment

### Setup GitHub Pages

1. Push your code to GitHub:
```bash
git remote add origin https://github.com/yourusername/hawk.git
git branch -M main
git push -u origin main
```

2. In your GitHub repository settings:
   - Go to Settings → Pages
   - Select "main" branch as source
   - Select "website" folder as root directory
   - Save

3. Your site will be available at: `https://yourusername.github.io/hawk/`

## Netlify Deployment

### Using Netlify CLI

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Login to Netlify:
```bash
netlify login
```

3. Deploy:
```bash
netlify deploy --dir=website
```

### Using Netlify UI

1. Push your code to GitHub
2. Connect your GitHub repository to Netlify
3. Set build settings:
   - Build command: (leave empty)
   - Publish directory: `website`
4. Deploy

## Vercel Deployment

### Using Vercel CLI

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel --prod
```

### Using Vercel UI

1. Import your GitHub repository
2. Set project settings:
   - Framework: Other
   - Root Directory: `website`
3. Deploy

## Docker Deployment

### Create Dockerfile

Create a `Dockerfile` in the project root:

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install -g http-server

COPY . .

EXPOSE 8080

CMD ["http-server", "website", "-p", "8080"]
```

### Build and Run

```bash
# Build image
docker build -t hawk:latest .

# Run container
docker run -p 8080:8080 hawk:latest
```

## AWS S3 + CloudFront Deployment

### Setup S3 Bucket

1. Create S3 bucket:
```bash
aws s3 mb s3://hawk-website
```

2. Upload website files:
```bash
aws s3 sync website/ s3://hawk-website/
```

3. Enable static website hosting:
   - Go to S3 bucket → Properties → Static website hosting
   - Enable it and set index document to `index.html`

### Setup CloudFront

1. Create CloudFront distribution pointing to S3 bucket
2. Set default root object to `index.html`
3. Wait for distribution to deploy
4. Access your site via CloudFront URL

## Continuous Integration/Deployment (CI/CD)

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./website
```

## Environment Variables

For deployments that require configuration, create a `.env` file:

```
HAWK_DEBUG=false
HAWK_CACHE_TTL=300000
```

## Troubleshooting

### Website Not Loading

1. Check that all file paths are correct
2. Verify `hawk.js` is accessible from the website directory
3. Check browser console for errors
4. Ensure proper CORS headers if serving from different domain

### Module Import Issues

1. Verify `package.json` main entry points to `src/hawk.js`
2. Check Node.js version compatibility
3. Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### Performance Issues

1. Enable caching in DeviceMonitor options
2. Minify JavaScript files for production
3. Use CDN for static assets
4. Enable gzip compression on server

## Security Considerations

1. Keep dependencies updated: `npm audit` and `npm update`
2. Use HTTPS for all deployments
3. Implement Content Security Policy (CSP) headers
4. Validate and sanitize any user input
5. Keep API keys and secrets in environment variables

## Monitoring and Analytics

1. Add error tracking (e.g., Sentry)
2. Monitor performance with tools like Datadog
3. Track usage with Google Analytics or similar
4. Set up alerts for deployment failures

## Support and Issues

For deployment issues:
1. Check the EXAMPLES.md file
2. Review the README.md documentation
3. Open an issue on GitHub with details
4. Contact the Hael Foundation team

## Version Management

When deploying updates:

1. Update version in `package.json` following semantic versioning
2. Update CHANGELOG.md with changes
3. Tag release in Git: `git tag v1.0.1`
4. Push tags: `git push --tags`
5. Publish new version to NPM if applicable
