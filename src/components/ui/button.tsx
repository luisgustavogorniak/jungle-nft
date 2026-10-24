import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent bg-clip-padding font-bold whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[#c47b3e]",
        outline: "border-primary bg-transparent text-highlight hover:bg-primary/10",
        secondary: "border-border bg-secondary text-foreground hover:bg-secondary/70",
        ghost: "text-foreground hover:bg-secondary",
        destructive: "bg-destructive/15 text-destructive hover:bg-destructive/25",
        link: "font-medium text-highlight underline-offset-4 hover:underline",
        /** Mobile primary: 60px pill with the gradient of the layout. */
        pill: "rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-[#c47b3e]",
        /** Round icon button on a raised surface (back, favorite, cart). */
        circle: "rounded-full border-border bg-secondary text-foreground hover:bg-secondary/70",
      },
      size: {
        default: "h-10 px-6 text-sm",
        xs: "h-7 px-2.5 text-xs",
        sm: "h-9 px-4 text-sm",
        lg: "h-11 px-8 text-base",
        xl: "h-[60px] px-8 text-base",
        icon: "size-10",
        "icon-xs": "size-6",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
