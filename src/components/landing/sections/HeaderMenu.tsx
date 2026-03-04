"use client";

import * as React from "react";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { siteConfig } from "@/lib/landingConfig";
import { cn } from "@/lib/utils";

export default function HeaderMenu() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        {siteConfig.header.map((item, index) => (
          <NavigationMenuItem key={index}>
            {"trigger" in item && item.trigger ? (
              <>
                <NavigationMenuTrigger>{item.trigger}</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul
                    className={`grid gap-3 p-6 ${
                      (item as any).content?.main
                        ? "md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]"
                        : "w-[400px] md:w-[500px] md:grid-cols-2 lg:w-[600px]"
                    }`}
                  >
                    {(item as any).content?.main && (
                      <li className="row-span-3">
                        <NavigationMenuLink
                          href={(item as any).content.main.href}
                          className="flex h-full w-full select-none flex-col justify-end rounded-md bg-primary/10 from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                        >
                          {(item as any).content.main.icon}
                          <div className="mb-2 mt-4 text-lg font-medium">
                            {(item as any).content.main.title}
                          </div>
                          <p className="text-sm leading-tight text-muted-foreground">
                            {(item as any).content.main.description}
                          </p>
                        </NavigationMenuLink>
                      </li>
                    )}
                    {(item as any).content?.items?.map(
                      (
                        subItem: {
                          title: string;
                          href: string;
                          description: string;
                        },
                        subIndex: number,
                      ) => (
                        <li key={subIndex}>
                          <NavigationMenuLink
                            href={subItem.href}
                            className={cn(
                              "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                            )}
                          >
                            <div className="text-sm font-medium leading-none">
                              {subItem.title}
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              {subItem.description}
                            </p>
                          </NavigationMenuLink>
                        </li>
                      ),
                    )}
                  </ul>
                </NavigationMenuContent>
              </>
            ) : (
              <NavigationMenuLink
                href={(item as any).href || "#"}
                className={navigationMenuTriggerStyle()}
              >
                {(item as any).label}
              </NavigationMenuLink>
            )}
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

