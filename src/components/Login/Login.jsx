import { useState, useContext, useEffect } from "react";
import { Mail } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

const TYPING_TEXT = "Welcome to MEGA BUILD Construction";

export default function Login() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();
  const { setToken } = useContext(AuthContext);

  useEffect(() => {
    let timeout;

    if (!isDeleting && charIndex < TYPING_TEXT.length) {
      // Typing forward
      timeout = setTimeout(() => {
        setDisplayedText(TYPING_TEXT.slice(0, charIndex + 1));
        setCharIndex((prev) => prev + 1);
      }, 70);
    } else if (!isDeleting && charIndex === TYPING_TEXT.length) {
      // Pause at end before deleting
      timeout = setTimeout(() => setIsDeleting(true), 1800);
    } else if (isDeleting && charIndex > 0) {
      // Deleting
      timeout = setTimeout(() => {
        setDisplayedText(TYPING_TEXT.slice(0, charIndex - 1));
        setCharIndex((prev) => prev - 1);
      }, 40);
    } else if (isDeleting && charIndex === 0) {
      // Pause before typing again
      timeout = setTimeout(() => setIsDeleting(false), 600);
    }

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Please enter your email");
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await axios.post(
        "https://erp-operations.vercel.app/auth/login",
        { email }
      );

      if (data.message === "OTP sent to your email") {
        navigate("/verify-login", { state: { email } });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-end pr-16">

      {/* Full-screen background image with blur */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('../public/assets/megabuild.png')",
          filter: "blur(3px) brightness(0.7)",
          transform: "scale(1.05)",
        }}
      />

      {/* Dark vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-black/10" />

      {/* Typing headline bottom-left */}
      <div className="absolute bottom-12 left-12 z-10 max-w-lg">
        <h2
          className="text-white text-4xl font-extrabold leading-tight drop-shadow-2xl"
          style={{ fontFamily: "'Georgia', serif", letterSpacing: "0.03em" }}
        >
          {displayedText}
          <span className="inline-block w-0.5 h-9 bg-yellow-400 ml-1 align-middle animate-pulse" />
        </h2>
        <p className="mt-3 text-gray-300 text-base font-light tracking-widest uppercase">
          Building the future, one project at a time.
        </p>
      </div>

      {/* Glassmorphism login card */}
      <div
        className="relative z-10 w-full max-w-md rounded-3xl p-10"
        style={{
          background: "rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          boxShadow: "0 8px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)",
        }}
      >
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.35)",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="9 22 9 12 15 12 15 22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-white text-3xl font-bold tracking-wide">Login</h1>
          <p className="text-white/70 text-sm mt-1 text-center">
            Enter your email to receive a verification code
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div
              className="text-red-200 text-sm px-4 py-3 rounded-xl"
              style={{ background: "rgba(220,38,38,0.25)", border: "1px solid rgba(220,38,38,0.4)" }}
            >
              {error}
            </div>
          )}

          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Email
            </label>
            <div className="relative">
              <Mail
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50"
                size={20}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={isLoading}
                className="w-full h-12 pr-10 px-4 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40 transition"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.25)",
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl text-white font-semibold text-base transition-all duration-200 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "rgba(59, 130, 246, 0.85)",
              border: "1px solid rgba(147, 197, 253, 0.4)",
              boxShadow: "0 4px 20px rgba(59,130,246,0.4)",
            }}
          >
            {isLoading ? "Sending code..." : "Send Code"}
          </button>
        </form>
      </div>
    </div>
  );
}