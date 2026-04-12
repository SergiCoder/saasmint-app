import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { ListUserOrgs } from "@/application/use-cases/org/ListUserOrgs";
import { orgGateway } from "@/infrastructure/registry";
import { getCurrentUser } from "../_data/getCurrentUser";
import { Link } from "@/lib/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("org");
  return { title: t("title") };
}

export default async function OrgListPage() {
  const user = await getCurrentUser();
  const orgs = await new ListUserOrgs(orgGateway).execute(user.id);

  if (orgs.length === 1) {
    redirect(`/org/${orgs[0].slug}`);
  }

  const t = await getTranslations("org");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>

      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-gray-600">{t("noOrgMessage")}</p>
        <Link
          href="/subscription"
          className="text-primary-600 hover:text-primary-700 mt-3 inline-block text-sm font-medium underline underline-offset-2"
        >
          {t("goToSubscription")}
        </Link>
      </div>
    </div>
  );
}
