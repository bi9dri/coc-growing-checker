import * as TabsPrimitives from "@radix-ui/react-tabs";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "./utils/cn.ts";

export const Tabs = TabsPrimitives.Root;

export function TabsList({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitives.List>) {
  return <TabsPrimitives.List className={cn("investigator-tabs", className)} {...props} />;
}

export function TabsTrigger({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitives.Trigger>) {
  return <TabsPrimitives.Trigger className={cn("inv-tab", className)} {...props} />;
}

export function TabsContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitives.Content>) {
  return (
    <TabsPrimitives.Content className={cn("focus-visible:outline-none", className)} {...props} />
  );
}
