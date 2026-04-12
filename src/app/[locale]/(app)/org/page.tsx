import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { ListUserOrgs } from "@/application/use-cases/org/ListUserOrgs";
import { orgGateway } from "@/infrastructure/registry";
import { getCurrentUser } from "../_data/getCurrentUser";

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

  // No orgs — send the user to subscription page to pick a team plan
  redirect("/subscription");
}
