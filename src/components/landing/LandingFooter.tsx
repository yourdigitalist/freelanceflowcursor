import { Link } from 'react-router-dom';
import { AppLogo } from '@/components/AppLogo';
import type { LandingContent } from '@/lib/landingContent';

export default function LandingFooter({ content }: { content: LandingContent['footer'] }) {
  return (
    <footer>
      <div className="max-w-6xl mx-auto py-16 sm:px-10 px-5 pb-0">
        <Link to="/" className="relative mr-6 flex items-center gap-2" title={content.copyright}>
          <AppLogo full height={40} />
          <span className="font-bold text-xl">{content.copyright}</span>
        </Link>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 mt-8">
          {content.links.map((link, i) => (
            <Link
              key={i}
              to={link.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="max-w-6xl mx-auto border-t py-6 mt-8">
          <span className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {content.copyright}
          </span>
        </div>
      </div>
    </footer>
  );
}
