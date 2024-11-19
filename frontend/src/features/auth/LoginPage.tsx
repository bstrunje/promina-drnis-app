import { register } from '../../utils/api';
import { FormEvent, useState } from 'react';
import { Eye, EyeOff, LogIn, FileText, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription } from '@components/ui/alert';
import { useAuth } from '../../context/AuthContext';
import { login, LoginResponse } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import ErrorMessage from '../../../components/ErrorMessage';

const LoginPage = () => {
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    console.log('Login attempt with username:', loginData.username);
    
    try {
        console.log('Calling login function');
        const data: LoginResponse = await login(loginData.username, loginData.password);
        console.log('Login response received:', data);
        authLogin(data.user, data.token);
        console.log('User role:', data.user.role);
        
        // Redirect based on user role
        switch (data.user.role) {
          case 'admin':
            console.log('Redirecting to /admin');
            navigate('/admin');
            console.log('Navigation function called for admin');
            break;
          case 'member':
            console.log('Redirecting to /dashboard');
            navigate('/dashboard');
            console.log('Navigation function called for member');
            break;
          case 'superuser':
            console.log('Redirecting to /super-user');
            navigate('/super-user');
            console.log('Navigation function called for superuser');
            break;
          default:
            console.log('Redirecting to /');
            navigate('/');
            console.log('Navigation function called for default');
            break;
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to login. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setError('You must accept the terms and conditions to register');
      return;
    }
    
    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
  
    setError('');
    setLoading(true);
    
    try {
      const data = await register(registerData);
      authLogin(data.user, data.token);
      // Redirect based on user role
      switch (data.user.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'member':
          navigate('/member');
          break;
        case 'superuser':
          navigate('/super-user');
          break;
        default:
          navigate('/');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        <div className="p-6 bg-blue-600 text-white">
          <h2 className="text-center text-3xl font-bold">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="mt-2 text-center text-blue-100">
            {isRegistering ? 'Join our mountaineering community' : 'Sign in to your account'}
          </p>
        </div>

        {error && <ErrorMessage message={error} />}

        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700">Important Documents</h3>
            <button
              onClick={() => setShowDocuments(!showDocuments)}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              <FileText className="w-4 h-4 mr-1" />
              {showDocuments ? 'Hide' : 'Show'} Documents
            </button>
          </div>
          
          {showDocuments && (
            <div className="mt-3 space-y-2">
              <a href="#" className="block text-sm text-blue-600 hover:text-blue-800 flex items-center">
                <ChevronRight className="w-4 h-4 mr-1" />
                Terms and Conditions
              </a>
              <a href="#" className="block text-sm text-blue-600 hover:text-blue-800 flex items-center">
                <ChevronRight className="w-4 h-4 mr-1" />
                Privacy Policy
              </a>
              <a href="#" className="block text-sm text-blue-600 hover:text-blue-800 flex items-center">
                <ChevronRight className="w-4 h-4 mr-1" />
                Membership Rules
              </a>
            </div>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mx-6 mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="p-6">
          {isRegistering ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    I have read and accept the terms and conditions, privacy policy, and membership rules
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={registerData.firstName}
                    onChange={(e) => setRegisterData({...registerData, firstName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={registerData.lastName}
                    onChange={(e) => setRegisterData({...registerData, lastName: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={registerData.username}
                  onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-1 relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                <input
                  type="password"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  loading && 'opacity-50 cursor-not-allowed'
             }`}
          >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
               </span>
             ) : (
               <span className="flex items-center">
                 <LogIn className="w-5 h-5 mr-2" />
                 Sign In
               </span>
             )}
          </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={loginData.username}
                  onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-1 relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  loading && 'opacity-50 cursor-not-allowed'
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
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Register'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;