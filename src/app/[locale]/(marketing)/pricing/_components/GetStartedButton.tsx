import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/presentation/components/atoms/Button";

interface GetStartedButtonProps {
  children: React.ReactNode;
  highlighted?: boolean;
}

export function GetStartedButton({
  children,
  highlighted = false,
}: GetStartedButtonProps) {
  return (
    <Link href="/signup" className="block">
      <Button
        variant={highlighted ? "primary" : "secondary"}
        className="w-full"
      >
        {children}
      </Button>
    </Link>
  );
}
