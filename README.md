# Commitline

**Show your momentum. Prove your compounding progress.**

Commitline transforms your GitHub commit history into a visual timeline of momentum, making exponential growth obvious and shareable.

## Features

- **Timeline Visualization** - See your commits as a cumulative line chart over time, with emphasis on slope change (momentum)
- **Velocity Metrics** - Track weekly/monthly commit rates and growth percentage vs prior periods
- **Export & Share** - Export as PNG (optimized for social sharing) or generate public shareable links
- **Repository Filtering** - Select which repositories to include in your visualization
- **Date Range Presets** - Quick filters for 7 days, 30 days, 1 year, or custom date ranges

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Charts**: Recharts
- **Authentication**: NextAuth.js with GitHub OAuth
- **Export**: html2canvas for PNG generation

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- GitHub account

### Installation

```bash
cd git-commit-tracker
npm install
```

### Environment Configuration

1. Copy the example environment file:

```bash
cp .env.example .env.local
```

2. Create a GitHub OAuth App:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click **OAuth Apps** > **New OAuth App**
   - Fill in the application details:
     - **Application name**: Commitline (or your preferred name)
     - **Homepage URL**: `http://localhost:3000`
     - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
   - Click **Register application**
   - Copy the **Client ID** and generate a new **Client Secret**

3. Generate a NextAuth secret:

```bash
openssl rand -base64 32
```

4. Update `.env.local` with your values:

```bash
# GitHub OAuth App credentials
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret

# NextAuth secret - the value you generated above
NEXTAUTH_SECRET=your_generated_secret

# NextAuth URL
NEXTAUTH_URL=http://localhost:3000
```

### Running Development Server

```bash
cd git-commit-tracker
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Other Commands

```bash
# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Type check
npx tsc --noEmit
```

## Deploying to Netlify

### Option 1: Deploy via Netlify CLI

1. Install Netlify CLI:

```bash
npm install -g netlify-cli
```

2. Build the project:

```bash
cd git-commit-tracker
npm run build
```

3. Deploy:

```bash
netlify deploy --prod
```

### Option 2: Deploy via Netlify Dashboard

1. Push your code to a GitHub repository

2. Go to [Netlify](https://app.netlify.com) and click **Add new site** > **Import an existing project**

3. Connect your GitHub repository

4. Configure build settings:
   - **Base directory**: `git-commit-tracker`
   - **Build command**: `npm run build`
   - **Publish directory**: `git-commit-tracker/.next`

5. Add environment variables in **Site settings** > **Environment variables**:
   - `GITHUB_ID` - Your GitHub OAuth Client ID
   - `GITHUB_SECRET` - Your GitHub OAuth Client Secret
   - `NEXTAUTH_SECRET` - Your generated secret
   - `NEXTAUTH_URL` - Your Netlify site URL (e.g., `https://your-site.netlify.app`)

6. Update your GitHub OAuth App callback URL:
   - Go back to your [GitHub OAuth App settings](https://github.com/settings/developers)
   - Update **Authorization callback URL** to: `https://your-site.netlify.app/api/auth/callback/github`

7. Trigger a redeploy from the Netlify dashboard

### Netlify Configuration File

Create `netlify.toml` in the repository root for consistent deployments:

```toml
[build]
  base = "git-commit-tracker"
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Install the Next.js plugin:

```bash
npm install -D @netlify/plugin-nextjs
```

## Project Structure

```
git-commit-tracker/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/  # NextAuth route handler
│   │   │   └── share/               # Share link API
│   │   ├── actions/                 # Server actions
│   │   ├── dashboard/               # Protected dashboard
│   │   ├── login/                   # Login page
│   │   ├── share/[id]/              # Public share view
│   │   └── page.tsx                 # Landing page
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components
│   │   ├── date-range-picker.tsx    # Date filtering
│   │   ├── export-button.tsx        # PNG export
│   │   ├── repo-selector.tsx        # Repository multi-select
│   │   ├── share-button.tsx         # Share link generation
│   │   ├── timeline-chart.tsx       # Commit timeline chart
│   │   └── velocity-metrics.tsx     # Metrics cards
│   ├── hooks/
│   │   └── use-media-query.ts       # Responsive UI hook
│   └── lib/
│       ├── auth.ts                  # NextAuth configuration
│       └── github.ts                # GitHub API client
├── .env.example                     # Environment template
└── package.json
```

## User Flow

1. Sign in with GitHub OAuth
2. Select repositories to visualize
3. Choose a date range (presets or custom)
4. View your commit timeline and velocity metrics
5. Export as PNG or generate a shareable public link

## License

MIT
