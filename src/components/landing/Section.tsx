interface SectionProps {
  id?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  // optional style to support background images for sections like CTA
  style?: React.CSSProperties;
}

export default function Section({
  id,
  title,
  subtitle,
  description,
  children,
  className,
  style,
}: SectionProps) {
  const sectionId = title ? title.toLowerCase().replace(/\s+/g, '-') : id;
  return (
    <section id={id || sectionId}>
      <div className={className} style={style}>
        <div className="relative container mx-auto px-4 py-16 max-w-7xl">
          {(title || subtitle || description) && (
            <div className="text-center space-y-4 pb-6 mx-auto">
              {title && (
                <h2 className="text-sm text-primary font-mono font-medium tracking-wider uppercase">
                  {title}
                </h2>
              )}
              {subtitle && (
                <h3 className="mx-auto mt-4 max-w-xs text-3xl font-semibold tracking-tight sm:max-w-none sm:text-4xl md:text-5xl">
                  {subtitle}
                </h3>
              )}
              {description && (
                <p className="mt-6 text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
                  {description}
                </p>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
