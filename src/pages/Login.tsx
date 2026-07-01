import React, { useEffect, useState } from 'react';
import { consumeLogoutMessage } from '../services/authSession';
import { Navigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isBlogUser, blogUserDefaultPath } from '../utils/roles';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '../components/ui';
import type { LoginCredentials } from '../types';
import { getErrorMessage, logErrorForDev } from '../utils/errors';
import { ErrorAlert } from '../components/errors';

const Login: React.FC = () => {
  const { login, isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const [formData, setFormData] = useState<LoginCredentials>({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const msg = consumeLogoutMessage();
    if (msg) setError(msg);
  }, []);

  const from = location.state?.from?.pathname;
  const defaultHome = isBlogUser(user) ? blogUserDefaultPath() : '/';

  if (isAuthenticated) {
    const target = from && !isBlogUser(user) ? from : defaultHome;
    if (isBlogUser(user) && from && !from.startsWith('/blog')) {
      return <Navigate to={blogUserDefaultPath()} replace />;
    }
    return <Navigate to={isBlogUser(user) ? blogUserDefaultPath() : target} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      console.log('Attempting login with:', { username: formData.username });
      await login(formData);
      console.log('Login successful');
    } catch (err: unknown) {
      logErrorForDev('Login', err);
      setError(getErrorMessage(err, 'Login failed. Please check your credentials and try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded bg-primary-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">PC</span>
          </div>
          <h2 className="mt-6 text-xl font-extrabold text-gray-900">
            Sign in to PestControl99
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your credentials to access the CRM
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error ? <ErrorAlert message={error} title="Sign in failed" /> : null}

              <Input
                label="Mobile Number"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your mobile number"
              />

              <div className="relative">
                <Input
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>


      </div>
    </div>
  );
};

export default Login;