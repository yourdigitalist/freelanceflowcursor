import { AppLogo } from "@/components/AppLogo";
import { useLandingContent } from "@/hooks/useLandingContent";
import { Link } from "react-router-dom";

export default function Footer() {
  const { data: content } = useLandingContent();
  const footer = content?.footer;

  return (
    <footer>
      <div className="max-w-6xl mx-auto py-16 sm:px-10 px-5 pb-0">
        <a
          href="/"
          title="Get Lance"
          className="relative mr-6 flex items-center space-x-2"
        >
          <AppLogo full height={40} />
        </a>

        <div className="mt-8 grid gap-8 md:grid-cols-2 pb-6">
          <div>
            <h2 className="font-semibold mb-2">About</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              {footer?.aboutText ||
                "Get Lance helps freelancers manage projects, time and billing in one place."}
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <h2 className="font-semibold mb-1">Contact</h2>
            <a
              href={`mailto:${footer?.contactEmail || "support@getlance.app"}`}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {footer?.contactEmail || "support@getlance.app"}
            </a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto border-t pt-4 pb-2 grid md:grid-cols-2 h-full justify-between w-full grid-cols-1 gap-2">
          <span className="text-sm tracking-tight text-foreground">
            Copyright © {new Date().getFullYear()}{" "}
            <Link to="/" className="cursor-pointer">
              {footer?.copyright || "Get Lance"}
            </Link>{" "}
            - All rights reserved
          </span>
          <ul className="flex justify-start md:justify-end text-sm tracking-tight text-foreground">
            {(footer?.links || []).map((link) => (
              <li key={link.href} className="mr-3 md:mx-4">
                <Link to={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

