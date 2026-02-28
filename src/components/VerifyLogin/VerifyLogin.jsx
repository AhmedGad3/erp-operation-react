import { useState, useRef, useContext, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";

export default function VerifyLogin() {
  const fieldsRef = useRef();
  const [codes, setCodes] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useContext(AuthContext);

  const email = location.state?.email;

  useEffect(() => {
    if (!email) navigate("/login");
  }, [email, navigate]);

  const otp = codes.join("");

  const handleChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newCodes = [...codes];
    newCodes[index] = value.slice(-1);
    setCodes(newCodes);
    if (value && index < 5) {
      fieldsRef.current.children[index + 1].focus();
    }
  };

  const handleKeyUp = (e, index) => {
    if ((e.key === "Backspace" || e.key === "Delete") && !codes[index] && index > 0) {
      fieldsRef.current.children[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pastedData)) {
      setCodes(pastedData.split(""));
      fieldsRef.current.children[5].focus();
    }
  };

  async function handleVerify() {
    if (otp.length !== 6) {
      setError("Please enter the full 6-digit code");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await axios.post(
        "https://erp-operations.vercel.app/auth/verify-login",
        { email, code: otp }
      );
      if (data.token) {
        const apiProfile =
          data.user ||
          data.result?.user ||
          data.result ||
          {};
        const fallbackProfile = {
          email,
          name: email,
        };
        const profile = { ...fallbackProfile, ...apiProfile };
        login(data.token, profile);
        localStorage.setItem("token", data.token);
        navigate("/");
      } else {
        setError("Invalid response from server");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid code. Please try again.");
      setCodes(["", "", "", "", "", ""]);
      fieldsRef.current.children[0].focus();
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (timer === 0) { setCanResend(true); return; }
    const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleResend = async () => {
    try {
      setCanResend(false);
      setTimer(60);
      await axios.post("https://erp-operations.vercel.app/auth/login", { email });
      toast.success("Code resent successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend code");
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center md:justify-end md:pr-16 px-4 py-8">

      {/* Full-screen background image with blur */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/assets/megabuild.png')",
          filter: "blur(3px) brightness(0.7)",
          transform: "scale(1.05)",
        }}
      />

      {/* Dark vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-black/10" />

      {/* Bottom-left label - hidden on mobile */}
      <div className="absolute bottom-12 left-12 z-10 hidden md:block">
        <h2
          className="text-white text-4xl font-extrabold drop-shadow-2xl"
          style={{ fontFamily: "'Georgia', serif", letterSpacing: "0.03em" }}
        >
          MEGA BUILD Construction
        </h2>
        <p className="mt-3 text-gray-300 text-base font-light tracking-widest uppercase">
          Building the future, one project at a time.
        </p>
      </div>

      {/* Glassmorphism card */}
      <div
        className="relative z-10 w-full max-w-md rounded-3xl p-6 sm:p-10 text-center"
        style={{
          background: "rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          boxShadow: "0 8px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)",
        }}
      >
        {/* Mobile-only brand label inside card */}
        <div className="md:hidden mb-4">
          <p className="text-white/60 text-xs font-light tracking-widest uppercase">
            MEGA BUILD Construction
          </p>
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.35)",
            }}
          >
            <ShieldCheck className="text-white" size={28} />
          </div>
        </div>

        <h2 className="text-white text-2xl sm:text-3xl font-bold mb-2">Verify Login</h2>
        <p className="text-white/60 text-sm mb-1">Enter the 6-digit code sent to</p>
        <p className="text-yellow-300 font-medium mb-5 sm:mb-6 text-sm sm:text-base break-all px-2">{email}</p>

        {error && (
          <div
            className="text-red-200 text-sm px-4 py-3 rounded-xl mb-4"
            style={{ background: "rgba(220,38,38,0.25)", border: "1px solid rgba(220,38,38,0.4)" }}
          >
            {error}
          </div>
        )}

        {/* OTP inputs */}
        <div
          ref={fieldsRef}
          className="flex justify-center gap-1.5 sm:gap-2 mb-5 sm:mb-6"
          onPaste={handlePaste}
        >
          {codes.map((code, index) => (
            <input
              key={index}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={code}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyUp={(e) => handleKeyUp(e, index)}
              disabled={isLoading}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl text-center text-xl sm:text-2xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-white/50 transition touch-manipulation"
              style={{
                background: "rgba(255,255,255,0.12)",
                border: code
                  ? "1px solid rgba(255,255,255,0.6)"
                  : "1px solid rgba(255,255,255,0.25)",
                caretColor: "white",
              }}
            />
          ))}
        </div>

        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={isLoading || otp.length !== 6}
          className="w-full h-12 rounded-xl text-white font-semibold text-base transition-all duration-200 disabled:opacity-50 active:scale-[0.98] touch-manipulation"
          style={{
            background: "rgba(59, 130, 246, 0.85)",
            border: "1px solid rgba(147, 197, 253, 0.4)",
            boxShadow: "0 4px 20px rgba(59,130,246,0.4)",
          }}
        >
          {isLoading ? "Verifying..." : "Verify"}
        </button>

        {/* Resend */}
        <div className="mt-4 text-sm text-white/50">
          {canResend ? (
            <button
              onClick={handleResend}
              className="text-yellow-300 hover:text-yellow-200 font-medium transition touch-manipulation py-2"
            >
              Resend Code
            </button>
          ) : (
            <span>Resend code in {timer}s</span>
          )}
        </div>

        {/* Back */}
        <button
          onClick={() => navigate("/login")}
          disabled={isLoading}
          className="mt-3 text-white/40 hover:text-white/70 text-sm transition touch-manipulation py-2"
        >
          ← Back to login
        </button>
      </div>
    </div>
  );
}
