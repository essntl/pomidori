import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center flex-1 px-6 py-16 sm:py-24">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">

          <div className="mb-8 sm:mb-12">
            <Image
              src="/images/logo.png"
              alt="Pomidori logo"
              width={120}
              height={120}
              className="w-24 h-24 sm:w-32 sm:h-32 drop-shadow-lg"
            />
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-6">
            The only productivity suite{" "}
            <span className="text-pink-500 dark:text-pink-400">you'll ever need</span>
          </h1>

          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-xl mb-10 leading-relaxed">
            Optimize your work with a customizable timer, integrated task calendar, and notes section—all in one minimal, beautiful interface.
          </p>

          <Link
            href="/app"
            className="group flex items-center gap-2 px-8 py-4 bg-pink-500 hover:bg-pink-600 dark:bg-pink-600 dark:hover:bg-pink-500 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
          >
            Get started
            <svg 
              className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="flex flex-col px-6 pb-20 sm:pb-28">
        <div className="max-w-5xl mx-auto w-full">

          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-sm font-semibold tracking-widest uppercase text-pink-500 dark:text-pink-400 mb-3">
              Features
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Everything you need to stay productive
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 flex flex-col items-center text-center p-8 bg-white/70 dark:bg-gray-900/60 rounded-2xl shadow-lg dark:shadow-xl border border-white/60 dark:border-white/10 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
              <div className="w-16 h-16 mb-6 flex items-center justify-center bg-pink-100 dark:bg-pink-900/40 rounded-2xl">
                <svg className="w-8 h-8 text-pink-500 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Pomodoro Timer
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Customizable work and break intervals to match your productivity style. Track your sessions with an elegant display.
              </p>
            </div>


            <div className="flex-1 flex flex-col items-center text-center p-8 bg-white/70 dark:bg-gray-900/60 rounded-2xl shadow-lg dark:shadow-xl border border-white/60 dark:border-white/10 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
              <div className="w-16 h-16 mb-6 flex items-center justify-center bg-pink-100 dark:bg-pink-900/40 rounded-2xl">
                <svg className="w-8 h-8 text-pink-500 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Task Calendar
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Organize tasks and deadlines with an integrated calendar. Plan your work sessions around your schedule seamlessly.
              </p>
            </div>


            <div className="flex-1 flex flex-col items-center text-center p-8 bg-white/70 dark:bg-gray-900/60 rounded-2xl shadow-lg dark:shadow-xl border border-white/60 dark:border-white/10 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
              <div className="w-16 h-16 mb-6 flex items-center justify-center bg-pink-100 dark:bg-pink-900/40 rounded-2xl">
                <svg className="w-8 h-8 text-pink-500 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Notes Section
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Capture ideas, reflections, and to-dos in a dedicated notes area. Keep everything organized in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="flex flex-col px-6 pb-20 sm:pb-28">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 p-8 sm:p-12 bg-white/70 dark:bg-gray-900/60 rounded-3xl shadow-lg dark:shadow-xl border border-white/60 dark:border-white/10">
            <div className="flex-1 flex flex-col gap-5">
              <div>
                <h2 className="text-sm font-semibold tracking-widest uppercase text-pink-500 dark:text-pink-400 mb-2">
                  About
                </h2>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Built with passion for productivity
                </h3>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Pomidori was created as a project for <strong className="text-gray-800 dark:text-gray-200">Codedex</strong> and as a tool for personal daily use. A passion project built with care, dedication, and attention to detail.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
                <a
                  href="https://github.com/essntl/pomidori"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-gray-800 hover:bg-gray-800 dark:hover:bg-gray-700 text-white font-medium rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  View on GitHub
                </a>
                
                <span className="text-sm text-gray-500 dark:text-gray-500">
                  Made by <span className="font-medium text-gray-700 dark:text-gray-400">essential</span>
                </span>
              </div>
            </div>

            <div className="shrink-0">
              <Image
                src="/images/logo.png"
                alt="Pomidori logo"
                width={180}
                height={180}
                className="w-32 h-32 sm:w-44 sm:h-44 opacity-90"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
