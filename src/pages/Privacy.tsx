import { Link } from 'react-router-dom';
import { AppLogo } from '@/components/AppLogo';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <AppLogo full height={24} />
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Back to home
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-2xl font-semibold mb-6">Privacy Policy</h1>
        <p className="text-muted-foreground">
          This page will be populated with your privacy policy. You can edit this content later.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          <Link to="/" className="text-primary hover:underline">Return to home</Link>
          {' · '}
          <Link to="/terms" className="text-primary hover:underline">Terms and Conditions</Link>
        </p>
      </main>
    </div>
  );
}
