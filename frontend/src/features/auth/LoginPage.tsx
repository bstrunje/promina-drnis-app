// frontend/src/features/auth/LoginPage.tsx
// Uklonjen useCallback iz import-a
import { FormEvent, useState, useEffect } from "react"; 
import { Eye, EyeOff, LogIn, FileText, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
// Zamijenjeno prema novoj modularnoj API strukturi
import { login, register } from '../../utils/api/apiAuth';
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Member, MemberLoginData, MembershipTypeEnum, MemberRole, MemberSkill } from "@shared/member"; // Sada koristi ažurirani tip
import logoImage from '../../assets/images/grbPD_bez_natpisa_pozadina.png';
import { formatInputDate } from "@/utils/dateUtils";
import SkillsSelector from '@components/SkillsSelector';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../../components/LanguageToggle';

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

// Ove opcije će biti generirane dinamički koristeći useTranslation hook

const LoginPage = () => {
  const { t } = useTranslation();
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [step, setStep] = useState(0); // 0: Initial, 1: Enter Email, 2: Enter Password
  const [showPassword, setShowPassword] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; content: string } | null>(null);
  const [loginPageMessage, setLoginPageMessage] = useState<{ type: "error" | "success"; content: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  
  // Dohvati parametre iz URL-a za preusmjeravanje nakon uspješne prijave
  const redirectPath = searchParams.get('redirect');
  const isSoftLogout = searchParams.get('soft') === 'true';

  // Inicijalizacija stanja koristi ažurirani MemberLoginData tip
  const [loginData, setLoginData] = useState<MemberLoginData>({
    email: "",
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
    membership_type: MembershipTypeEnum.Regular,
    role: "member",
    membership_details: {
      card_stamp_issued: false,
      card_number: ""
    },
    skills: [],
    other_skills: ''
  });

  useEffect(() => {
    if (step === 1) {
      const emailInput = document.querySelector('input[type="email"]');
      if (emailInput) {
        (emailInput as HTMLElement).focus();
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

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    
    setLoginData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Uklonjen loginPayload, šaljemo loginData direktno
      // login funkcija u api.ts je ažurirana da šalje { email, password }
      const data = await login(loginData);

      // Ispravljeno kreiranje member objekta:
      // Koristimo samo garantirana polja iz data.member (id, full_name, role)
      // Za ostala polja Member tipa postavljamo zadane/prazne vrijednosti.
      const member: Member = {
        member_id: data.member.id,
        first_name: data.member.full_name.split(" ")[0] || "",
        last_name: data.member.full_name.split(" ").slice(1).join(" ") || "",
        full_name: data.member.full_name, // API vraća full_name, koristimo ga
        role: (data.member.role as MemberRole),
        // Zadane vrijednosti za ostala polja koja ne dolaze iz data.member
        date_of_birth: "", // Nema u data.member
        gender: "male",    // Nema u data.member
        street_address: "",// Nema u data.member
        city: "",          // Nema u data.member
        oib: "",           // Nema u data.member
        cell_phone: "",    // Nema u data.member
        email: loginData.email, // Koristimo email iz forme (loginData)
        registration_completed: true, // Nema u data.member, pretpostavka
        membership_type: MembershipTypeEnum.Regular,   // Nema u data.member, zadana vrijednost
        life_status: "employed/unemployed", // Nema u data.member, zadana vrijednost
        tshirt_size: "M",             // Nema u data.member, zadana vrijednost
        shell_jacket_size: "M",       // Nema u data.member, zadana vrijednost
        membership_details: {
          card_stamp_issued: false,
          card_number: ""
        },
        // Dodaj ostala opcionalna polja iz Member sučelja sa zadanim vrijednostima
        profile_image_path: undefined,
        profile_image_updated_at: undefined,
        last_login: undefined,
        status: 'registered',
        total_hours: 0,
        activity_status: 'passive',
        membership_history: undefined,
      };
      // Proslijeđujemo i refresh token ako je dostupan (u razvojnom okruženju)
      authLogin(member, data.token, data.refreshToken);
      
      // Provjeri postoji li putanja za preusmjeravanje
      if (redirectPath) {
        console.log(`Preusmjeravam na spremljenu putanju: ${redirectPath}`);
        navigate(redirectPath);
      } else {
        // Dohvati spremljenu putanju iz sessionStorage ako postoji
        const savedPath = sessionStorage.getItem('lastPath');
        if (savedPath) {
          console.log(`Preusmjeravam na spremljenu putanju iz sessionStorage: ${savedPath}`);
          // Očisti spremljenu putanju
          sessionStorage.removeItem('lastPath');
          navigate(savedPath);
        } else {
          // Ako nema spremljene putanje, preusmjeri prema ulozi
          console.log('Nema spremljene putanje, preusmjeravam prema ulozi');
          // Preusmjeri člana na odgovarajući dashboard prema ulozi (role)
          switch(member.role) {
            case 'member_administrator':
              navigate("/admin/dashboard");
              break;
            case 'member_superuser':
              navigate("/superuser/dashboard");
              break;
            case 'member':
              navigate("/member/dashboard");
              break;
            default:
              navigate("/profile");
          }
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      // Ažuriran prikaz greške
      if (axios.isAxiosError(error) && error.response?.data) {
         // Eksplicitno definiramo tip za error.response.data
         const errorData = error.response.data as { message: string };
         setError(errorData.message); // Prikaz poruke s backenda
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Login failed due to an unexpected error.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkillsChange = (update: { skills: MemberSkill[]; other_skills: string }) => {
    setRegisterData(prev => ({
      ...prev,
      skills: update.skills,
      other_skills: update.other_skills,
    }));
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Registration form submitted');
    
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
        ...registerData, // Sadrži sva polja iz forme, uključujući skills
        registration_completed: false, // Eksplicitno postavljamo
        membership_type: MembershipTypeEnum.Regular, // Eksplicitno postavljamo
        role: "member", // Eksplicitno postavljamo
        membership_details: { // Eksplicitno postavljamo
          card_stamp_issued: false,
          card_number: ""
        }
      };

      console.log('Sending registration data to API:', memberData);
      const response = await register(memberData);
      console.log('Registration API response:', response);
      
      if (response.message) {
        console.log('Setting success message:', response.message);
        
        // Postavljamo poruku u formi za registraciju
        setMessage({ type: "success", content: response.message });
        
        // Postavljamo poruku koja će biti vidljiva na početnom ekranu
        setLoginPageMessage({ type: "success", content: response.message });
        
        // Zatvaramo formu za registraciju nakon kratke pauze da korisnik može vidjeti poruku
        setTimeout(() => {
          setIsRegistering(false);
        }, 2000);
      }
    } catch (error) {
      // Za grešku 429 (Too Many Requests) ne prikazujemo nikakvu poruku
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        // Ne radimo ništa - ne prikazujemo poruku i ne logiramo grešku
        return;
      }
      
      // Za ostale greške možemo logirati i prikazati generičku poruku
      if (error instanceof Error) {
        setMessage({
          type: "error",
          content: "Došlo je do greške prilikom registracije. Pokušajte ponovno kasnije.",
        });
      } else {
        setMessage({
          type: "error",
          content: "Došlo je do greške prilikom registracije. Pokušajte ponovno kasnije.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        <div className="p-6 bg-blue-600 text-white text-center relative">
          {/* Language Toggle in top right corner */}
          <div className="absolute top-4 right-4">
            <LanguageToggle />
          </div>
          <div className="mb-4">
            {/* Logo */}
            <img 
              src={logoImage} 
              alt="PD Promina Logo" 
              className="w-28 h-28 mx-auto rounded-full object-cover"
            />
          </div>
          <h2 className="text-2xl font-bold">{t('login.clubTitle', 'Planinarsko društvo "Promina" Drniš')}</h2>
        </div>

        <div className="p-6 bg-blue-600 text-white text-center">
          {/* ... existing header content ... */}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700">
              {t('login.importantDocuments', 'Važni dokumenti')}
            </h3>
            <button
              onClick={() => setShowDocuments(!showDocuments)}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              <FileText className="w-4 h-4 mr-1" />
              {showDocuments ? t('login.hideDocuments', 'Sakrij Dokumente') : t('login.showDocuments', 'Prikaži Dokumente')}
            </button>
          </div>

          {showDocuments && (
            <div className="mt-3 space-y-2">
              <a
                href="https://www.pd-promina.hr/dokumenti/eticki-kodeks-pd-promina"
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <ChevronRight className="w-4 h-4 mr-1" />
                Etički kodeks PD Promina
              </a>
              <a
                href="https://pd-promina.hr/dokumenti/pravo-na-pristup-informacijama"
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <ChevronRight className="w-4 h-4 mr-1" />
                Politika zaštite osobnih podataka
              </a>
              <a
                href="https://pd-promina.hr/dokumenti/poslovnici-i-pravilnici/pravilnik-o-clanstvu"
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <ChevronRight className="w-4 h-4 mr-1" />
                Pravilnik o članstvu
              </a>
            </div>
          )}
        </div>

        <div className="p-6">
          {isRegistering ? (
            <form onSubmit={(e) => { void handleRegister(e); }} className="space-y-4">
              <h2 className="text-2xl font-bold mb-4">{t('login.registerTitle', 'Postani novi član')}</h2>
              
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
                    {t('login.acceptTerms', 'Pročitah i prihvaćam Etički kodeks, Pravila o zaštiti podataka i Pravilnik o članstvu')}
                  </span>
                </label>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('login.firstName', 'Ime')}
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
                  {t('login.lastName', 'Prezime')}
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
                  {t('login.gender', 'Spol')}
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
                  // Uklonjena 'block' klasa
                  className="mt-2 p-2 w-full border rounded bg-blue-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
                  required
                >
                  <option value="male">{t('options.gender.male')}</option>
                  <option value="female">{t('options.gender.female')}</option>
                </select>
              </div>

              {/* Date of birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('login.birthDate', 'Datum rođenja')}
                </label>
                <input
                  type="date"
                  required
                  className="mt-2 p-2 w-full border rounded bg-gray-50"
                  value={registerData.date_of_birth ? formatInputDate(registerData.date_of_birth) : ""}
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
                  {t('login.address', 'Ulica i broj')}
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
                  {t('login.city', 'Grad/mjesto')}
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
                  {t('login.oib', 'OIB')}
                </label>
                <input
                  type="text"
                  required
                  pattern="[0-9]{11}"
                  title={t('login.oibError', 'OIB must be exactly 11 digits')}
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
                  {t('login.cellPhone', 'Mobitel')}
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
                  {t('login.email', 'E-mail')}
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
                  {t('login.lifeStatus', 'Životni status')}
                </label>
                <select
                  required
                  // Uklonjena 'block' klasa
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
                  <option value="">{t('login.lifeStatusPlaceholder', 'Odaberite status')}</option>
                  <option value="employed/unemployed">{t('options.lifeStatus.employed')}</option>
                  <option value="child/pupil/student">{t('options.lifeStatus.child')}</option>
                  <option value="pensioner">{t('options.lifeStatus.pensioner')}</option>
                </select>
              </div>

              {/* T-shirt */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('login.tShirt', 'Majica')}
                </label>
                <select
                  required
                  // Uklonjena 'block' klasa
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
                  <option value="">{t('login.tShirtPlaceholder', 'Odaberite veličinu')}</option>
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
                  {t('login.shellJacket', 'Flis jakna')}
                </label>
                <select
                  required
                  // Uklonjena 'block' klasa
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
                  <option value="">{t('login.shellJacketPlaceholder', 'Odaberite veličinu')}</option>
                  {sizeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

                            {/* Skills Selector */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowSkills(!showSkills)}
                  className="mt-1 w-full flex justify-between items-center px-3 py-2 text-left border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <span>{t('skills.title')}</span>
                  {showSkills ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {showSkills && (
                  <div className="mt-2">
                    <SkillsSelector
                      value={registerData.skills ?? []}
                      otherSkills={registerData.other_skills ?? ''}
                      onChange={(skills, other_skills) => {
                        handleSkillsChange({ skills, other_skills });
                      }}
                      isEditing={true}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('skills.description', 'Odaberite vještine koje član posjeduje.')}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex space-x-4 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setError("");
                  }}
                  className="w-1/2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('login.backButton', 'Natrag')}
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
                    <span>{t('login.registering', 'Registering...')}</span>
                  ) : (
                    <span className="flex items-center">
                      <LogIn className="w-5 h-5 mr-2" />
                      {t('login.registerButton', 'Upiši se')}
                    </span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <>
              {step === 0 && (
                <div className="space-y-4">
                  {/* Prikaz poruke o uspješnoj registraciji na početnoj stranici */}
                  {loginPageMessage && (
                    <div className={`p-3 rounded-md mb-4 ${loginPageMessage.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {loginPageMessage.content}
                    </div>
                  )}
                  
                  <button
                    onClick={() => setStep(1)}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {t('login.loginButton', 'Prijavi se')}
                  </button>
                  <button
                    onClick={() => {
                      setIsRegistering(true);
                      setLoginPageMessage(null); // Brišemo poruku kad korisnik ponovno otvori formu za registraciju
                    }}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {t('login.registerLink', 'Hoćeš postati član Planinarskog društva Promina Drniš? Upiši se')}
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
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      {t('login.emailLabel', 'Email adresa')}
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      required
                      placeholder={t('login.emailPlaceholder', 'Unesite vašu email adresu')}
                      className="mt-1 p-2 w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      value={loginData.email} // Pristup email svojstvu - sada ispravno
                      autoComplete="email"
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setStep(0)}
                      className="w-1/2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {t('login.backButton', 'Natrag')}
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {t('login.nextButton', 'Dalje')}
                    </button>
                  </div>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={(e) => { void handleLogin(e); }} className="space-y-4">
                  {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
                      <p className="font-bold">{t('login.errorTitle', 'Prijava neuspješna')}</p>
                      <p>{error}</p>
                    </div>
                  )}
                  <div>
                    <div className="mt-1 relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        required
                        placeholder={t('login.passwordPlaceholder', 'Unesite vašu lozinku')}
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
                      {t('login.backButton', 'Natrag')}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-1/2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        loading && "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      {loading ? (
                        <span>{t('login.loggingIn', 'Prijava...')}</span>
                      ) : (
                        <span className="flex items-center">
                          <LogIn className="w-5 h-5 mr-2" />
                          {t('login.loginButton', 'Prijavi se')}
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
                {t('login.alreadyMember', 'Već jesi član? Prijavi se')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;