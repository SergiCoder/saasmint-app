import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button } from "@/presentation/components/atoms/Button";
import { acceptInvitation, declineInvitation } from "@/app/actions/invitation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("invitation");
  return { title: t("title") };
}

interface InvitationPageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { token } = await params;
  const t = await getTranslations("invitation");

  return (
    <div className="mx-auto max-w-md space-y-6 py-12">
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mt-2 text-sm text-gray-600">{t("description")}</p>

        <div className="mt-8 flex flex-col gap-3">
          <form action={acceptInvitation}>
            <input type="hidden" name="token" value={token} />
            <Button type="submit" variant="primary" className="w-full">
              {t("accept")}
            </Button>
          </form>
          <form action={declineInvitation}>
            <input type="hidden" name="token" value={token} />
            <Button type="submit" variant="secondary" className="w-full">
              {t("decline")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
