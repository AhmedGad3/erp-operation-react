import { useState, useRef, useContext, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ShieldCheck } from "lucide-react";

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
    if (!email) {
      navigate("/login");
    }
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
      const newCodes = pastedData.split("");
      setCodes(newCodes);
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
        login(data.token);
        localStorage.setItem("token", data.token);
        navigate("/");
      } else {
        setError("Invalid response from server");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError(err.response?.data?.message || "Invalid code. Please try again.");
      setCodes(["", "", "", "", "", ""]);
      fieldsRef.current.children[0].focus();
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (timer === 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleResend = async () => {
    try {
      setCanResend(false);
      setTimer(60);
      await axios.post("https://erp-operations.vercel.app/auth/login", { email });
      alert("Code resent successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to resend code");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
          <ShieldCheck className="text-white" size={32} />
        </div>

        <h2 className="text-2xl font-bold mb-2">Verify Login</h2>
        <p className="text-gray-500 mb-2">Enter the 6-digit code sent to</p>
        <p className="text-blue-600 font-medium mb-6">{email}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <div ref={fieldsRef} className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
          {codes.map((code, index) => (
            <input
              key={index}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={code}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyUp={(e) => handleKeyUp(e, index)}
              className="w-12 h-12 rounded-lg border text-center text-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              disabled={isLoading}
            />
          ))}
        </div>

        <button
          onClick={handleVerify}
          disabled={isLoading || otp.length !== 6}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg w-full text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Verifying..." : "Verify"}
        </button>

        {/* Resend code section */}
        <div className="mt-4 text-sm text-gray-500">
          {canResend ? (
            <button
              onClick={handleResend}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Resend Code
            </button>
          ) : (
            <span>Resend code in {timer}s</span>
          )}
        </div>

        <button
          onClick={() => navigate("/login")}
          className="mt-4 text-gray-600 hover:text-gray-800 text-sm"
          disabled={isLoading}
        >
          Back to login
        </button>
      </div>
    </div>
  );
}
