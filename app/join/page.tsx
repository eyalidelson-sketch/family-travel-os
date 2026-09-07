import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { JoinForm } from "@/components/join/JoinForm";

export default function JoinPage() {
  return (
    <main className="mx-auto min-h-[100dvh] max-w-md px-6 pb-10 pt-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-inkFaint hover:text-ink">
        <ChevronLeft size={16} /> Back
      </Link>

      <div className="mt-8 mb-8">
        <h1 className="text-2xl font-semibold text-ink">Join a trip</h1>
        <p className="mt-1.5 text-[15px] text-inkSoft">Enter the code the organizer shared with you.</p>
      </div>

      <JoinForm />
    </main>
  );
}
