import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Briefcase, Users, FolderKanban, Clock, FileText, ArrowRight } from 'lucide-react';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">FreelanceFlow</span>
          </div>
          <Button asChild>
            <Link to="/auth">Get Started</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
            Manage your freelance
            <span className="text-gradient"> business</span> with ease
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Track clients, projects, time, and invoices—all in one place. Built for freelancers who want to focus on what they do best.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/auth">
                Start Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Everything you need</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Users, title: 'Client Management', desc: 'Keep all client info organized' },
              { icon: FolderKanban, title: 'Project Tracking', desc: 'Kanban boards & task lists' },
              { icon: Clock, title: 'Time Tracking', desc: 'Track billable hours easily' },
              { icon: FileText, title: 'Invoicing', desc: 'Create & send invoices fast' },
            ].map((f) => (
              <div key={f.title} className="bg-card p-6 rounded-xl shadow-sm">
                <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2024 FreelanceFlow. Built with Lovable.
        </div>
      </footer>
    </div>
  );
}
