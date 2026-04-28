import { Alert, Card, Input, Label, LinkButton } from "@/components/ui";

export default function SignupPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-md content-center px-4 py-10">
      <Card>
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="mt-2 text-sm text-muted-foreground">Account creation is ready for a Clerk or Auth.js adapter.</p>
        <div className="mt-4">
          <Alert
            title="Signup is not connected yet"
            message="Use the seeded auth flow or connect the chosen auth provider before opening public registration."
          />
        </div>
        <form className="mt-6 grid gap-4">
          <div>
            <Label>Email</Label>
            <Input type="email" placeholder="you@example.com" disabled />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" placeholder="••••••••" disabled />
          </div>
          <LinkButton href="/auth/login" className="w-full">
            Go to sign in
          </LinkButton>
        </form>
      </Card>
    </main>
  );
}
