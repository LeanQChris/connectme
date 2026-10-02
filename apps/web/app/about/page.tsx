import { AboutModule } from "@/modules/site";

export const metadata = {
  title: "About · ConnectMe",
  description: "What ConnectMe is, how it works, and how your data is handled.",
};

export default function AboutPage() {
  return <AboutModule />;
}
