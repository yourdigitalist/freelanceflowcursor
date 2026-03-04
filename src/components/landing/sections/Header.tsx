"use client";

import { AppLogo } from "@/components/AppLogo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLandingContent } from "@/hooks/useLandingContent";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MobileDrawer from "./MobileDrawer";
import HeaderMenu from "./HeaderMenu";

export default function Header() {
  const [addBorder, setAddBorder] = useState(false);
  const { data: content } = useLandingContent();
  const header = content?.header;

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setAddBorder(true);
      } else {
        setAddBorder(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 py-3 bg-white/80 backdrop-blur">
      <div className="flex justify-between items-center container mx-auto">
        <Link
          to="/"
          title="brand-logo"
          className="relative mr-6 flex items-center space-x-2"
        >
          <AppLogo full height={40} />
        </Link>

        <div className="hidden lg:block">
          <div className="flex items-center ">
            <nav className="mr-10">
              <HeaderMenu />
            </nav>

            <div className="gap-2 flex">
              <Link
                to="/auth"
                className={buttonVariants({ variant: "outline" })}
              >
                {header?.ctaLogin || "Login"}
              </Link>
              <Link
                to="/auth"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "w-full sm:w-auto text-background",
                )}
              >
                {header?.ctaTrial || "Get Started for Free"}
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-2 cursor-pointer block lg:hidden">
          <MobileDrawer />
        </div>
      </div>
      <hr
        className={cn(
          "absolute w-full bottom-0 transition-opacity duration-300 ease-in-out",
          addBorder ? "opacity-100" : "opacity-0",
        )}
      />
    </header>
  );
}

