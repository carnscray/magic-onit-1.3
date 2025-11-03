// app/components/Footer.tsx

import { Form, useNavigation } from "@remix-run/react";

export default function Footer() {
  const navigation = useNavigation();
  const isSigningOut =
    navigation.state === "submitting" &&
    navigation.formAction === "/auth-sign-out";

  return (
    // 🛑 CHANGES:
    // 1. Removed 'bg-gradient-custom' to make the background transparent (relying on body).
    // 2. Added 'rounded-tl-xl rounded-tr-xl' to give the footer curves that match the <main> element.
    // 3. Removed 'shadow-lg' as it might interfere with the layering illusion.
    <footer className="w-full bg-gradient-custom mt-auto rounded-tl-3xl rounded-tr-3xl"> 
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-start items-center h-12">
        
        {/* Logout Form/Button */}
        <Form action="/auth-sign-out" method="POST">
          <button
            type="submit"
            disabled={isSigningOut}
            // Custom styling for a transparent, text-only button
            className="flex items-center space-x-1 p-2 text-white hover:text-red-100 transition duration-150"
          >
            {/* White power_settings_circle icon */}
            <span 
              className="material-symbols-outlined"
              style={{ fontSize: '24px', fontWeight: 400, fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              power_settings_circle
            </span>
            
            {/* Text */}
            <span className="font-medium text-sm">
              {isSigningOut ? "Logging out..." : "Logout"}
            </span>
          </button>
        </Form>
        
      </div>
    </footer>
  );
}