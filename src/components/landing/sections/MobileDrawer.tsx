import { buttonVariants } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { siteConfig } from "@/lib/landingConfig";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { IoMenuSharp } from "react-icons/io5";

export default function MobileDrawer() {
  return (
    <Drawer>
      <DrawerTrigger>
        <IoMenuSharp className="text-2xl" />
      </DrawerTrigger>
      <DrawerContent>
        <DrawerTitle className="sr-only">Navigation</DrawerTitle>
        <DrawerDescription className="sr-only">Navigation</DrawerDescription>
        <DrawerHeader className="px-6">
          <div className="font-bold text-xl">{siteConfig.name}</div>
          <nav>
            <ul className="mt-7 text-left">
              {siteConfig.header.map((item, index) => (
                <li key={index} className="my-3">
                  {"trigger" in item && item.trigger ? (
                    <a
                      href={(item as any).href || (item.trigger === "Features" ? "#features" : item.trigger === "Solutions" ? "#solution" : "#")}
                      className="font-semibold"
                    >
                      {item.trigger}
                    </a>
                  ) : (
                    <Link to={(item as any).href || ""} className="font-semibold">
                      {(item as any).label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </DrawerHeader>
        <DrawerFooter>
          <Link to="/auth" className={buttonVariants({ variant: "outline" })}>
            Login
          </Link>
          <Link
            to="/auth"
            className={cn(
              buttonVariants({ variant: "default" }),
              "w-full sm:w-auto text-background",
            )}
          >
            Get Started for Free
          </Link>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

