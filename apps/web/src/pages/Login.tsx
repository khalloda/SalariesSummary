import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../hooks/useAuth';
import { LoginFormSchema, type LoginFormValues } from '../validation/auth';

export default function Login() {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location.state?.from?.pathname || '/';

  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const isRTL = i18n.language === 'ar';

  const onSubmit = async (values: LoginFormValues) => {
    setError(null);
    try {
      await login(values.username.trim(), values.password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-md rounded-lg p-8">
        <h1 className="text-2xl font-semibold mb-6 text-center">
          {t('title') || 'Salaries Summary'}
        </h1>
        <h2 className="text-lg font-medium mb-4 text-center">
          {t('login') || 'Login'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className={`space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('username') || 'Username'}
            </label>
            <input
              type="text"
              autoComplete="username"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-sm"
              {...register('username')}
            />
            {errors.username && (
              <p className="mt-1 text-xs text-red-600">
                {errors.username.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('password') || 'Password'}
            </label>
            <input
              type="password"
              autoComplete="current-password"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-sm"
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 whitespace-pre-line">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-60"
          >
            {isSubmitting ? (t('loading') || 'Loading...') : (t('login') || 'Login')}
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-500 text-center">
          {t('loginHint') ||
            'Use your assigned username and password. Contact the system administrator if you cannot log in.'}
        </p>
      </div>
    </div>
  );
}


