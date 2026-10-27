import type { Metadata } from "next";

import { TermsModule } from "@/modules/site";

export const metadata: Metadata = {
  title: "Terms of Service · ConnectMe",
  description: "Terms and conditions for using ConnectMe omnichannel unified messaging gateway.",
};

export default function TermsPage() {
  return <TermsModule />;
}