import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { useAuth } from '../hooks/useAuth';
import LoadingButton from '../components/LoadingButton';
import ConfirmDialog from '../components/ConfirmDialog';
import FieldCheckmark from '../components/FieldCheckmark';
import { useFormDraft } from '../hooks/useFormDraft';
import { useKeyboardShortcuts, createSaveShortcut, createEscapeShortcut } from '../hooks/useKeyboardShortcuts';
import { getErrorId, focusFirstInvalidField, getFirstInvalidField } from '../utils/formAccessibility';
import {
  UserCreateFormSchema,
  UserUpdateFormSchema,
  type UserFormCreateValues,
  type UserFormUpdateValues,
} from '../validation/users';

interface User {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  systemId: string | null;
  isActive: boolean;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  userCount: number;
}

export default function UserManagement() {
  const { t, i18n } = useTranslation();
  const { user: currentUser } = useAuth();
  const isRTL = i18n.language === 'ar';
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; userId: string; username: string }>({
    isOpen: false,
    userId: '',
    username: '',
  });
  const [deleting, setDeleting] = useState(false);

  // Custom resolver that dynamically selects schema based on editingUser
  const customResolver = async (data: any, context: any, options: any) => {
    const schema = editingUser ? UserUpdateFormSchema : UserCreateFormSchema;
    const zodResolverInstance = zodResolver(schema);
    return zodResolverInstance(data, context, options);
  };

  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isSubmitting, touchedFields },
    reset,
    watch,
    setValue,
  } = useForm<UserFormCreateValues | UserFormUpdateValues>({
    resolver: customResolver,
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      username: '',
      fullName: '',
      email: '',
      systemId: '',
      isActive: true,
      roles: [],
      password: '',
      confirmPassword: '',
    },
  });

  const watchedRoles = watch('roles') || [];
  const formValues = watch();
  const watchedUsername = watch('username');
  const watchedFullName = watch('fullName');
  const watchedEmail = watch('email');
  const watchedPassword = watch('password');
  const watchedConfirmPassword = watch('confirmPassword');

  // Auto-save form draft
  const { loadDraft, clearDraft } = useFormDraft(
    'user-form',
    editingUser?.id || null,
    formValues,
    showForm // Only save when form is open
  );

  // Keyboard shortcuts
  useKeyboardShortcuts([
    createSaveShortcut(() => {
      if (showForm && !saving && !isSubmitting) {
        handleFormSubmit(onSubmit)();
      }
    }, showForm && !saving && !isSubmitting),
    createEscapeShortcut(() => {
      if (showForm && !saving) {
        setShowForm(false);
        setServerError(null);
        reset();
        clearDraft();
      }
    }, showForm && !saving),
  ]);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  // Load draft when form opens
  useEffect(() => {
    if (showForm && !editingUser) {
      const draft = loadDraft();
      if (draft) {
        Object.keys(draft).forEach((key) => {
          setValue(key as any, draft[key]);
        });
        toast.success('Draft restored', { duration: 2000 });
      }
    }
  }, [showForm, editingUser]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/users`, { withCredentials: true });
      setUsers(response.data.users);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(error.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/roles`, { withCredentials: true });
      setRoles(response.data.roles);
    } catch (error: any) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setServerError(null);
    reset({
      username: '',
      email: '',
      fullName: '',
      systemId: '',
      password: '',
      confirmPassword: '',
      isActive: true,
      roles: [],
    });
    setShowForm(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setServerError(null);
    reset({
      username: user.username,
      email: user.email || '',
      fullName: user.fullName,
      systemId: user.systemId || '',
      password: '',
      confirmPassword: '',
      isActive: user.isActive,
      roles: [...user.roles],
    });
    setShowForm(true);
  };

  const handleDeleteClick = (id: string, username: string) => {
    setDeleteConfirm({ isOpen: true, userId: id, username });
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API_BASE_URL}/users/${deleteConfirm.userId}`, { withCredentials: true });
      toast.success(t('userDeletedSuccessfully') || 'User deleted successfully');
      setDeleteConfirm({ isOpen: false, userId: '', username: '' });
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, userId: '', username: '' });
  };

  const handleToggleActive = async (user: User) => {
    const newActiveState = !user.isActive;
    
    // Optimistic update
    setUsers(prevUsers =>
      prevUsers.map(u =>
        u.id === user.id ? { ...u, isActive: newActiveState } : u
      )
    );

    try {
      await axios.put(
        `${API_BASE_URL}/users/${user.id}`,
        { ...user, isActive: newActiveState },
        { withCredentials: true }
      );
      toast.success(
        newActiveState
          ? t('userActivatedSuccessfully') || 'User activated successfully'
          : t('userDeactivatedSuccessfully') || 'User deactivated successfully'
      );
    } catch (error: any) {
      // Rollback on error
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === user.id ? { ...u, isActive: user.isActive } : u
        )
      );
      toast.error(error.response?.data?.error || 'Failed to update user status');
    }
  };

  const onSubmit = async (data: UserFormCreateValues | UserFormUpdateValues) => {
    setServerError(null);
    setSaving(true);

    try {
      const submitData: any = {
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        systemId: data.systemId,
        isActive: data.isActive,
        roles: data.roles,
      };

      // Only include password if it's provided
      if (data.password && data.password.trim() !== '') {
        submitData.password = data.password;
      }

      if (editingUser) {
        await axios.put(`${API_BASE_URL}/users/${editingUser.id}`, submitData, { withCredentials: true });
        toast.success(t('userUpdatedSuccessfully') || 'User updated successfully');
      } else {
        await axios.post(`${API_BASE_URL}/users`, submitData, { withCredentials: true });
        toast.success(t('userCreatedSuccessfully') || 'User created successfully');
      }

      setShowForm(false);
      clearDraft(); // Clear draft on successful save
      fetchUsers();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to save user';
      setServerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (roleName: string) => {
    const currentRoles = watchedRoles;
    if (currentRoles.includes(roleName)) {
      setValue('roles', currentRoles.filter((r) => r !== roleName), { shouldValidate: true });
    } else {
      setValue('roles', [...currentRoles, roleName], { shouldValidate: true });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">{t('loading') || 'Loading...'}</p>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto ${isRTL ? 'text-right' : 'text-left'}`}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('userManagement') || 'User Management'}</h1>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {t('newUser') || '+ New User'}
        </button>
      </div>


      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('username') || 'Username'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('fullName') || 'Full Name'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('email') || 'Email'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('roles') || 'Roles'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('status') || 'Status'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('actions') || 'Actions'}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {user.username}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.fullName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.email || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <span
                        key={role}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleActive(user)}
                    disabled={user.id === currentUser?.id}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      user.isActive
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    } ${user.id === currentUser?.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    title={user.id === currentUser?.id ? 'Cannot deactivate your own account' : 'Click to toggle status'}
                  >
                    {user.isActive ? (t('active') || 'Active') : (t('inactive') || 'Inactive')}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(user)}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    {t('edit') || 'Edit'}
                  </button>
                  {user.id !== currentUser?.id && user.username !== 'khelmy' && (
                    <button
                      onClick={() => handleDeleteClick(user.id, user.username)}
                      disabled={deleting}
                      className="text-red-600 hover:text-red-900"
                    >
                      {t('delete') || 'Delete'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingUser ? (t('editUser') || 'Edit User') : (t('createUser') || 'Create User')}
            </h2>
            <form id="user-form" onSubmit={handleFormSubmit(onSubmit, handleFormError)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('username') || 'Username'} *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    {...register('username')}
                    aria-invalid={errors.username ? 'true' : 'false'}
                    aria-describedby={errors.username ? getErrorId('username') : undefined}
                    className={`w-full px-3 py-2 border rounded-md pr-10 ${
                      errors.username
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : touchedFields.username && !errors.username && watchedUsername
                        ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    disabled={!!editingUser}
                  />
                  <FieldCheckmark
                    show={!!(touchedFields.username && !errors.username && watchedUsername)}
                  />
                </div>
                {errors.username && (
                  <p id={getErrorId('username')} className="mt-1 text-xs text-red-600" role="alert">
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fullName') || 'Full Name'} *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    {...register('fullName')}
                    aria-invalid={errors.fullName ? 'true' : 'false'}
                    aria-describedby={errors.fullName ? getErrorId('fullName') : undefined}
                    className={`w-full px-3 py-2 border rounded-md pr-10 ${
                      errors.fullName
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : touchedFields.fullName && !errors.fullName && watchedFullName
                        ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                  <FieldCheckmark
                    show={!!(touchedFields.fullName && !errors.fullName && watchedFullName)}
                  />
                </div>
                {errors.fullName && (
                  <p id={getErrorId('fullName')} className="mt-1 text-xs text-red-600" role="alert">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('email') || 'Email'}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    {...register('email')}
                    aria-invalid={errors.email ? 'true' : 'false'}
                    aria-describedby={errors.email ? getErrorId('email') : undefined}
                    className={`w-full px-3 py-2 border rounded-md pr-10 ${
                      errors.email
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : touchedFields.email && !errors.email && watchedEmail
                        ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                  <FieldCheckmark
                    show={!!(touchedFields.email && !errors.email && watchedEmail)}
                  />
                </div>
                {errors.email && (
                  <p id={getErrorId('email')} className="mt-1 text-xs text-red-600" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('systemId') || 'System ID'}
                </label>
                <input
                  type="text"
                  {...register('systemId')}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.systemId
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {errors.systemId && (
                  <p className="mt-1 text-xs text-red-600">{errors.systemId.message}</p>
                )}
              </div>

              {(!editingUser || watch('password')) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('password') || 'Password'} {editingUser ? '' : '*'}
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        {...register('password')}
                        aria-invalid={errors.password ? 'true' : 'false'}
                        aria-describedby={errors.password ? getErrorId('password') : undefined}
                        className={`w-full px-3 py-2 border rounded-md pr-10 ${
                          errors.password
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : touchedFields.password && !errors.password && watchedPassword
                            ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                      />
                      <FieldCheckmark
                        show={!!(touchedFields.password && !errors.password && watchedPassword)}
                      />
                    </div>
                    {errors.password && (
                      <p id={getErrorId('password')} className="mt-1 text-xs text-red-600" role="alert">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('confirmPassword') || 'Confirm Password'} {editingUser ? '' : '*'}
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        {...register('confirmPassword')}
                        aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                        aria-describedby={errors.confirmPassword ? getErrorId('confirmPassword') : undefined}
                        className={`w-full px-3 py-2 border rounded-md pr-10 ${
                          errors.confirmPassword
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : touchedFields.confirmPassword && !errors.confirmPassword && watchedConfirmPassword
                            ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                      />
                      <FieldCheckmark
                        show={!!(touchedFields.confirmPassword && !errors.confirmPassword && watchedConfirmPassword)}
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p id={getErrorId('confirmPassword')} className="mt-1 text-xs text-red-600" role="alert">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('roles') || 'Roles'}
                </label>
                <div className="space-y-2">
                  {roles.map((role) => (
                    <label key={role.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={watchedRoles.includes(role.name)}
                        onChange={() => toggleRole(role.name)}
                        className="mr-2"
                      />
                      <span className="text-sm">
                        {role.name} {role.description && `- ${role.description}`}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.roles && (
                  <p className="mt-1 text-xs text-red-600">{errors.roles.message}</p>
                )}
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('isActive')}
                    className="mr-2"
                  />
                  <span className="text-sm">{t('active') || 'Active'}</span>
                </label>
              </div>

              {serverError && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {serverError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setServerError(null);
                    reset();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <LoadingButton
                  type="submit"
                  loading={isSubmitting || saving}
                >
                  {t('save') || 'Save'}
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={t('deleteUser') || 'Delete User'}
        message={t('deleteUserConfirm', { username: deleteConfirm.username }) || `Are you sure you want to delete user "${deleteConfirm.username}"?`}
        confirmText={t('delete') || 'Delete'}
        cancelText={t('cancel') || 'Cancel'}
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}

