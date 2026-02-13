import Link from "next/link";
import Image from "next/image";

function Footer() {
  return (
    <footer className="flex justify-between items-center px-4 py-2">
      <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/70 dark:bg-gray-900/60 shadow-lg dark:shadow-xl border border-white/60 dark:border-white/10">
        <Image
          src="/images/logo.png"
          alt="logo"
          width="32"
          height="32"
          className="block"
        />
        <span className="text-lg font-semibold text-gray-800 dark:text-gray-100 hidden sm:block tracking-tight">
          Pomidori
        </span>
      </Link>

      <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-white/70 dark:bg-gray-900/60 shadow-lg dark:shadow-xl border border-white/60 dark:border-white/10">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Made by essential
        </span>
      </div>
    </footer>
  );
}

export default Footer;
