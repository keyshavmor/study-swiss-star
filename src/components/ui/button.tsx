import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-[transform,background-color,box-shadow,border-color,color] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow-button)] hover:-translate-y-px hover:bg-primary-hover",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:-translate-y-px hover:opacity-95",
        outline:
          "border border-border-strong bg-surface text-foreground hover:-translate-y-px hover:bg-hover",
        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:bg-hover",
        ghost: "text-foreground hover:bg-hover",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[50px] rounded-lg px-6 text-[15px]",
        lg: "h-[58px] rounded-[18px] px-8 text-base",
        sm: "h-[42px] rounded-[10px] px-4 text-sm",
        icon: "size-[44px] rounded-xl",
        "icon-sm": "size-9 rounded-[10px] [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
