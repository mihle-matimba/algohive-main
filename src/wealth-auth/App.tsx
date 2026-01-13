import { AuthComponent } from "@/components/ui/sign-up";

const BrandLogo = () => (
  <div className="bg-emerald-500 text-white rounded-md p-1.5">
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  </div>
);

export default function WealthAuthApp() {
  return (
    <AuthComponent
      logo={<BrandLogo />}
      brandName="AlgoHive"
    />
  );
}
