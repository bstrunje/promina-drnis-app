// frontend/src/features/auth/LogiPage.tsx
import { FormEvent, useState, useEffect } from "react";
import { Eye, EyeOff, LogIn, FileText, ChevronRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { login, register, LoginResponse, searchMembers } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import ErrorMessage from "../../../components/ErrorMessage";
import { Member, MemberSearchResult, MemberLoginData } from "@shared/types/member";

interface SearchResult {
  member_id: number;
  full_name: string;
}

interface SizeOptions {
  value: string;
  label: string;
}

const sizeOptions: SizeOptions[] = [
  { value: "XS", label: "XS" },
  { value: "S", label: "S" },
  { value: "M", label: "M" },
  { value: "L", label: "L" },
  { value: "XL", label: "XL" },
  { value: "XXL", label: "XXL" },
  { value: "XXXL", label: "XXXL" },
];

const lifeStatusOptions = [
  { value: "employed/unemployed", label: "Employed/Unemployed" },
  { value: "child/pupil/student", label: "Child/Pupil/Student" },
  { value: "pensioner", label: "Pensioner" },
];

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const LoginPage = () => {
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0: Initial, 1: Enter Name, 2: Enter Password
  const [showPassword, setShowPassword] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const [loginData, setLoginData] = useState<MemberLoginData>({
    full_name: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState<
    Omit<Member, "member_id" | "total_hours">
  >({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "male",
    street_address: "",
    city: "",
    oib: "",
    cell_phone: "",
    email: "",
    life_status: "employed/unemployed", // Set a default value from the allowed types
    tshirt_size: "M", // Default size
    shell_jacket_size: "M", // Default size
    status: "pending",
    membership_type: "regular" as const,
    role: 'member'
  });

  type MessageType = "success" | "error";
  interface Message {
    type: MessageType;
    content: string;
  }
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showResults &&
        !(event.target as HTMLElement).closest(".search-container")
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showResults]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data: LoginResponse = await login(loginData);
      const member: Member = {
        member_id: data.member.id,
        first_name: data.member.full_name.split(' ')[0],
        last_name: data.member.full_name.split(' ')[1],
        full_name: data.member.full_name,
        date_of_birth: '', // These will be populated by backend
        gender: 'male',    // These should come from backend
        street_address: '',
        city: '',
        oib: '',
        cell_phone: '',
        email: '',
        status: 'active',
        membership_type: 'regular',
        life_status: 'employed/unemployed',
        role: data.member.role,
        tshirt_size: 'M',
        shell_jacket_size: 'M'
      };
      authLogin(member, data.token);

      // Redirect based on user role
      switch (data.member.role) {
        case "admin":
          navigate("/admin");
          break;
        case "member":
          navigate("/dashboard");
          break;
        case "superuser":
          navigate("/super-user");
          break;
        default:
          navigate("/");
          break;
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Failed to login. Please check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setMessage({
        type: "error",
        content: "You must accept the terms and conditions to register",
      });
      return;
    }

    if (!/^\d{11}$/.test(registerData.oib)) {
      setMessage({ type: "error", content: "OIB must be exactly 11 digits" });
      return;
    }

    if (!registerData.email.includes("@")) {
      setMessage({
        type: "error",
        content: "Please enter a valid email address",
      });
      return;
    }

    setMessage(null);
    setLoading(true);

    try {
      const memberData: Omit<Member, "member_id" | "total_hours"> = {
        ...registerData,
        status: "pending",
        membership_type: "regular" as const,
        gender: "male",
        first_name: registerData.first_name,
        last_name: registerData.last_name,
        date_of_birth: registerData.date_of_birth,
        street_address: registerData.street_address,
        city: registerData.city,
        oib: registerData.oib,
        cell_phone: registerData.cell_phone,
        email: registerData.email,
        life_status: registerData.life_status,
        tshirt_size: registerData.tshirt_size,
        shell_jacket_size: registerData.shell_jacket_size,
      };

      const response = await register(memberData);
      if (response.message) {
        setMessage({ type: "success", content: response.message });
        setTimeout(() => {
          setIsRegistering(false);
        }, 3000);
      }
    } catch (error: unknown) {
      console.error("Registration error:", error);
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { status: number; data?: { message?: string } };
        };
        if (
          axiosError.response?.status === 400 &&
          typeof axiosError.response.data?.message === "string"
        ) {
          const errorMessage = axiosError.response.data.message;
          if (errorMessage === "Member with this OIB already exists") {
            setMessage({
              type: "error",
              content:
                "A member with this OIB is already registered. Please use a different OIB or contact support if you think this is a mistake.",
            });
          } else {
            setMessage({
              type: "error",
              content: errorMessage || "Failed to register. Please try again.",
            });
          }
        } else {
          setMessage({
            type: "error",
            content: "Failed to register. Please try again.",
          });
        }
      } else if (error instanceof Error) {
        setMessage({
          type: "error",
          content: error.message,
        });
      } else {
        setMessage({
          type: "error",
          content: "Failed to register. Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        <div className="p-6 bg-blue-600 text-white text-center">
          <div className="mb-4">
            {/* Placeholder for Logo */}
            <div className="w-20 h-20 bg-gray-300 mx-auto rounded-full"></div>
          </div>
          <h2 className="text-2xl font-bold">Mountain Society "Promina"</h2>
        </div>

        <div className="p-6 bg-blue-600 text-white text-center">
          {/* ... existing header content ... */}
        </div>

        {message && (
          <div
            className={`p-4 rounded-md mx-6 mt-4 ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.content}
          </div>
        )}

        {error && <ErrorMessage message={error} />}

        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700">
              Important Documents
            </h3>
            <button
              onClick={() => setShowDocuments(!showDocuments)}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              <FileText className="w-4 h-4 mr-1" />
              {showDocuments ? "Hide" : "Show"} Documents
            </button>
          </div>

          {showDocuments && (
            <div className="mt-3 space-y-2">
              <a
                href="#"
                className="block text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                <ChevronRight className="w-4 h-4 mr-1" />
                Terms and Conditions
              </a>
              <a
                href="#"
                className="block text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                <ChevronRight className="w-4 h-4 mr-1" />
                Privacy Policy
              </a>
              <a
                href="#"
                className="block text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                <ChevronRight className="w-4 h-4 mr-1" />
                Membership Rules
              </a>
            </div>
          )}
        </div>

        <div className="p-6">
          {isRegistering ? (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    I have read and accept the terms and conditions, privacy
                    policy, and membership rules
                  </span>
                </label>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={registerData.first_name}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      first_name: e.target.value,
                    })
                  }
                />
              </div>

              {/* Surname */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Surname
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={registerData.last_name}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      last_name: e.target.value,
                    })
                  }
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Gender
                </label>
                <select
                  name="gender"
                  value={registerData.gender}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      gender: e.target.value as "male" | "female",
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  {genderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date of birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date of birth
                </label>
                <input
                  type="date"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={registerData.date_of_birth}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      date_of_birth: e.target.value,
                    })
                  }
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={registerData.street_address}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      street_address: e.target.value,
                    })
                  }
                />
              </div>

              {/* City/town */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  City/town
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={registerData.city}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, city: e.target.value })
                  }
                />
              </div>

              {/* OIB */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  OIB
                </label>
                <input
                  type="text"
                  required
                  pattern="[0-9]{11}"
                  title="OIB must be exactly 11 digits"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={registerData.oib}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, oib: e.target.value })
                  }
                />
              </div>

              {/* Mobile phone number */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mobile phone number
                </label>
                <input
                  type="tel"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={registerData.cell_phone}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      cell_phone: e.target.value,
                    })
                  }
                />
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={registerData.email}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, email: e.target.value })
                  }
                />
              </div>

              {/* Life status */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Life status
                </label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={registerData.life_status}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      life_status: e.target.value as
                        | "employed/unemployed"
                        | "child/pupil/student"
                        | "pensioner",
                    })
                  }
                >
                  <option value="">Select status</option>
                  {lifeStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* T-shirt */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  T-shirt
                </label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={registerData.tshirt_size}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      tshirt_size: e.target.value as
                        | "XS"
                        | "S"
                        | "M"
                        | "L"
                        | "XL"
                        | "XXL"
                        | "XXXL",
                    })
                  }
                >
                  <option value="">Select size</option>
                  {sizeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shell jacket */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Shell jacket
                </label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={registerData.shell_jacket_size}
                  onChange={(e) =>
                    setRegisterData({
                      ...registerData,
                      shell_jacket_size: e.target.value as
                        | "XS"
                        | "S"
                        | "M"
                        | "L"
                        | "XL"
                        | "XXL"
                        | "XXXL",
                    })
                  }
                >
                  <option value="">Select size</option>
                  {sizeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setError("");
                  }}
                  className="w-1/2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !acceptedTerms}
                  className={`w-1/2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    (loading || !acceptedTerms) &&
                    "opacity-50 cursor-not-allowed"
                  }`}
                >
                  {loading ? (
                    <span>Registering...</span>
                  ) : (
                    <span className="flex items-center">
                      <LogIn className="w-5 h-5 mr-2" />
                      Register
                    </span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <>
              {step === 0 && (
                <div className="space-y-4">
                  <button
                    onClick={() => setStep(1)}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setIsRegistering(true)}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Do you want to become a new member? Register
                  </button>
                </div>
              )}

              {step === 1 && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setStep(2);
                  }}
                  className="space-y-4"
                >
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Enter your full name"
                      className="mt-1 block w-full rounded-md border-2 border-gray-300 bg-gray-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3"
                      value={loginData.full_name}
                      onChange={async (e) => {
                        const value = e.target.value;
                        setLoginData({ ...loginData, full_name: value });

                        if (value.length >= 2) {
                          try {
                            const results = (await searchMembers(
                              value
                            )) as SearchResult[];
                            setSearchResults(results);
                            setShowResults(true);
                          } catch (error) {
                            console.error("Search error:", error);
                          }
                        } else {
                          setSearchResults([]);
                          setShowResults(false);
                        }
                      }}
                      onFocus={() => {
                        if (searchResults.length > 0) {
                          setShowResults(true);
                        }
                      }}
                    />
                  </div>

                  {/* Search Results Dropdown */}
                  {showResults && searchResults.length > 0 && (
                    <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center">
                      {searchResults.map((result) => (
                        <button
                          type="button"
                          key={result.member_id}
                          className="w-full px-4 py-2 text-left"
                          onMouseDown={() => {
                            setLoginData({
                              ...loginData,
                              full_name: result.full_name,
                            });
                            setShowResults(false);
                            setStep(2);
                          }}
                        >
                          {result.full_name}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setStep(0)}
                      className="w-1/2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Back
                    </button>
                  </div>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <div className="mt-1 relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Enter your password"
                        className="block w-full rounded-md border-2 border-gray-300 bg-gray-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3"
                        value={loginData.password}
                        onChange={(e) =>
                          setLoginData({
                            ...loginData,
                            password: e.target.value,
                          })
                        }
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-1/2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-1/2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        loading && "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      {loading ? (
                        <span>Signing in...</span>
                      ) : (
                        <span className="flex items-center">
                          <LogIn className="w-5 h-5 mr-2" />
                          Sign In
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          <div className="mt-6 text-center">
            {isRegistering && (
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setError("");
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Already have an account? Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;