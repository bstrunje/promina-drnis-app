import * as React from "react"
import { cn } from "@/lib/utils"

type CardProps = React.HTMLAttributes<HTMLDivElement>;
type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;
type CardContentProps = React.HTMLAttributes<HTMLDivElement>;
type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;
type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;
type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  );
}
Card.displayName = "Card";

function CardHeader({ className, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  );
}
CardHeader.displayName = "CardHeader";

function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}
CardTitle.displayName = "CardTitle";

function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}
CardDescription.displayName = "CardDescription";

function CardContent({ className, ...props }: CardContentProps) {
  return (
    <div
      className={cn("p-6 pt-0", className)}
      {...props}
    />
  );
}
CardContent.displayName = "CardContent";

function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <div
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  );
}
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }