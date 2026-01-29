import DarkModeToggle from "../ui/DarkModeToggle";

function Navbar() {
  return (
    <div className="flex justify-between items-center bg-white/50 m-4 p-6 rounded-xl flex-row shadow-xl">
      <div className="relative inline-block cursor-pointer">
        <img
          src="src/assets/images/logofull.png"
          alt="logo"
          width="200px"
          className={`block transition-opacity duration-500 opacity-100 dark:opacity-0
        `}
        />
        <img
          src="src/assets/images/darklogofull.png"
          alt="logo"
          width="200px"
          className={`absolute top-0 left-0 transition-opacity duration-500 opacity-0 dark:opacity-100
        `}
        />
      </div>
      <div className="flex items-center gap-10">
        <ul className="flex gap-8 text-lg dark:text-gray-200">
          <li>
            <a
              className="inline-block hover:scale-110 duration-300 transition-all"
              href="index.html"
            >
              Home
            </a>
          </li>
          <li>
            <a
              className="inline-block hover:scale-110 duration-300 transition-all"
              href="app.html"
            >
              App
            </a>
          </li>
        </ul>
        <DarkModeToggle />
      </div>
    </div>
  );
}

export default Navbar;
