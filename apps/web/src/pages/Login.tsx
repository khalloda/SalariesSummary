import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../hooks/useAuth';
import { LoginFormSchema, type LoginFormValues } from '../validation/auth';
import LoadingButton from '../components/LoadingButton';
import FieldCheckmark from '../components/FieldCheckmark';

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
    watch,
    formState: { errors, isSubmitting, touchedFields },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginFormSchema),
    mode: 'onBlur',
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const username = watch('username');
  const password = watch('password');

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
            <div className="relative">
              <input
                type="text"
                autoComplete="username"
                aria-invalid={errors.username ? 'true' : 'false'}
                aria-describedby={errors.username ? 'username-error' : undefined}
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 text-sm pr-10 ${
                  errors.username
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : touchedFields.username && !errors.username && username
                    ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                    : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                }`}
                {...register('username')}
              />
              <FieldCheckmark
                show={!!(touchedFields.username && !errors.username && username)}
              />
            </div>
            {errors.username && (
              <p id="username-error" className="mt-1 text-xs text-red-600" role="alert">
                {errors.username.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('password') || 'Password'}
            </label>
            <div className="relative">
              <input
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 text-sm pr-10 ${
                  errors.password
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : touchedFields.password && !errors.password && password
                    ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                    : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                }`}
                {...register('password')}
              />
              <FieldCheckmark
                show={!!(touchedFields.password && !errors.password && password)}
              />
            </div>
            {errors.password && (
              <p id="password-error" className="mt-1 text-xs text-red-600" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 whitespace-pre-line">
              {error}
            </div>
          )}

          <LoadingButton
            type="submit"
            loading={isSubmitting}
            className="w-full"
          >
            {t('login') || 'Login'}
          </LoadingButton>
        </form>

        <p className="mt-4 text-xs text-gray-500 text-center">
          {t('loginHint') ||
            'Use your assigned username and password. Contact the system administrator if you cannot log in.'}
        </p>
      </div>
    </div>
  );
}


