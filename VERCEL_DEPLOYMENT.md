# Flowise UI Vercel Deployment Guide

## 🚀 Ready to Deploy to `flowise-ui-deploy.vercel.app`

Your Flowise UI is now fully configured and ready for deployment to Vercel!

## ✅ Pre-deployment Checklist

All the following have been completed and tested:

- [x] **Dependencies resolved** - Fixed all peer dependency conflicts
- [x] **Build process verified** - Both components and UI build successfully
- [x] **Vercel configuration optimized** - Updated `vercel.json` with pnpm commands
- [x] **Build optimization** - Added `.vercelignore` for faster deployments
- [x] **Package scripts updated** - Using pnpm consistently throughout

## 📋 Deployment Configuration

### Vercel Settings
```json
{
  "buildCommand": "pnpm run build:components && pnpm run build:ui",
  "outputDirectory": "packages/ui/build",
  "installCommand": "pnpm install",
  "framework": null
}
```

### Project Structure
```
/Users/marcusthomas/flowise/Flowise-1/
├── vercel.json           ✅ Configured
├── .vercelignore        ✅ Created
├── package.json         ✅ Updated scripts
└── packages/
    ├── components/      ✅ Build tested
    └── ui/             ✅ Build tested
        └── build/      ✅ Ready for deployment
```

## 🚀 Deployment Steps

### Option 1: Vercel CLI (Fastest)
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Navigate to your project
cd /Users/marcusthomas/flowise/Flowise-1

# Deploy to production
vercel --prod

# When prompted:
# - Link to existing project? Y
# - What's the name of your existing project? flowise-ui-deploy
```

### Option 2: Git-based Deployment (Recommended)
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your repository
5. Project name: **flowise-ui-deploy**
6. Vercel will auto-detect the `vercel.json` configuration
7. Click "Deploy"

### Option 3: Manual Dashboard Setup
1. Go to Vercel dashboard
2. Create new project
3. Set these exact settings:
   - **Project Name**: `flowise-ui-deploy`
   - **Framework**: Other
   - **Build Command**: `pnpm run build:components && pnpm run build:ui`
   - **Output Directory**: `packages/ui/build`
   - **Install Command**: `pnpm install`

## 🌐 Your Deployment URLs

- **Production**: `https://flowise-ui-deploy.vercel.app`
- **Preview**: Auto-generated for each push
- **API Proxy**: Routes to `https://flowise-ai-cqlx.onrender.com/api/v1/`

## 🔧 API Configuration

The current setup automatically proxies API calls:
```
/api/* → https://flowise-ai-cqlx.onrender.com/api/v1/*
```

To change the API endpoint, edit `vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-new-api-endpoint.com/api/v1/:path*"
    }
  ]
}
```

## 🎯 Expected Results

After successful deployment:
- ✅ App loads at `flowise-ui-deploy.vercel.app`
- ✅ All static assets serve correctly
- ✅ API calls proxy to backend
- ✅ No console errors
- ✅ Fast loading times (optimized build)

## 🔍 Troubleshooting

### Build Failures
```bash
# Test builds locally first
pnpm install
pnpm run build:components
pnpm run build:ui
```

### Deployment Issues
- Check Vercel function logs
- Verify `vercel.json` syntax
- Ensure output directory exists: `packages/ui/build`

### Runtime Issues
- Check browser console for errors
- Verify API rewrite rules
- Test API endpoints directly

## 📊 Performance Optimizations

Already implemented:
- ✅ Tree-shaking enabled
- ✅ Code splitting active  
- ✅ Gzip compression
- ✅ Asset optimization
- ✅ Efficient chunking strategy

## 🔄 Continuous Deployment

For automatic deployments:
1. Connect your Git repository to Vercel
2. Enable auto-deployments
3. Every push to main branch will trigger a new deployment

## 📈 Monitoring

Access deployment analytics:
- **Vercel Analytics**: Built-in performance monitoring
- **Function Logs**: Real-time error tracking
- **Build Logs**: Deployment status and timing

---

## 🎉 You're All Set!

Your Flowise UI is production-ready and optimized for Vercel deployment. The build process has been tested and all dependencies are resolved.

**Next step**: Choose your deployment method above and deploy to `flowise-ui-deploy.vercel.app`!
