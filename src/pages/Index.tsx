import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Briefcase,
  ArrowRight,
  Check,
  ListTodo,
  Clock,
  MessageSquare,
  FileText,
  Palette,
  Code2,
  Megaphone,
  Sparkles,
  HardDrive,
} from 'lucide-react';

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
          <Button asChild className="rounded-full">
            <Link to="/auth">Start free 15-day trial</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            One workflow. From work to payment.
          </h1>
          <p className="text-lg text-muted-foreground mb-4">
            FreelanceFlow is built for freelancers who bill time and deliver creative work.
          </p>
          <p className="text-lg text-muted-foreground mb-8">
            Track tasks. Capture feedback. Send invoices. Get paid.
            <br />
            All in one place.
          </p>
          <p className="text-sm font-medium text-foreground mb-8">
            Run a real project. Free for 15 days.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link to="/auth">
                Start free 15-day trial <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-full">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Sub-hero: Pain acknowledgement */}
      <section className="py-16 lg:py-20 bg-muted/40">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="text-2xl lg:text-3xl font-bold mb-8">
            If this feels familiar, this tool is for you.
          </h2>
          <div className="space-y-4 text-muted-foreground text-lg">
            <p>You manage tasks in one tool.</p>
            <p>Track time somewhere else.</p>
            <p>Send files for review by email.</p>
            <p>Invoice in another app.</p>
            <p>Then chase feedback and payments manually.</p>
          </div>
          <p className="text-xl font-semibold text-foreground mt-8 mb-4">It's messy.</p>
          <p className="text-xl font-semibold text-foreground mb-4">It wastes time.</p>
          <p className="text-xl font-semibold text-foreground mb-8">And things fall through the cracks.</p>
          <p className="text-lg font-medium text-primary">
            FreelanceFlow replaces that chaos with one clear workflow.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 lg:py-24 scroll-mt-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-4">
            From task to payment. No gaps.
          </h2>
          <p className="text-muted-foreground text-center text-lg mb-16">How it works</p>

          <div className="grid gap-12 lg:gap-16 max-w-4xl mx-auto">
            {[
              {
                step: '1',
                title: 'Plan the work',
                bullets: [
                  'Create projects and tasks.',
                  'Use list or Kanban view.',
                  'Set due dates, urgency, and status.',
                ],
                icon: ListTodo,
              },
              {
                step: '2',
                title: 'Track your time',
                bullets: [
                  'Start a timer or log time manually.',
                  'Link time to tasks and projects.',
                  'Mark time as billable or non-billable.',
                ],
                icon: Clock,
              },
              {
                step: '3',
                title: 'Send files for review',
                bullets: [
                  'Upload designs, documents, or assets.',
                  'Share a public review link.',
                  'Clients comment directly on files.',
                  'Approve or request changes in one place.',
                ],
                icon: MessageSquare,
              },
              {
                step: '4',
                title: 'Invoice without rework',
                bullets: [
                  'Turn tracked time into invoices.',
                  'Add tasks or time entries as line items.',
                  'Send invoices with automated reminders.',
                  "Know what's sent, paid, or overdue.",
                ],
                icon: FileText,
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {item.step}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <item.icon className="h-5 w-5 text-primary" />
                    {item.title}
                  </h3>
                  <ul className="space-y-2 text-muted-foreground">
                    {item.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center font-medium text-foreground mt-12">One flow.</p>
          <p className="text-center font-medium text-foreground">No exporting.</p>
          <p className="text-center font-medium text-foreground">No copy-paste.</p>
          <p className="text-center font-medium text-foreground mb-0">No chasing.</p>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-16 lg:py-24 bg-muted/40">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Who it's for</h2>

          <h3 className="text-xl font-semibold mb-4">Built for freelancers who:</h3>
          <ul className="space-y-2 text-muted-foreground mb-10">
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              Sell their time and deliverables
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              Work with clients, not internal teams
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              Deal with revisions, approvals, and feedback
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              Want fewer tools, not more features
            </li>
          </ul>

          <h3 className="text-xl font-semibold mb-4">Perfect for:</h3>
          <div className="flex flex-wrap gap-3 mb-10">
            {[
              { label: 'Designers', icon: Palette },
              { label: 'Web and brand freelancers', icon: Code2 },
              { label: 'Marketing consultants', icon: Megaphone },
              { label: 'Solo creatives', icon: Sparkles },
            ].map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium"
              >
                <item.icon className="h-4 w-4 text-primary" />
                {item.label}
              </span>
            ))}
          </div>

          <p className="text-muted-foreground text-center">
            Not built for large teams or corporate workflows.
          </p>
        </div>
      </section>

      {/* Why FreelanceFlow is different */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-6">Why FreelanceFlow is different</h2>
          <p className="text-muted-foreground mb-12">Most tools do one thing well.</p>
          <p className="text-lg font-medium mb-10">
            FreelanceFlow connects the moments that actually matter.
          </p>
          <ul className="space-y-4 text-left max-w-md mx-auto">
            <li className="flex items-center gap-3">
              <span className="text-primary font-semibold">Tasks</span>
              <span className="text-muted-foreground">connect to</span>
              <span className="text-primary font-semibold">time</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-primary font-semibold">Time</span>
              <span className="text-muted-foreground">connects to</span>
              <span className="text-primary font-semibold">invoices</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-primary font-semibold">Files</span>
              <span className="text-muted-foreground">connect to</span>
              <span className="text-primary font-semibold">approvals</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-primary font-semibold">Approvals</span>
              <span className="text-muted-foreground">connect to</span>
              <span className="text-primary font-semibold">getting paid</span>
            </li>
          </ul>
          <p className="text-lg font-semibold mt-10">Nothing slips through.</p>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-16 lg:py-24 bg-muted/40">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">
            Trusted by freelancers who value clarity
          </h2>
          <p className="text-muted-foreground text-center mb-12 text-sm">Placeholder testimonials — replace with real quotes when ready.</p>
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {[
              {
                quote: 'This finally replaced three tools I was juggling every day.',
                name: 'Name Surname',
                role: 'Freelance Designer',
              },
              {
                quote: 'Client feedback is no longer buried in emails. Huge time saver.',
                name: 'Name Surname',
                role: 'Brand Consultant',
              },
              {
                quote: "From tracked time to invoice in minutes. I didn't realise how broken my old setup was.",
                name: 'Name Surname',
                role: 'Marketing Freelancer',
              },
            ].map((t, i) => (
              <Card key={i} className="border-0 shadow-sm bg-card">
                <CardContent className="pt-6">
                  <p className="text-foreground mb-4">&ldquo;{t.quote}&rdquo;</p>
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Simple pricing. No nonsense.</h2>
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-primary/20 shadow-lg">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">Early Access Plan</CardTitle>
                <div className="pt-4">
                  <span className="text-4xl font-bold">$29</span>
                  <span className="text-muted-foreground"> / month</span>
                </div>
                <p className="text-muted-foreground text-sm">or</p>
                <p className="text-lg font-semibold">
                  $290 / year <span className="text-sm font-normal text-muted-foreground">(2 months free)</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm font-medium text-foreground">
                  15-day free trial. You won't be charged until it ends.
                </p>
                <p className="text-sm font-semibold">Includes:</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {[
                    'Unlimited clients',
                    'Unlimited projects',
                    'Task management (list + Kanban)',
                    'Time tracking (timer + manual)',
                    'Invoicing with reminders',
                    'Client file reviews and approvals',
                    'Custom invoice notes and emails',
                    'Active storage cap for review files',
                    'Cancel anytime',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground pt-2">
                  Early access pricing. Future price: $45 / month.
                </p>
                <Button size="lg" asChild className="w-full rounded-full mt-4">
                  <Link to="/auth">Start free 15-day trial</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Storage clarity */}
      <section className="py-16 lg:py-20 bg-muted/40">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-2xl font-bold text-center mb-6 flex items-center justify-center gap-2">
            <HardDrive className="h-6 w-6 text-primary" />
            About file storage
          </h2>
          <p className="text-muted-foreground text-center mb-4">
            FreelanceFlow includes active storage for client review files.
          </p>
          <p className="text-muted-foreground text-center mb-4">
            You can delete old files anytime to free up space. Most freelancers keep long-term
            assets in Google Drive or similar tools.
          </p>
          <p className="text-muted-foreground text-center mb-4">
            FreelanceFlow is your active workspace, not a file archive.
          </p>
          <p className="text-center font-medium text-foreground">Transparent. In your control.</p>
        </div>
      </section>

      {/* Trial reassurance */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4 max-w-xl text-center">
          <h2 className="text-2xl font-bold mb-6">Try it properly. No pressure.</h2>
          <ul className="space-y-3 text-muted-foreground mb-8">
            <li className="flex items-center justify-center gap-2">
              <Check className="h-5 w-5 text-primary shrink-0" />
              Full access for 15 days
            </li>
            <li className="flex items-center justify-center gap-2">
              <Check className="h-5 w-5 text-primary shrink-0" />
              You won't be charged until your trial ends
            </li>
            <li className="flex items-center justify-center gap-2">
              <Check className="h-5 w-5 text-primary shrink-0" />
              Cancel anytime
            </li>
            <li className="flex items-center justify-center gap-2">
              <Check className="h-5 w-5 text-primary shrink-0" />
              Keep your data when you upgrade
            </li>
          </ul>
          <p className="font-medium text-foreground">Run a real project before you decide.</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-28 bg-muted/40">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Stop juggling tools. Start finishing work.
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            FreelanceFlow helps you focus on the work that matters and get paid without friction.
          </p>
          <Button size="lg" asChild className="rounded-full">
            <Link to="/auth">
              Start your free 15-day trial <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <span className="font-semibold">FreelanceFlow</span>
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} FreelanceFlow.</p>
        </div>
      </footer>
    </div>
  );
}
