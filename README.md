# CodeSaga

Learn tech stacks by building real applications, one story-driven task at a time.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- Clerk Authentication
- GROQ API

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database
- Clerk account
- GROQ API key

### Installation

1. Clone the repository and install dependencies:

```bash
pnpm install
```

2. Copy the environment variables:

```bash
cp .env.example .env.local
```

3. Fill in your environment variables in `.env.local`:

- `DATABASE_URL`: Your PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: From Clerk dashboard
- `CLERK_SECRET_KEY`: From Clerk dashboard
- `CLERK_WEBHOOK_SECRET`: From Clerk webhook settings
- `GROQ_API_KEY`: Your GROQ API key

4. Set up the database:

```bash
pnpm prisma migrate dev --name init
```

5. Configure Clerk webhook:

- Go to your Clerk dashboard
- Navigate to Webhooks
- Add endpoint: `https://your-domain.com/api/webhooks/clerk`
- Subscribe to events: `user.created`, `user.updated`
- Copy the signing secret to `CLERK_WEBHOOK_SECRET`

6. Seed the database with initial stacks:

```bash
pnpm db:seed
```

7. Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
codesaga/
├── app/
│   ├── api/
│   │   └── webhooks/
│   │       └── clerk/          # Clerk webhook handler
│   ├── dashboard/              # Protected dashboard
│   ├── sign-in/                # Sign-in page
│   ├── sign-up/                # Sign-up page
│   └── page.tsx                # Public home page
├── lib/
│   └── prisma.ts               # Prisma client singleton
├── prisma/
│   └── schema.prisma           # Database schema
└── middleware.ts               # Route protection
```

## Database Schema

- **User**: Synced from Clerk authentication
- **Stack**: Learning tracks (e.g., Express.js, Next.js)
- **Enrollment**: User enrollment in a stack
- **Session**: Learning sessions within an enrollment
- **Task**: Individual tasks within a stack
- **TaskAttempt**: User attempts at tasks
- **ConceptProgress**: Tracks user understanding of concepts

## License

MIT
