// frontend/src/features/auth/LoginPage.tsx
import { FormEvent, useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, LogIn, FileText, ChevronRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { login, register, searchMembers } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import ErrorMessage from "../../../components/ErrorMessage";
import { Member, MemberSearchResult } from "@shared/member";
import { MemberLoginData } from "@shared/member";
import debounce from "lodash.debounce";

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
  const [message, setMessage] = useState<{ type: "error" | "success"; content: string } | null>(null);
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
    registration_completed: true,
    membership_type: "regular" as const,
    role: "member",
    card_stamp_issued: false,  // Add this
    card_number: "",          // Add this
  });

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

  useEffect(() => {
    if (step === 1) {
      const nameInput = document.querySelector('input[type="text"]');
      if (nameInput) {
        (nameInput as HTMLElement).focus();
      }
    }
  }, [step]);

  useEffect(() => {
    if (step === 2) {
      const passwordInput = document.querySelector('input[type="password"]');
      if (passwordInput) {
        (passwordInput as HTMLElement).focus();
      }
    }
  }, [step]);

  const handleNameSearch = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.trim();
    setLoginData({ ...loginData, full_name: value });
    
    // Ne pretražujemo ako je upit prekratak (backend zahtijeva minimalno 3 znaka)
    if (value.length < 3) {
      setSearchResults([]);
      setShowResults(value.length > 0);
      return;
    }
    
    try {
      const results = await searchMembers(value);
      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      console.error("Search error:", error);
      // Ne prikazujemo grešku korisniku - jednostavno nemamo rezultata
      setSearchResults([]);
    }
  };

  const debouncedSearch = useCallback(
    debounce((event: React.ChangeEvent<HTMLInputElement>) => {
      handleNameSearch(event);
    }, 300),
    []
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    
    if (name === "full_name") {
      setLoginData({ ...loginData, full_name: value });
      debouncedSearch(event);
    } else if (name === "password") {
      setLoginData({ ...loginData, password: value });
    }
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(loginData);
      const member: Member = {
        member_id: data.member.id,
        first_name: data.member.full_name.split(" ")[0],
        last_name: data.member.full_name.split(" ")[1],
        full_name: data.member.full_name,
        date_of_birth: "",
        gender: "male",
        street_address: "",
        city: "",
        oib: "",
        cell_phone: "",
        email: "",
        registration_completed: true,
        membership_type: "regular",
        life_status: "employed/unemployed",
        role: data.member.role,
        tshirt_size: "M",
        shell_jacket_size: "M",
        card_stamp_issued: false,  // Add this
        card_number: "",          // Add this
      };
      authLogin(member, data.token);
      navigate("/profile");
    } catch (error) {
      console.error("Login error:", error);
      // Poboljšani prikaz poruke greške - očuvajmo sve informacije od servera
      if (error instanceof Error) {
        setError(error.message);
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        setError((error as { message: string }).message);
      } else {
        setError('Failed to login. Please contact an administrator.');
      }
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
        registration_completed: false,
        membership_type: "regular",
        role: "member",
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
        card_stamp_issued: false,  // Add this explicitly
        card_number: "",          // Add this explicitly
      };

      const response = await register(memberData);
      if (response.message) {
        setMessage({ type: "success", content: response.message });
        setTimeout(() => {
          setIsRegistering(false);
        }, 3000);
      }
    } catch (error) {
      if (error instanceof Error) {
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
            <form onSubmit={handleRegister} className="space-y-4">
              <h2 className="text-2xl font-bold mb-4">Create New Account</h2>
              
              {/* Prikaz poruke o grešci ili uspjehu */}
              {message && (
                <div className={`p-3 rounded-md mb-4 ${message.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                  {message.content}
                </div>
              )}
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
                  className="mt-2 p-2 w-full border rounded"
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
                  className="mt-2 p-2 w-full border rounded"
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
                  className="mt-2 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
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
                  className="mt-2 p-2 w-full border rounded bg-gray-50"
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
                  className="mt-2 p-2 w-full border rounded"
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
                  className="mt-2 p-2 w-full border rounded"
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
                  className="mt-2 p-2 w-full border rounded"
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
                  className="mt-2 p-2 w-full border rounded"
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
                  className="mt-2 p-2 w-full border rounded"
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
                  className="mt-2 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
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
                  className="mt-2 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
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
                  className="mt-2 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
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
                      name="full_name"
                      required
                      placeholder="Enter your full name"
                      className="mt-2 p-2 w-full border rounded"
                      value={loginData.full_name}
                      autoComplete="off"
                      onKeyDown={async (e) => {
                        if (e.key === "Enter" && searchResults.length > 0) {
                          e.preventDefault();
                          const selectedMember = searchResults[0];
                          setLoginData({
                            ...loginData,
                            full_name: selectedMember.full_name,
                          });
                          setShowResults(false);
                          setStep(2);
                        } else if (
                          e.key === "ArrowDown" &&
                          showResults &&
                          searchResults.length > 0
                        ) {
                          e.preventDefault();
                          // Focus first result
                          const firstResult =
                            document.querySelector(".search-result");
                          if (firstResult) {
                            (firstResult as HTMLElement).focus();
                          }
                        }
                      }}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Search Results Dropdown */}
                  {showResults && searchResults.length > 0 && (
                    <div className="absolute max-w-[calc(100%+2rem)] relative left-[-1rem] bg-white shadow-lg rounded-b border mt-1 z-10">
                      {searchResults
                        .filter((result) =>
                          result.full_name
                            .toLowerCase()
                            .split(" ")[0]
                            .startsWith(loginData.full_name.toLowerCase())
                        )
                        .map((result, index) => (
                          <button
                            key={result.member_id}
                            className="search-result w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setLoginData({
                                ...loginData,
                                full_name: result.full_name,
                              });
                              setShowResults(false);
                              setStep(2);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                setLoginData({
                                  ...loginData,
                                  full_name: result.full_name,
                                });
                                setShowResults(false);
                                setStep(2);
                              } else if (
                                e.key === "ArrowDown" &&
                                index < searchResults.length - 1
                              ) {
                                e.preventDefault();
                                const nextResult =
                                  document.querySelectorAll(".search-result")[
                                    index + 1
                                  ];
                                if (nextResult) {
                                  (nextResult as HTMLElement).focus();
                                }
                              } else if (e.key === "ArrowUp") {
                                e.preventDefault();
                                if (index === 0) {
                                  const input =
                                    document.querySelector('input[type="text"]');
                                  if (input) {
                                    (input as HTMLElement).focus();
                                  }
                                } else {
                                  const prevResult =
                                    document.querySelectorAll(".search-result")[
                                      index - 1
                                    ];
                                  if (prevResult) {
                                    (prevResult as HTMLElement).focus();
                                  }
                                }
                              }
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
                  {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
                      <p className="font-bold">Login Failed</p>
                      <p>{error}</p>
                    </div>
                  )}
                  <div>
                    <div className="mt-1 relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        required
                        placeholder="Enter your password"
                        className="mt-2 p-2 w-full border rounded"
                        value={loginData.password}
                        autoComplete="new-password"
                        onChange={handleInputChange}
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
                  setStep(1);
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