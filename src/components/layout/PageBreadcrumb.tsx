import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';

export type BreadcrumbSegment = {
  label: string;
  href?: string;
};

type PageBreadcrumbProps = {
  items: BreadcrumbSegment[];
  className?: string;
};

export function PageBreadcrumb({ items, className }: PageBreadcrumbProps) {
  if (items.length === 0) return null;

  const lastIndex = items.length - 1;

  return (
    <Breadcrumb className={cn('mb-2', className)}>
      <BreadcrumbList className="flex-nowrap gap-1 text-sm text-muted-foreground sm:gap-1.5">
        {items.map((item, index) => {
          const isLast = index === lastIndex;
          const isLink = !isLast && Boolean(item.href);

          return (
            <Fragment key={`${item.label}-${index}`}>
              {index > 0 ? (
                <BreadcrumbSeparator className="[&>svg]:hidden">
                  <span className="text-muted-foreground/80">/</span>
                </BreadcrumbSeparator>
              ) : null}
              <BreadcrumbItem className="min-w-0">
                {isLink ? (
                  <BreadcrumbLink asChild className="font-normal">
                    <Link to={item.href!} className="truncate max-w-[12rem] sm:max-w-none">
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="truncate font-medium text-foreground max-w-[14rem] sm:max-w-none">
                    {item.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
