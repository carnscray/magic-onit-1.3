import { Link, Form, useNavigation } from "@remix-run/react";

export default function Banner() {
  const navigation = useNavigation();
  const isSigningOut = 
    navigation.state === "submitting" && 
    navigation.formAction === "/auth-sign-out";

  const navItemClasses = "text-white hover:text-indigo-200 transition duration-150 p-2";
  const buttonClasses = 
    "text-white bg-red-600 hover:bg-red-700 font-medium rounded-lg text-sm px-4 py-1.5 transition duration-150";

  return (
    <header className="bg-main shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        
        {/* Navigation Links */}
        <nav className="flex items-center space-x-4">
          <Link to="/" className={`${navItemClasses} font-bold text-lg`}>
            Home
          </Link>
          <Link to="/comps" className={navItemClasses}>
            Comps
          </Link>
        </nav>

        {/* Logout Form/Button */}
        <Form action="/auth-sign-out" method="POST">
          <button
            type="submit"
            disabled={isSigningOut}
            className={buttonClasses}
          >
            {isSigningOut ? "Logging out..." : "Logout"}
          </button>
        </Form>
        
      </div>
    </header>
  );
}